import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken, UserPayload } from '../services/auth.js';
import { db } from '../db/database.js';
import { translateText } from '../services/translator.js';

interface ClientConnection {
  ws: WebSocket;
  user: UserPayload;
  type: 'OPERATOR_UI' | 'OWNER_UI' | 'EXTENSION';
}

const clients = new Map<WebSocket, ClientConnection>();

export function setupWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    // Авторизация по query param ?token=...
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const clientType = (url.searchParams.get('type') || 'OPERATOR_UI') as 'OPERATOR_UI' | 'OWNER_UI' | 'EXTENSION';

    if (!token) {
      ws.close(4001, 'Отсутствует токен авторизации');
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      ws.close(4002, 'Недействительный токен');
      return;
    }

    clients.set(ws, { ws, user, type: clientType });
    console.log(`🔌 WS подключен: ${user.username} [${clientType}]`);

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleClientMessage(ws, msg);
      } catch (e) {
        console.error('Ошибка обработки WS сообщения:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`❌ WS отключен: ${user.username}`);
    });
  });
}

async function handleClientMessage(senderWs: WebSocket, msg: { event: string; payload: any }) {
  const sender = clients.get(senderWs);
  if (!sender) return;

  switch (msg.event) {
    // 1. Входящее сообщение из CharmDate (от расширения в браузерном окне)
    case 'CD_INCOMING_MESSAGE': {
      const { ladyId, manId, manName, text, manAge, manCountry } = msg.payload;

      // Автоперевод сообщения мужчины с английского на русский
      const translatedText = await translateText(text, 'ru', 'en');

      let chatId: number = 0;

      try {
        db.exec('BEGIN TRANSACTION');
        
        let chat = db.prepare('SELECT id FROM chats WHERE lady_id = ? AND man_id = ? AND status = ?')
          .get(ladyId, manId, 'active') as { id: number } | undefined;

        if (!chat) {
          const createChat = db.prepare(`
            INSERT INTO chats (lady_id, man_id, man_name, man_age, man_country, status)
            VALUES (?, ?, ?, ?, ?, 'active')
          `);
          const result = createChat.run(ladyId, manId, manName || `Gentleman #${manId}`, manAge || 45, manCountry || 'USA');
          chat = { id: Number(result.lastInsertRowid) };

          // Добавляем или обновляем карточку мужчины в CRM
          db.prepare(`
            INSERT INTO fans_crm (lady_id, man_id, man_name, last_chat_date, eligible_for_first_emf)
            VALUES (?, ?, ?, datetime('now'), 1)
            ON CONFLICT(lady_id, man_id) DO UPDATE SET
              last_chat_date = datetime('now'),
              eligible_for_first_emf = 1
          `).run(ladyId, manId, manName || `Gentleman #${manId}`);
        }

        // Сохраняем сообщение в БД
        db.prepare(`
          INSERT INTO messages (chat_id, lady_id, man_id, sender_type, text, translated_text)
          VALUES (?, ?, ?, 'man', ?, ?)
        `).run(chat.id, ladyId, manId, text, translatedText);

        // Обновляем время последней активности чата
        db.prepare("UPDATE chats SET last_activity = datetime('now') WHERE id = ?").run(chat.id);
        
        chatId = chat.id;
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        console.error('Ошибка при сохранении входящего сообщения в БД:', err);
        return;
      }

      // Рассылаем назначенному оператору и овнеру
      broadcastToAssignedOperator(ladyId, {
        event: 'INCOMING_MESSAGE',
        payload: {
          chatId,
          ladyId,
          manId,
          manName: manName || `Gentleman #${manId}`,
          text,
          translatedText,
          senderType: 'man',
          sentAt: new Date().toISOString()
        }
      });
      break;
    }

    // 2. Отправка сообщения оператором (из панели Мультичата)
    case 'OPERATOR_SEND_MESSAGE': {
      const { chatId, ladyId, manId, text } = msg.payload;

      // Автоперевод на английский язык для отправки на сайт CharmDate
      const translatedText = await translateText(text, 'en', 'ru');

      // Сохраняем сообщение
      db.prepare(`
        INSERT INTO messages (chat_id, lady_id, man_id, sender_type, text, translated_text)
        VALUES (?, ?, ?, 'lady', ?, ?)
      `).run(chatId, ladyId, manId, text, translatedText);

      // Отправляем в расширение, которое сидит во вкладке CharmDate, чтобы оно вставило текст в поле чата
      broadcastToExtension(ladyId, {
        event: 'EXECUTE_SEND_MESSAGE',
        payload: {
          ladyId,
          manId,
          textToSend: translatedText
        }
      });

      if (sender) {
        db.prepare(`
          INSERT INTO credit_logs (operator_id, lady_id, man_id, action_type, credits)
          VALUES (?, ?, ?, 'chat_message', 0.1)
        `).run(sender.user.id, ladyId, manId);

        db.prepare(`
          INSERT INTO daily_stats (date, lady_id, operator_id, estimated_credits)
          VALUES (date('now'), ?, ?, 0.1)
          ON CONFLICT(date, lady_id, operator_id) DO UPDATE SET
            estimated_credits = estimated_credits + 0.1
        `).run(ladyId, sender.user.id);
      }

      // Подтверждаем оператору
      senderWs.send(JSON.stringify({
        event: 'MESSAGE_SENT_SUCCESS',
        payload: {
          chatId,
          text,
          translatedText,
          senderType: 'lady',
          sentAt: new Date().toISOString()
        }
      }));
      break;
    }

    // 3. Отчёт об отправленном инвайте (от расширения)
    case 'CD_INVITE_LOG': {
      const { ladyId, manId, manName, templateText } = msg.payload;
      db.prepare(`
        INSERT INTO invites_log (lady_id, man_id, man_name, template_text)
        VALUES (?, ?, ?, ?)
      `).run(ladyId, manId, manName || `Man #${manId}`, templateText);

      // Увеличиваем счетчик сегодняшней статистики
      db.prepare(`
        INSERT INTO daily_stats (date, lady_id, operator_id, invites_sent)
        VALUES (date('now'), ?, ?, 1)
        ON CONFLICT(date, lady_id, operator_id) DO UPDATE SET
          invites_sent = invites_sent + 1
      `).run(ladyId, sender.user.id);

      broadcastToAssignedOperator(ladyId, {
        event: 'INVITE_SENT_LOG',
        payload: { ladyId, manId, manName, templateText, time: new Date().toISOString() }
      });
      break;
    }

    // 4. Появление капчи на сайте CharmDate (при запуске рассылки или подтверждении)
    case 'CD_CAPTCHA_REQUEST': {
      const { ladyId, captchaImageBase64, actionType } = msg.payload;
      console.log(`⚠️ Капча для анкеты ${ladyId}, отправляем оператору`);

      broadcastToAssignedOperator(ladyId, {
        event: 'SHOW_CAPTCHA_MODAL',
        payload: { ladyId, captchaImageBase64, actionType }
      });
      break;
    }

    // 5. Оператор ввёл капчу в окне
    case 'OPERATOR_SOLVE_CAPTCHA': {
      const { ladyId, captchaCode, actionType } = msg.payload;
      broadcastToExtension(ladyId, {
        event: 'SUBMIT_CAPTCHA_SOLUTION',
        payload: { ladyId, captchaCode, actionType }
      });
      break;
    }

    // 6. Изменение статуса анкеты (онлайн / офлайн)
    case 'CD_STATUS_UPDATE': {
      const { ladyId, onlineStatus } = msg.payload;
      db.prepare('UPDATE ladies SET online_status = ? WHERE lady_id = ?').run(onlineStatus, ladyId);
      broadcastAll({
        event: 'LADY_STATUS_CHANGED',
        payload: { ladyId, onlineStatus }
      });
      break;
    }
    // 7. Поступление нового входящего письма (EMF)
    case 'CD_INCOMING_MAIL': {
      const { ladyId, manId, manName, mailId, subject, content } = msg.payload;
      try {
        db.prepare(`
          INSERT INTO incoming_mails (lady_id, man_id, man_name, mail_id, subject, content)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(ladyId, manId, manName || `Gentleman #${manId}`, mailId, subject, content);
        
        broadcastToAssignedOperator(ladyId, {
          event: 'INCOMING_MAIL',
          payload: { ladyId, manId, manName, mailId, subject, content }
        });
      } catch (e: any) {
        if (!e.message.includes('UNIQUE')) {
          console.error('Ошибка сохранения письма:', e);
        }
      }
      break;
    }
  }
}

/**
 * Отправляет событие конкретному оператору, на которого назначена анкета, а также овнерам
 */
function broadcastToAssignedOperator(ladyId: string, data: any) {
  // Находим id назначенного оператора
  const assignment = db.prepare(`
    SELECT operator_id FROM operator_assignments
    WHERE lady_id = ? AND is_active = 1
  `).get(ladyId) as { operator_id: number } | undefined;

  const json = JSON.stringify(data);
  for (const client of clients.values()) {
    if (client.type === 'OWNER_UI' || (assignment && client.user.id === assignment.operator_id)) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(json);
      }
    }
  }
}

/**
 * Отправляет команду в расширение Chrome для конкретной анкеты
 */
export function broadcastToExtension(ladyId: string, data: any) {
  const json = JSON.stringify(data);
  for (const client of clients.values()) {
    if (client.type === 'EXTENSION') {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(json);
      }
    }
  }
}

function broadcastAll(data: any) {
  const json = JSON.stringify(data);
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

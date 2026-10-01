import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lady, Chat, Message, Template, FanCRM } from '../types';
import { 
  Send, Sparkles, Languages, MessageSquare, Clock, 
  User, CheckCheck, Play, Pause, FileText, Mail, 
  AlertCircle, ChevronRight, Bookmark, Image as ImageIcon,
  MessageCircle, Inbox, Radio
} from 'lucide-react';
import { PhotoGalleryModal } from './PhotoGalleryModal';
import { OperatorInbox } from './OperatorInbox';
import { OperatorSender } from './OperatorSender';

interface OperatorMultiChatProps {
  onOpenMail: (ladyId: string) => void;
  onOpenInviter: (ladyId: string) => void;
}

export const OperatorMultiChat: React.FC<OperatorMultiChatProps> = ({ onOpenMail, onOpenInviter }) => {
  const { user, token, ws } = useAuth();

  const [activeTab, setActiveTab] = useState<'chats' | 'inbox' | 'sender'>('chats');
  
  const [ladies, setLadies] = useState<Lady[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [liveTranslation, setLiveTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // CRM и шаблоны
  const [fanCRM, setFanCRM] = useState<FanCRM | null>(null);
  const [crmNotes, setCrmNotes] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);

  // Авторассыльщик статус
  const [activeAutoSenders, setActiveAutoSenders] = useState<{ [ladyId: string]: boolean }>({});

  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Первичная загрузка анкет и шаблонов
  const fetchMyLadies = async () => {
    try {
      const res = await fetch('/api/operator/my-ladies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ladies) {
        setLadies(data.ladies);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/operator/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.chats) {
        setChats(data.chats);
        if (!selectedChat && data.chats.length > 0) {
          setSelectedChat(data.chats[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/operator/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMyLadies();
    fetchChats();
    fetchTemplates();

    const interval = setInterval(() => {
      fetchChats();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Загрузка сообщений при выборе чата
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/operator/chats/${selectedChat.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
      } catch (e) {
        console.error(e);
      }
    };

    const fetchFan = async () => {
      try {
        const res = await fetch(`/api/operator/fans/${selectedChat.lady_id}/${selectedChat.man_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.fan) {
          setFanCRM(data.fan);
          setCrmNotes(data.fan.notes || '');
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchMessages();
    fetchFan();
  }, [selectedChat]);

  // 3. Автоскролл сообщений вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. WebSocket слушатель входящих сообщений в реальном времени
  useEffect(() => {
    if (!ws) return;

    const handleWsMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'INCOMING_MESSAGE') {
          const newMsg = data.payload;
          if (selectedChat && selectedChat.lady_id === newMsg.ladyId && selectedChat.man_id === newMsg.manId) {
            setMessages((prev) => [...prev, newMsg]);
          }
          setChats(prev => prev.map(c => {
            if (c.lady_id === newMsg.ladyId && c.man_id === newMsg.manId) {
              return { ...c, last_sender_type: 'man', last_message_time: new Date().toISOString() };
            }
            return c;
          }));
          fetchChats();
        } else if (data.event === 'MESSAGE_SENT_SUCCESS') {
          setMessages((prev) => [...prev, data.payload]);
          setChats(prev => prev.map(c => {
            if (c.id === data.payload.chat_id) {
              return { ...c, last_sender_type: 'lady', last_message_time: new Date().toISOString() };
            }
            return c;
          }));
        }
      } catch (e) {
        console.error('Ошибка парсинга WS:', e);
      }
    };

    ws.addEventListener('message', handleWsMessage);
    return () => {
      ws.removeEventListener('message', handleWsMessage);
    };
  }, [ws, selectedChat]);

  // 5. Перевод текста на лету при наборе оператором
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!inputText.trim()) {
        setLiveTranslation('');
        return;
      }
      setIsTranslating(true);
      try {
        const res = await fetch('/api/operator/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: inputText, targetLang: 'en', sourceLang: 'ru' })
        });
        const data = await res.json();
        setLiveTranslation(data.translated || '');
      } catch (e) {
        console.error(e);
      } finally {
        setIsTranslating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inputText]);

  // 6. Отправка сообщения
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat || !ws) return;

    ws.send(JSON.stringify({
      event: 'OPERATOR_SEND_MESSAGE',
      payload: {
        chatId: selectedChat.id,
        ladyId: selectedChat.lady_id,
        manId: selectedChat.man_id,
        text: inputText
      }
    }));

    setInputText('');
    setLiveTranslation('');
  };

  // 7. Сохранение заметок CRM
  const handleSaveNotes = async () => {
    if (!selectedChat) return;
    await fetch(`/api/operator/fans/${selectedChat.lady_id}/${selectedChat.man_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notes: crmNotes })
    });
  };

  // Включение/выключение рассыльщика инвайтов для анкеты
  const toggleAutoSender = (ladyId: string) => {
    setActiveAutoSenders(prev => ({
      ...prev,
      [ladyId]: !prev[ladyId]
    }));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      
      {/* Вкладки (Tabs) */}
      <div className="bg-slate-900 border-b border-slate-800 p-2 flex space-x-2 shrink-0">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'chats' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Чаты</span>
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'inbox' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Inbox className="w-4 h-4" />
          <span>Входящие</span>
        </button>
        <button
          onClick={() => setActiveTab('sender')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'sender' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Radio className="w-4 h-4" />
          <span>Авто-Сендер</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chats' && (
          <>
            {/* ЛЕВАЯ КОЛОНКА: АНКЕТЫ И ЧАТЫ */}
            <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
              
              {/* Блок 1: Назначенные девушки оператора */}
              <div className="p-3 border-b border-slate-800 bg-slate-900/80">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center justify-between">
            <span>Мои анкеты ({ladies.length})</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Zero-Pass Активен</span>
          </div>

          <div className="space-y-1.5">
            {ladies.map((lady) => {
              const isSending = activeAutoSenders[lady.lady_id];
              return (
                <div 
                  key={lady.lady_id}
                  className="bg-slate-800/60 hover:bg-slate-800 p-2 rounded-lg border border-slate-700/50 flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="relative">
                      <img 
                        src={lady.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover" 
                      />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${lady.online_status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{lady.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{lady.lady_id}</div>
                    </div>
                  </div>

                  {/* Кнопки управления рассылкой и письмами анкеты */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleAutoSender(lady.lady_id)}
                      title={isSending ? "Остановить авто-инвайты" : "Запустить авто-инвайты"}
                      className={`p-1.5 rounded-md text-xs transition ${isSending ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                    >
                      {isSending ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onOpenMail(lady.lady_id)}
                      title="Почта Поклонников (лимит 50) и Первые Письма (EMF)"
                      className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition text-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Блок 2: Входящие активные чаты (Онлайн) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-xs font-semibold uppercase text-slate-400 px-2 py-1.5 flex items-center justify-between">
            <span>Активные диалоги ({chats.length})</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>

          {chats.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-slate-500">
              Входящих сообщений пока нет. Запустите авто-инвайты зеленой кнопкой ▶ рядом с анкетой для поиска мужчин онлайн.
            </div>
          ) : (
            chats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              let waitingTimeStr = '';
              if (chat.last_sender_type === 'man' && chat.last_message_time) {
                const diffMs = Math.max(0, now - new Date(chat.last_message_time).getTime());
                const m = Math.floor(diffMs / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                waitingTimeStr = `⏳ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
              }

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-2.5 rounded-xl cursor-pointer transition border ${isSelected ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-800/40 hover:bg-slate-800/80 border-transparent'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white truncate">{chat.man_name}</span>
                    {waitingTimeStr ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                        {waitingTimeStr}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {chat.man_country}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[170px]">{chat.last_message || 'Новое приглашение в чат'}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-400/90 font-medium flex justify-between">
                    <span>Для: {chat.lady_name} ({chat.lady_id})</span>
                    {!waitingTimeStr && (
                      <span className="text-slate-500">{chat.man_country}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: ОКНО ПЕРЕПИСКИ */}
      <div className="flex-1 flex flex-col bg-slate-950 border-r border-slate-800">
        {selectedChat ? (
          <>
            {/* Шапка чата */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
                  {selectedChat.man_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{selectedChat.man_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{selectedChat.man_country}</span>
                    <span className="text-xs text-slate-400">{selectedChat.man_age} лет</span>
                  </div>
                  <div className="text-xs text-emerald-400">
                    Диалог от имени: <strong className="text-white">{selectedChat.lady_name} ({selectedChat.lady_id})</strong>
                  </div>
                </div>
              </div>

              {/* Таймер активности (5 минут неактивности на CharmDate) */}
              <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Таймер CharmDate: активен</span>
              </div>
            </div>

            {/* Лента сообщений */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  Начните общение с мужчиной. Напишите по-русски — система автоматически отправит идеальный перевод на английском.
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isLady = m.sender_type === 'lady';
                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isLady ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-slate-500 mb-1 px-1">
                        {isLady ? `${selectedChat.lady_name} (Оператор)` : selectedChat.man_name}
                      </div>

                      <div
                        className={`max-w-[70%] p-3.5 rounded-2xl space-y-1.5 shadow-sm ${
                          isLady 
                            ? 'bg-emerald-600 text-white rounded-br-none' 
                            : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                        }`}
                      >
                        {/* Основной текст на английском */}
                        <div className="text-sm leading-relaxed font-medium">
                          {isLady ? (m.translated_text || m.text) : m.text}
                        </div>

                        {/* Перевод на русский язык для оператора */}
                        <div className={`text-xs pt-1.5 border-t ${isLady ? 'border-emerald-500/60 text-emerald-100' : 'border-slate-700 text-slate-400'} flex items-center space-x-1.5`}>
                          <Languages className="w-3.5 h-3.5 shrink-0 opacity-75" />
                          <span className="italic">{isLady ? `[RU]: ${m.text}` : `[RU]: ${m.translated_text || m.text}`}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-600 mt-1 px-1 font-mono">
                        {m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Панель шаблонов быстрых фраз */}
            <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-2 flex items-center space-x-2 overflow-x-auto">
              <span className="text-[11px] uppercase font-semibold text-slate-400 flex items-center space-x-1 shrink-0">
                <Bookmark className="w-3 h-3 text-amber-400" />
                <span>Шаблоны:</span>
              </span>
              {templates.slice(0, 4).map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setInputText(tpl.text)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white shrink-0 border border-slate-700/50 transition truncate max-w-[200px]"
                  title={tpl.text}
                >
                  {tpl.title}
                </button>
              ))}
              <div className="flex-1"></div>
              <button
                type="button"
                onClick={() => setIsPhotoGalleryOpen(true)}
                className="px-3 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 shrink-0 border border-emerald-500/30 transition flex items-center space-x-1"
                title="Открыть галерею фото"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Фото</span>
              </button>
            </div>

            {/* Поле ввода сообщения с автопереводом */}
            <div className="bg-slate-900 border-t border-slate-800 p-4">
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Пишите по-русски... (Enter — перевести и отправить на сайт CharmDate)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none pr-12"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="absolute right-3 bottom-3 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Предпросмотр автоперевода на английский */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Перевод на EN:</span>
                    <span className="text-slate-200 font-medium italic">
                      {isTranslating ? 'Переводим...' : (liveTranslation || '—')}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Shift+Enter — новая строка</span>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-700 stroke-[1.5]" />
            <h3 className="text-lg font-bold text-slate-300">Выберите диалог из списка слева</h3>
            <p className="text-sm max-w-sm">
              Все входящие чаты со всех ваших девушек собираются в левую панель. Вы можете отвечать на любые из них без переключения вкладок.
            </p>
          </div>
        )}
      </div>

      {/* ПРАВАЯ КОЛОНКА: КАРТОЧКА МУЖЧИНЫ (МИНИ-CRM) */}
      {selectedChat && (
        <div className="w-72 bg-slate-900 p-4 border-l border-slate-800 flex flex-col space-y-5">
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-400 mb-3 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Карточка клиента (CRM)</span>
            </h3>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Имя мужчины</div>
                <div className="font-bold text-white text-sm">{selectedChat.man_name}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Возраст</div>
                  <div className="text-slate-200">{selectedChat.man_age} лет</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Страна</div>
                  <div className="text-slate-200">{selectedChat.man_country}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">ID в CharmDate</div>
                <div className="font-mono text-emerald-400 text-xs">#{selectedChat.man_id}</div>
              </div>
            </div>
          </div>

          {/* Заметки оператора о клиенте */}
          <div className="flex-1 flex flex-col space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-400 flex items-center justify-between">
              <span>Заметки о мужчине</span>
              <button 
                onClick={handleSaveNotes}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Сохранить
              </button>
            </label>
            <textarea
              rows={4}
              value={crmNotes}
              onChange={(e) => setCrmNotes(e.target.value)}
              placeholder="Кем работает, о чем общались, семья, увлечения..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none flex-1"
            />
          </div>

          {/* Кнопка First EMF */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Цепочка Первых Писем (EMF)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              После завершения чата мужчине можно отправить до 5 платных писем с интервалом не менее 6 часов.
            </p>
            <button
              onClick={() => onOpenMail(selectedChat.lady_id)}
              className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition border border-emerald-500/30"
            >
              Открыть в Почте
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно галереи фото */}
      {isPhotoGalleryOpen && selectedChat && (
        <PhotoGalleryModal
          ladyId={selectedChat.lady_id}
          onClose={() => setIsPhotoGalleryOpen(false)}
          onInsertLink={(url) => setInputText(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + url)}
        />
      )}
          </>
        )}
        
        {activeTab === 'inbox' && <OperatorInbox ladies={ladies} />}
        {activeTab === 'sender' && <OperatorSender ladies={ladies} />}
      </div>
    </div>
  );
};

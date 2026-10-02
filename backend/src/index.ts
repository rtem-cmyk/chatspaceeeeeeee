import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { CONFIG } from './config.js';
import { initDatabase } from './db/database.js';
import { setupWebSocketServer } from './websocket/server.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { operatorRouter } from './routes/operator.js';
import { mailRouter } from './routes/mail.js';
import { extensionRouter } from './routes/extension.js';
import { photoRouter } from './routes/photos.js';
import { senderRouter } from './routes/sender.js';

const app = express();
app.use(cors());
app.use(express.json());

// Инициализация базы данных и таблиц
console.log('📦 Инициализация базы данных SQLite...');
initDatabase();

// Подключение REST API маршрутов
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/operator', operatorRouter);
app.use('/api/mail', mailRouter);
app.use('/api/extension', extensionRouter);
app.use('/api/photos', photoRouter);
app.use('/api/sender', senderRouter);

// Раздача загруженных файлов
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'ChatSpace CharmDate Backend',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// Раздача скомпилированного фронтенда (Панель Овнера + Мультичат)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Создание HTTP и WebSocket серверов
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
setupWebSocketServer(wss);

server.listen(CONFIG.PORT, () => {
  console.log(`🚀 Сервер ChatSpace запущен: http://localhost:${CONFIG.PORT}`);
  console.log(`📡 WebSocket шлюз активен: ws://localhost:${CONFIG.PORT}`);
});

import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../services/auth.js';

export const photoRouter = Router();

// Настройка хранилища Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ladyId = req.params.ladyId || 'common';
    const dir = path.join(__dirname, '../../uploads/photos', ladyId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

photoRouter.use(requireAuth);

// Получить список фото для конкретной анкеты
photoRouter.get('/:ladyId', (req, res) => {
  const { ladyId } = req.params;
  const dir = path.join(__dirname, '../../uploads/photos', ladyId);
  
  if (!fs.existsSync(dir)) {
    return res.json({ photos: [] });
  }

  const files = fs.readdirSync(dir);
  const photos = files
    .filter(file => !file.startsWith('.'))
    .map(file => ({
      name: file,
      url: `/uploads/photos/${ladyId}/${file}`
    }));

  res.json({ photos });
});

// Загрузить новое фото
photoRouter.post('/:ladyId', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  const ladyId = req.params.ladyId;
  res.json({
    success: true,
    photo: {
      name: req.file.filename,
      url: `/uploads/photos/${ladyId}/${req.file.filename}`
    }
  });
});

// Удалить фото
photoRouter.delete('/:ladyId/:filename', (req, res) => {
  const { ladyId, filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/photos', ladyId, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Файл не найден' });
  }
});

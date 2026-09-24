import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import ctvRouter from './routes/ctv.js';
import tnvRouter from './routes/tnv.js';
import campaignsRouter from './routes/campaigns.js';
import { db, initSchema } from './db/index.js';
import { seedDatabase } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/ctv', ctvRouter);
app.use('/api/tnv', tnvRouter);
app.use('/api/campaigns', campaignsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.isPostgres ? 'PostgreSQL (Cloud Database)' : 'SQLite (Local File)',
    message: 'Hệ thống Quản lý CTV & TNV đang hoạt động ổn định',
    timestamp: new Date().toISOString()
  });
});

// Endpoint reset lại database mẫu khi cần
app.post('/api/reset-seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Đã thiết lập lại dữ liệu mẫu thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi nạp lại dữ liệu mẫu', error: error.message });
  }
});

// Phục vụ giao diện Frontend (Vite React Build) khi chạy Production hoặc sau khi build
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`📦 Đang phục vụ thư mục Frontend build tại: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA Fallback cho các đường dẫn phía client (ngoại trừ các endpoint /api)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Hàm khởi động Server và kiểm tra Database an toàn
async function startServer() {
  try {
    // 1. Tự động kiểm tra và tạo bảng nếu chưa có
    await initSchema();

    // 2. Kiểm tra nếu database đang trống thì tự động nạp dữ liệu mẫu
    try {
      const ctvCountRes = await db.get('SELECT COUNT(*) as count FROM ctv_members');
      const tnvCountRes = await db.get('SELECT COUNT(*) as count FROM tnv_members');
      const ctvCount = Number(ctvCountRes?.count || 0);
      const tnvCount = Number(tnvCountRes?.count || 0);

      if (ctvCount === 0 && tnvCount === 0) {
        console.log('⚡ Cơ sở dữ liệu đang trống, tự động nạp dữ liệu mẫu ban đầu...');
        await seedDatabase();
      }
    } catch (checkErr) {
      console.warn('Lưu ý khi kiểm tra dữ liệu mẫu:', checkErr.message);
    }

    // 3. Khởi động Web Server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server backend đang chạy tại cổng: ${PORT}`);
      console.log(`🔗 Chế độ Cơ sở dữ liệu: ${db.isPostgres ? 'Cloud PostgreSQL' : 'Local SQLite'}`);
    });
  } catch (err) {
    console.error('❌ Lỗi nghiêm trọng khi khởi động server:', err);
    process.exit(1);
  }
}

startServer();

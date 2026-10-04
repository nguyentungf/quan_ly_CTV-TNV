import express from 'express';
import authRouter from '../../src/routes/auth.js';
import ctvRouter from '../../src/routes/ctv.js';
import { requireAdmin } from '../../src/middleware/auth.js';

export function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use('/api/auth', authRouter);
  app.use('/api/ctv', ctvRouter);

  // Error handling middleware to prevent unhandled express crashes
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({ success: false, message: 'Payload Too Large' });
    }
    res.status(err.status || 500).json({ success: false, message: err.message });
  });

  return app;
}

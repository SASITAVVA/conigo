import express from 'express';
import cors from 'cors';
import config from './config/environment.js';
import logger from './utils/logger.js';
import { requestLogger } from './middleware/loggingMiddleware.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import { EventSystem } from './services/events.js';
import path from 'path';
import { fileURLToPath } from 'url';

process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// API Route Imports
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import documentRoutes from './routes/documents.js';
import quizRoutes from './routes/quiz.js';
import notesRoutes from './routes/notes.js';
import dashboardRoutes from './routes/dashboard.js';
import progressRoutes from './routes/progress.js';
import gamificationRoutes from './routes/gamification.js';
import studySessionRoutes from './routes/studySessions.js';
import searchRoutes from './routes/search.js';
// Admin routes removed
import studyMaterialRoutes from './routes/studyMaterials.js';
import courseRoutes from './routes/courses.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = config.PORT || 3000;

// Core Middleware
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(requestLogger);

// Serve static assets from client folder
app.use(express.static(path.join(__dirname, '../client')));

// System health verification endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: config.NODE_ENV, timestamp: new Date().toISOString() });
});

// Real-Time SSE Event Stream endpoint for live dashboard synchronization
app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const clientId = Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  EventSystem.addClient(clientId, res);
});

// API Route Registering
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/study-sessions', studySessionRoutes);
app.use('/api/search', searchRoutes);
// Admin routes completely removed
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Enterprise Global Error and 404 Handlers
app.use(notFoundHandler);
app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(port, () => {
    logger.info(`CogniPath Enterprise AI Learning Platform server running on port ${port} [${config.NODE_ENV}]`);
  });
}

export default app;

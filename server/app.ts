import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase, db } from './db/database.ts';
import { authRouter } from './routes/auth.ts';
import { leadsRouter } from './routes/leads.ts';
import { importRouter } from './routes/import.ts';
import { activitiesRouter } from './routes/activities.ts';
import { followupsRouter } from './routes/followups.ts';
import { potentialLeadsRouter } from './routes/potentialLeads.ts';
import { tasksRouter } from './routes/tasks.ts';
import { salesPipelineRouter } from './routes/salesPipeline.ts';
import { analyticsRouter } from './routes/analytics.ts';
import { consultantsRouter } from './routes/consultants.ts';
import { businessesRouter } from './routes/businesses.ts';
import { sourcesRouter } from './routes/sources.ts';
import { tagsRouter } from './routes/tags.ts';
import { settingsRouter } from './routes/settings.ts';
import { notificationsRouter } from './routes/notifications.ts';
import { auditLogsRouter } from './routes/auditLogs.ts';
import { exportsRouter } from './routes/exports.ts';
import { googleSheetsRouter } from './routes/googleSheets.ts';

// BigInt JSON serializer patch for Node SQLite
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema & indexes safely
try {
  initializeDatabase();
} catch (e) {
  console.warn('initializeDatabase warning:', e);
}

// Pre-seed default Google Sheet config if not present
try {
  const existingConfig = db.prepare('SELECT id FROM google_sheet_sync_configs WHERE sheet_id = ?').get('1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs');
  if (!existingConfig) {
    db.prepare(`
      INSERT INTO google_sheet_sync_configs (
        sheet_name, sheet_url, sheet_id, gid, sync_frequency,
        is_active, source_id, last_sync_status, last_sync_message
      ) VALUES (
        'MCA Inbound Daily Master Sheet',
        'https://docs.google.com/spreadsheets/d/1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs/edit?gid=758135810#gid=758135810',
        '1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs',
        '758135810',
        'DAILY',
        1,
        1,
        'READY',
        'Configured for automated daily incorporation date sync'
      )
    `).run();
    console.log('✅ Default MCA Google Sheet sync configuration initialized.');
  }
} catch (e) {
  console.warn('Google Sheet seed check:', e);
}

export const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger for audit & debugging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/import', importRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/followups', followupsRouter);
app.use('/api/potential-leads', potentialLeadsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/sales', salesPipelineRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/consultants', consultantsRouter);
app.use('/api/businesses', businessesRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/integrations/google-sheets', googleSheetsRouter);
app.use('/api/google-sheets', googleSheetsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    name: 'Dizibrand Multi-Business CRM API',
  });
});

// Serve frontend in production when running standalone server
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred',
  });
});

export default app;

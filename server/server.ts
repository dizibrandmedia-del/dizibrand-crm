import { app } from './app.js';
import { db } from './db/database.js';
import { syncGoogleSheetConfig } from './services/googleSheetSync.js';

const PORT = process.env.PORT || 5000;

// Automated Daily / Hourly Background Google Sheet Sync Timer
setInterval(async () => {
  try {
    const activeConfigs = db.prepare(`
      SELECT id, sheet_name, sync_frequency, last_sync_at
      FROM google_sheet_sync_configs
      WHERE is_active = 1 AND sync_frequency IN ('HOURLY', 'DAILY')
    `).all() as any[];

    const now = Date.now();
    for (const config of activeConfigs) {
      const lastSync = config.last_sync_at ? new Date(config.last_sync_at).getTime() : 0;
      const intervalMs = config.sync_frequency === 'HOURLY' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

      if (now - lastSync >= intervalMs) {
        console.log(`[Auto-Sync] Triggering scheduled sync for Google Sheet: ${config.sheet_name}`);
        await syncGoogleSheetConfig(config.id, { triggeredBy: 'Scheduled Background Sync' }).catch((err) => {
          console.error(`[Auto-Sync Error] ${config.sheet_name}:`, err.message);
        });
      }
    }
  } catch (err) {
    console.error('Background Google Sheet sync timer error:', err);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

app.listen(PORT, () => {
  console.log(`🚀 Dizibrand CRM Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

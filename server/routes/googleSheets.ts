import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import {
  parseGoogleSheetUrl,
  syncGoogleSheetConfig,
  generateGoogleAppsScript
} from '../services/googleSheetSync.js';

export const googleSheetsRouter = Router();

// 1. Get all Google Sheet Sync Configurations (Admin Only)
googleSheetsRouter.get('/configs', requireAdmin, (req: AuthRequest, res) => {
  try {
    const configs = db.prepare(`
      SELECT 
        google_sheet_sync_configs.*,
        lead_sources.name as source_name,
        users.name as assigned_consultant_name,
        businesses.name as business_name
      FROM google_sheet_sync_configs
      LEFT JOIN lead_sources ON lead_sources.id = google_sheet_sync_configs.source_id
      LEFT JOIN users ON users.id = google_sheet_sync_configs.assign_consultant_id
      LEFT JOIN businesses ON businesses.id = google_sheet_sync_configs.internal_business_id
      ORDER BY google_sheet_sync_configs.created_at DESC
    `).all();

    return res.json({ configs });
  } catch (error: any) {
    console.error('Fetch Google Sheets configs error:', error);
    return res.status(500).json({ error: 'Failed to fetch Google Sheets configurations' });
  }
});

// 2. Add New Google Sheet Configuration (Admin Only)
googleSheetsRouter.post('/configs', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      sheet_name,
      sheet_url,
      sync_frequency = 'DAILY',
      source_id = 1,
      assign_consultant_id,
      internal_business_id,
    } = req.body;

    if (!sheet_url) {
      return res.status(400).json({ error: 'Google Sheet URL is required' });
    }

    const { sheetId, gid } = parseGoogleSheetUrl(sheet_url);
    if (!sheetId) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL. Could not extract spreadsheet ID.' });
    }

    const finalSheetName = sheet_name || `Google Sheet (${sheetId.slice(0, 8)}...)`;
    const webhookSecret = crypto.randomBytes(16).toString('hex');

    const stmt = db.prepare(`
      INSERT INTO google_sheet_sync_configs (
        sheet_name, sheet_url, sheet_id, gid, sync_frequency,
        is_active, source_id, assign_consultant_id, internal_business_id,
        webhook_secret
      ) VALUES (
        ?, ?, ?, ?, ?,
        1, ?, ?, ?,
        ?
      )
    `);

    const result = stmt.run(
      finalSheetName,
      sheet_url,
      sheetId,
      gid || '0',
      sync_frequency,
      source_id || 1,
      assign_consultant_id || null,
      internal_business_id || null,
      webhookSecret
    );

    const configId = Number(result.lastInsertRowid);
    logAudit(req, 'CREATE_GOOGLE_SHEET_CONFIG', 'google_sheet_sync_configs', configId, null, {
      sheet_name: finalSheetName,
      sheet_url,
      sheetId,
      gid,
    });

    return res.status(201).json({
      message: 'Google Sheet sync configuration created successfully',
      config_id: configId,
      sheet_id: sheetId,
      gid,
    });
  } catch (error: any) {
    console.error('Create Google Sheet config error:', error);
    return res.status(500).json({ error: 'Failed to create Google Sheet configuration' });
  }
});

// 3. Update Configuration (Admin Only)
googleSheetsRouter.patch('/configs/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const configId = Number(req.params.id);
    const {
      sheet_name,
      sheet_url,
      sync_frequency,
      is_active,
      source_id,
      assign_consultant_id,
      internal_business_id,
    } = req.body;

    const existing = db.prepare('SELECT * FROM google_sheet_sync_configs WHERE id = ?').get(configId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    let sheetId = existing.sheet_id;
    let gid = existing.gid;

    if (sheet_url && sheet_url !== existing.sheet_url) {
      const parsed = parseGoogleSheetUrl(sheet_url);
      if (parsed.sheetId) {
        sheetId = parsed.sheetId;
        gid = parsed.gid || '0';
      }
    }

    db.prepare(`
      UPDATE google_sheet_sync_configs SET
        sheet_name = COALESCE(?, sheet_name),
        sheet_url = COALESCE(?, sheet_url),
        sheet_id = ?,
        gid = ?,
        sync_frequency = COALESCE(?, sync_frequency),
        is_active = COALESCE(?, is_active),
        source_id = COALESCE(?, source_id),
        assign_consultant_id = ?,
        internal_business_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      sheet_name,
      sheet_url,
      sheetId,
      gid,
      sync_frequency,
      is_active !== undefined ? Number(is_active) : existing.is_active,
      source_id,
      assign_consultant_id !== undefined ? assign_consultant_id : existing.assign_consultant_id,
      internal_business_id !== undefined ? internal_business_id : existing.internal_business_id,
      configId
    );

    return res.json({ message: 'Google Sheet configuration updated successfully' });
  } catch (error: any) {
    console.error('Update Google Sheet config error:', error);
    return res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// 4. Delete Configuration (Admin Only)
googleSheetsRouter.delete('/configs/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const configId = Number(req.params.id);
    db.prepare('DELETE FROM google_sheet_sync_configs WHERE id = ?').run(configId);
    return res.json({ message: 'Configuration deleted successfully' });
  } catch (error: any) {
    console.error('Delete Google Sheet config error:', error);
    return res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// 5. Trigger Instant Sync Now (Admin Only)
googleSheetsRouter.post('/sync-now/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const configId = Number(req.params.id);
    const result = await syncGoogleSheetConfig(configId, { triggeredBy: req.user?.name || 'Admin' });

    logAudit(req, 'SYNC_GOOGLE_SHEET', 'google_sheet_sync_configs', configId, null, result);

    return res.json({
      message: `Sync finished! Ingested ${result.importedCount} new leads. ${result.duplicateCount} duplicates skipped.`,
      result,
    });
  } catch (error: any) {
    console.error('Sync Google Sheet error:', error);
    return res.status(400).json({ error: error.message || 'Failed to sync Google Sheet' });
  }
});

// 6. Public Webhook Endpoint (For Google Apps Script automated daily/onEdit trigger)
googleSheetsRouter.post('/webhook/:id', async (req, res) => {
  try {
    const configId = Number(req.params.id);
    const { rows, secret_key } = req.body;

    const config = db.prepare('SELECT * FROM google_sheet_sync_configs WHERE id = ?').get(configId) as any;
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    if (config.webhook_secret && secret_key && config.webhook_secret !== secret_key) {
      return res.status(403).json({ error: 'Invalid secret key' });
    }

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'rows array is required in webhook payload' });
    }

    const result = await syncGoogleSheetConfig(configId, { rawRows: rows, triggeredBy: 'Google Apps Script Webhook' });

    return res.json({
      success: true,
      message: `Webhook processed. Ingested ${result.importedCount} leads, skipped ${result.duplicateCount} duplicates.`,
      result,
    });
  } catch (error: any) {
    console.error('Google Sheet webhook error:', error);
    return res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
});

// 7. Get Sync Logs & History (Admin Only)
googleSheetsRouter.get('/logs/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const configId = Number(req.params.id);
    const logs = db.prepare(`
      SELECT * FROM google_sheet_sync_logs
      WHERE config_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(configId);

    return res.json({ logs });
  } catch (error: any) {
    console.error('Fetch Google Sheet logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// 8. Generate 1-Click Google Apps Script Code (Admin Only)
googleSheetsRouter.get('/apps-script-code/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const configId = Number(req.params.id);
    const config = db.prepare('SELECT * FROM google_sheet_sync_configs WHERE id = ?').get(configId) as any;
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const webhookUrl = `${protocol}://${host}/api/integrations/google-sheets/webhook/${configId}`;

    const scriptCode = generateGoogleAppsScript(configId, webhookUrl, config.webhook_secret || '');

    return res.json({
      webhookUrl,
      scriptCode,
    });
  } catch (error: any) {
    console.error('Generate script code error:', error);
    return res.status(500).json({ error: 'Failed to generate script code' });
  }
});

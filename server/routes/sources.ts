import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const sourcesRouter = Router();

// Get Lead Sources (Public to authenticated users for dropdowns)
sourcesRouter.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const sources = db.prepare(`
      SELECT 
        lead_sources.*,
        (SELECT COUNT(*) FROM leads WHERE source_id = lead_sources.id) as total_leads,
        (SELECT COUNT(*) FROM deals WHERE source_id = lead_sources.id) as won_deals,
        (SELECT COALESCE(SUM(revenue), 0) FROM deals WHERE source_id = lead_sources.id) as total_revenue
      FROM lead_sources
      ORDER BY lead_sources.is_system DESC, lead_sources.name ASC
    `).all();

    return res.json({ sources });
  } catch (error: any) {
    console.error('Fetch sources error:', error);
    return res.status(500).json({ error: 'Failed to fetch lead sources' });
  }
});

// Add New Lead Source (Admin Only)
sourcesRouter.post('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Source name and code are required' });
    }

    const existing = db.prepare('SELECT id FROM lead_sources WHERE LOWER(name) = LOWER(?) OR UPPER(code) = UPPER(?)').get(name, code);
    if (existing) {
      return res.status(409).json({ error: 'A lead source with this name or code already exists' });
    }

    const stmt = db.prepare(`
      INSERT INTO lead_sources (name, code, is_system, is_active)
      VALUES (?, ?, 0, 1)
    `);

    const result = stmt.run(name.trim(), code.trim().toUpperCase());

    logAudit(req, 'CREATE_LEAD_SOURCE', 'lead_sources', result.lastInsertRowid, null, { name, code });

    return res.status(201).json({
      message: 'Lead source created successfully',
      source_id: result.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('Create source error:', error);
    return res.status(500).json({ error: 'Failed to create lead source' });
  }
});

// Toggle Lead Source Active Status (Admin Only)
sourcesRouter.patch('/:id/toggle-status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const sourceId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM lead_sources WHERE id = ?').get(sourceId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Lead source not found' });
    }

    const newStatus = existing.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE lead_sources SET is_active = ? WHERE id = ?').run(newStatus, sourceId);

    logAudit(req, 'TOGGLE_SOURCE_STATUS', 'lead_sources', sourceId, existing, { is_active: newStatus });

    return res.json({ message: 'Lead source status updated', is_active: newStatus });
  } catch (error: any) {
    console.error('Toggle source status error:', error);
    return res.status(500).json({ error: 'Failed to update lead source status' });
  }
});

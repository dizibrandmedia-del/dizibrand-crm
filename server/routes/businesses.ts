import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const businessesRouter = Router();

// 1. Get Businesses (Super Admin Only)
businessesRouter.get('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const businesses = db.prepare(`
      SELECT 
        businesses.*,
        (SELECT COUNT(*) FROM leads WHERE internal_business_id = businesses.id) as total_leads,
        (SELECT COUNT(*) FROM deals WHERE internal_business_id = businesses.id) as total_deals,
        (SELECT COALESCE(SUM(revenue), 0) FROM deals WHERE internal_business_id = businesses.id) as total_revenue
      FROM businesses
      ORDER BY businesses.id ASC
    `).all();

    return res.json({ businesses });
  } catch (error: any) {
    console.error('Fetch businesses error:', error);
    return res.status(500).json({ error: 'Failed to fetch business verticals' });
  }
});

// 2. Create Business Vertical (Super Admin Only)
businessesRouter.post('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Business name and code are required' });
    }

    const existing = db.prepare('SELECT id FROM businesses WHERE LOWER(name) = LOWER(?) OR UPPER(code) = UPPER(?)').get(name, code);
    if (existing) {
      return res.status(409).json({ error: 'A business vertical with this name or code already exists' });
    }

    const stmt = db.prepare(`
      INSERT INTO businesses (name, code, description, is_active)
      VALUES (?, ?, ?, 1)
    `);

    const result = stmt.run(name.trim(), code.trim().toUpperCase(), description || null);

    logAudit(req, 'CREATE_BUSINESS', 'businesses', result.lastInsertRowid, null, { name, code });

    return res.status(201).json({
      message: 'Business vertical created successfully',
      business_id: result.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('Create business error:', error);
    return res.status(500).json({ error: 'Failed to create business vertical' });
  }
});

// 3. Update Business Vertical (Super Admin Only)
businessesRouter.put('/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const businessId = Number(req.params.id);
    const { name, code, description, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Business not found' });
    }

    db.prepare(`
      UPDATE businesses SET 
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, code ? code.toUpperCase() : null, description, is_active, businessId);

    logAudit(req, 'UPDATE_BUSINESS', 'businesses', businessId, existing, { name, code });

    return res.json({ message: 'Business vertical updated successfully' });
  } catch (error: any) {
    console.error('Update business error:', error);
    return res.status(500).json({ error: 'Failed to update business vertical' });
  }
});

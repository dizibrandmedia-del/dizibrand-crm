import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const settingsRouter = Router();

// Get Scoring Rules
settingsRouter.get('/scoring-rules', authMiddleware, (req: AuthRequest, res) => {
  try {
    const rules = db.prepare('SELECT * FROM scoring_rules ORDER BY id ASC').all();
    return res.json({ scoringRules: rules, rules });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch scoring rules' });
  }
});

// Bulk Update Scoring Rules (Admin Only)
settingsRouter.post('/scoring-rules', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { rules, scoringRules } = req.body;
    const items = Array.isArray(rules) ? rules : Array.isArray(scoringRules) ? scoringRules : [];

    const updateStmt = db.prepare(`
      UPDATE scoring_rules SET 
        weight = ?,
        is_active = ?
      WHERE id = ?
    `);

    db.exec('BEGIN TRANSACTION;');
    for (const r of items) {
      const weight = r.weight !== undefined ? r.weight : r.points !== undefined ? r.points : 10;
      const isActive = r.is_active !== undefined ? r.is_active : 1;
      updateStmt.run(weight, isActive, r.id);
    }
    db.exec('COMMIT;');

    logAudit(req, 'BULK_UPDATE_SCORING_RULES', 'scoring_rules', null, null, { count: items.length });
    return res.json({ success: true, message: 'Scoring rules updated successfully' });
  } catch (error: any) {
    try { db.exec('ROLLBACK;'); } catch (e) {}
    return res.status(500).json({ error: error.message || 'Failed to update scoring rules' });
  }
});

// Update Single Scoring Rule Weight (Admin Only)
settingsRouter.patch('/scoring-rules/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const ruleId = Number(req.params.id);
    const { weight, points, is_active } = req.body;
    const finalWeight = weight !== undefined ? weight : points !== undefined ? points : undefined;

    db.prepare(`
      UPDATE scoring_rules SET 
        weight = COALESCE(?, weight),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(finalWeight, is_active, ruleId);

    logAudit(req, 'UPDATE_SCORING_RULE', 'scoring_rules', ruleId, null, { weight: finalWeight, is_active });

    return res.json({ message: 'Scoring rule updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update scoring rule' });
  }
});

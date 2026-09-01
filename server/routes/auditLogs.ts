import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

export const auditLogsRouter = Router();

// Get Audit Logs (Super Admin Only)
auditLogsRouter.get('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { action, user_id, search, limit = 100 } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];

    if (action) {
      conditions.push('audit_logs.action = ?');
      params.push(action);
    }

    if (user_id) {
      conditions.push('audit_logs.user_id = ?');
      params.push(Number(user_id));
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(audit_logs.action LIKE ? OR audit_logs.user_email LIKE ? OR audit_logs.entity_type LIKE ? OR audit_logs.entity_id LIKE ?)');
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        audit_logs.*,
        users.name as user_name
      FROM audit_logs
      LEFT JOIN users ON users.id = audit_logs.user_id
      ${whereClause}
      ORDER BY audit_logs.created_at DESC
      LIMIT ?
    `;

    const logs = db.prepare(sql).all(...params, Number(limit));

    return res.json({ logs });
  } catch (error: any) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

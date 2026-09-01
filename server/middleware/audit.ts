import { Request } from 'express';
import { db } from '../db/database.js';
import { AuthRequest } from './auth.js';

export function logAudit(
  req: AuthRequest | Request,
  action: string,
  entityType: string,
  entityId: string | number | null,
  oldValues: any = null,
  newValues: any = null
) {
  try {
    const user = (req as AuthRequest).user;
    const userId = user ? user.id : null;
    const userEmail = user ? user.email : 'system';
    const userRole = user ? user.role : 'SYSTEM';

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, entity_type,
        entity_id, old_values_json, new_values_json, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      userEmail,
      userRole,
      action,
      entityType,
      entityId !== null ? String(entityId) : null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      String(ip),
      String(userAgent)
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

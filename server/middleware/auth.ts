import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dizibrand-crm-super-secret-production-key-2026';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CONSULTANT';
  mobile?: string;
  is_active: number;
  daily_call_target?: number;
  daily_lead_target?: number;
  daily_whatsapp_target?: number;
  daily_followup_target?: number;
  daily_potential_target?: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    // Fetch live user from database to ensure active status and latest targets
    const user = db.prepare('SELECT id, name, email, role, mobile, is_active, daily_call_target, daily_lead_target, daily_whatsapp_target, daily_followup_target, daily_potential_target FROM users WHERE id = ?').get(decoded.id) as AuthenticatedUser | undefined;

    if (!user || user.is_active !== 1) {
      return res.status(401).json({ error: 'User account is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user) {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
    return next();
  }

  authMiddleware(req, res, () => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
    next();
  });
}

/**
 * Sanitizes lead and sales records for Consultant role:
 * Strips sensitive financial fields (deal_value, revenue, payment_status)
 * but preserves assigned business_name & internal_business_id for communication & greetings.
 */
export function sanitizeLeadForRole(lead: any, role: string) {
  if (!lead) return lead;
  if (role === 'SUPER_ADMIN') return lead;

  const sanitized = { ...lead };
  // Keep internal_business_id, business_name, business_code so consultants can address clients from the assigned business
  delete sanitized.deal_value;
  delete sanitized.revenue;
  delete sanitized.payment_status;
  delete sanitized.payment_type;
  return sanitized;
}

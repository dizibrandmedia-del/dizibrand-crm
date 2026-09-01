import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { authMiddleware, AuthRequest, JWT_SECRET } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const authRouter = Router();

// Login
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact Super Admin.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      is_active: user.is_active,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Sanitized user object
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      is_active: user.is_active,
      daily_call_target: user.daily_call_target,
      daily_lead_target: user.daily_lead_target,
      daily_whatsapp_target: user.daily_whatsapp_target,
      daily_followup_target: user.daily_followup_target,
      daily_potential_target: user.daily_potential_target,
    };

    logAudit(req, 'USER_LOGIN', 'users', user.id, null, { email: user.email, role: user.role });

    return res.json({
      token,
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get Current Profile
authRouter.get('/me', authMiddleware, (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

// Change Password
authRouter.post('/change-password', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    const isMatch = bcrypt.compareSync(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(new_password, salt);

    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user!.id);

    logAudit(req, 'PASSWORD_CHANGE', 'users', req.user!.id);

    return res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

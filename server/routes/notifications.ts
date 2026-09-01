import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

export const notificationsRouter = Router();

// Get Notifications for Current User
notificationsRouter.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(user.id);

    const unreadCountRow = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `).get(user.id) as { count: number };

    return res.json({
      notifications,
      unreadCount: unreadCountRow ? unreadCountRow.count : 0,
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark Notification as Read
notificationsRouter.patch('/:id/read', authMiddleware, (req: AuthRequest, res) => {
  try {
    const notifId = Number(req.params.id);
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notifId, req.user!.id);
    return res.json({ message: 'Marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark All as Read
notificationsRouter.post('/mark-all-read', authMiddleware, (req: AuthRequest, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
    return res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

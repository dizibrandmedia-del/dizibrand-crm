import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';

export const tagsRouter = Router();

// Get all tags
tagsRouter.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const tags = db.prepare(`
      SELECT 
        tags.*,
        (SELECT COUNT(*) FROM lead_tags WHERE tag_id = tags.id) as leads_count
      FROM tags
      ORDER BY tags.name ASC
    `).all();

    return res.json({ tags });
  } catch (error: any) {
    console.error('Fetch tags error:', error);
    return res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create Tag (Admin Only)
tagsRouter.post('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { name, color = '#4f46e5', description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const result = db.prepare('INSERT OR IGNORE INTO tags (name, color, description) VALUES (?, ?, ?)').run(name.trim(), color, description || null);

    return res.status(201).json({ message: 'Tag created', tag_id: result.lastInsertRowid });
  } catch (error: any) {
    console.error('Create tag error:', error);
    return res.status(500).json({ error: 'Failed to create tag' });
  }
});

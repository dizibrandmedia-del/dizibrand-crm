import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const tasksRouter = Router();

// 1. Get Tasks (List filtered by role)
tasksRouter.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { status, consultant_id } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'CONSULTANT') {
      conditions.push('tasks.consultant_id = ?');
      params.push(user.id);
    } else if (consultant_id) {
      conditions.push('tasks.consultant_id = ?');
      params.push(Number(consultant_id));
    }

    if (status) {
      conditions.push('tasks.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        tasks.*,
        consultant.name as consultant_name,
        consultant.email as consultant_email,
        creator.name as created_by_name
      FROM tasks
      JOIN users as consultant ON consultant.id = tasks.consultant_id
      JOIN users as creator ON creator.id = tasks.created_by_id
      ${whereClause}
      ORDER BY tasks.due_date ASC, tasks.priority DESC
    `;

    const tasks = db.prepare(sql).all(...params);

    return res.json({ tasks });
  } catch (error: any) {
    console.error('Fetch tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// 2. Create Task & Set Targets (Admin Only)
tasksRouter.post('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      consultant_id,
      priority = 'MEDIUM',
      start_date,
      due_date,
      call_target = 0,
      whatsapp_target = 0,
      lead_target = 0,
      followup_target = 0,
      potential_target = 0,
      meeting_target = 0,
    } = req.body;

    if (!title || !consultant_id || !start_date || !due_date) {
      return res.status(400).json({ error: 'Title, consultant_id, start_date, and due_date are required' });
    }

    const consultantId = Number(consultant_id);
    const consultant = db.prepare('SELECT * FROM users WHERE id = ?').get(consultantId) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO tasks (
        title, description, consultant_id, created_by_id, priority,
        start_date, due_date, status, call_target, whatsapp_target,
        lead_target, followup_target, potential_target, meeting_target
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, 'PENDING', ?, ?,
        ?, ?, ?, ?
      )
    `);

    const result = insertStmt.run(
      title,
      description || null,
      consultantId,
      req.user!.id,
      priority,
      start_date,
      due_date,
      Number(call_target) || 0,
      Number(whatsapp_target) || 0,
      Number(lead_target) || 0,
      Number(followup_target) || 0,
      Number(potential_target) || 0,
      Number(meeting_target) || 0
    );

    // Also update consultant's default daily targets if specified
    if (call_target > 0 || lead_target > 0 || whatsapp_target > 0 || followup_target > 0 || potential_target > 0) {
      db.prepare(`
        UPDATE users SET 
          daily_call_target = CASE WHEN ? > 0 THEN ? ELSE daily_call_target END,
          daily_lead_target = CASE WHEN ? > 0 THEN ? ELSE daily_lead_target END,
          daily_whatsapp_target = CASE WHEN ? > 0 THEN ? ELSE daily_whatsapp_target END,
          daily_followup_target = CASE WHEN ? > 0 THEN ? ELSE daily_followup_target END,
          daily_potential_target = CASE WHEN ? > 0 THEN ? ELSE daily_potential_target END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        call_target, call_target,
        lead_target, lead_target,
        whatsapp_target, whatsapp_target,
        followup_target, followup_target,
        potential_target, potential_target,
        consultantId
      );
    }

    // Send notification to consultant
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, 'New Task & Target Assigned', ?, 'TASK_ASSIGNED', '/consultant/tasks')
    `).run(
      consultantId,
      `Super Admin assigned you task: "${title}" (Due: ${due_date})`
    );

    logAudit(req, 'CREATE_TASK', 'tasks', result.lastInsertRowid, null, {
      title,
      consultant_id: consultantId,
      call_target,
      lead_target,
    });

    return res.status(201).json({
      message: 'Task and targets assigned successfully',
      task_id: result.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// 3. Update Task Status or Details
tasksRouter.patch('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const taskId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (user.role === 'CONSULTANT' && existing.consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      status, // PENDING, IN_PROGRESS, COMPLETED, PAUSED, CANCELLED
      title,
      description,
      priority,
      start_date,
      due_date,
      call_target,
      whatsapp_target,
      lead_target,
      followup_target,
      potential_target,
      meeting_target,
    } = req.body;

    if (user.role === 'CONSULTANT') {
      // Consultant can only update status to IN_PROGRESS or COMPLETED
      if (status && !['IN_PROGRESS', 'COMPLETED'].includes(status)) {
        return res.status(403).json({ error: 'Consultants can only set task status to IN_PROGRESS or COMPLETED' });
      }

      db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, taskId);
    } else {
      // Admin has full control
      db.prepare(`
        UPDATE tasks SET 
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          priority = COALESCE(?, priority),
          start_date = COALESCE(?, start_date),
          due_date = COALESCE(?, due_date),
          status = COALESCE(?, status),
          call_target = COALESCE(?, call_target),
          whatsapp_target = COALESCE(?, whatsapp_target),
          lead_target = COALESCE(?, lead_target),
          followup_target = COALESCE(?, followup_target),
          potential_target = COALESCE(?, potential_target),
          meeting_target = COALESCE(?, meeting_target),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        title, description, priority, start_date, due_date, status,
        call_target, whatsapp_target, lead_target, followup_target, potential_target, meeting_target,
        taskId
      );
    }

    logAudit(req, 'UPDATE_TASK', 'tasks', taskId, existing, { status, title });

    return res.json({ message: 'Task updated successfully' });
  } catch (error: any) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

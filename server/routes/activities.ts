import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const activitiesRouter = Router();

// 1. Log Direct Call
activitiesRouter.post('/call', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      lead_id,
      outcome, // CONNECTED, NO_ANSWER, BUSY, SWITCHED_OFF, CALL_BACK, INTERESTED, NOT_INTERESTED, QUALIFIED, WRONG_NUMBER, DND
      duration_seconds = 0,
      remark,
      next_followup_date,
      next_followup_time,
    } = req.body;

    if (!lead_id || !outcome) {
      return res.status(400).json({ error: 'lead_id and outcome are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Role check
    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only log calls for leads assigned to you.' });
    }

    const now = new Date();
    const callDate = now.toISOString().split('T')[0];
    const callTime = now.toTimeString().split(' ')[0].substring(0, 5);

    // Insert call record
    const callStmt = db.prepare(`
      INSERT INTO calls (
        lead_id, consultant_id, call_date, call_time, outcome,
        duration_seconds, remark, next_followup_date, next_followup_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const callResult = callStmt.run(
      leadId,
      user.id,
      callDate,
      callTime,
      outcome,
      Number(duration_seconds) || 0,
      remark || null,
      next_followup_date || null,
      next_followup_time || null
    );

    // Map call outcome to lead status update
    let newStatus = lead.status;
    if (outcome === 'CONNECTED') newStatus = lead.status === 'NEW' || lead.status === 'ASSIGNED' ? 'CONNECTED' : lead.status;
    else if (outcome === 'INTERESTED') newStatus = 'INTERESTED';
    else if (outcome === 'QUALIFIED') newStatus = 'QUALIFIED';
    else if (outcome === 'NOT_INTERESTED') newStatus = 'NOT_INTERESTED';
    else if (outcome === 'WRONG_NUMBER') newStatus = 'WRONG_NUMBER';
    else if (outcome === 'DND') newStatus = 'DND';
    else if (outcome === 'CALL_BACK') newStatus = 'FOLLOW_UP';
    else if (['NO_ANSWER', 'BUSY', 'SWITCHED_OFF'].includes(outcome)) {
      if (lead.status === 'NEW' || lead.status === 'ASSIGNED') newStatus = 'CONTACT_ATTEMPTED';
    }

    // Update Lead last_activity_at and status
    db.prepare(`
      UPDATE leads SET 
        status = ?, 
        last_activity_at = datetime('now'),
        next_followup_date = COALESCE(?, next_followup_date),
        next_followup_time = COALESCE(?, next_followup_time),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, next_followup_date || null, next_followup_time || null, leadId);

    // If follow-up date specified, schedule follow-up
    if (next_followup_date) {
      db.prepare(`
        INSERT INTO follow_ups (lead_id, consultant_id, followup_date, followup_time, priority, reason, remark, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        leadId,
        user.id,
        next_followup_date,
        next_followup_time || '10:00',
        lead.priority || 'MEDIUM',
        `Call follow-up (${outcome})`,
        remark || 'Call follow-up scheduled'
      );
    }

    // Record Timeline Activity
    const formattedDuration = duration_seconds > 0 ? ` (${Math.floor(duration_seconds / 60)}m ${duration_seconds % 60}s)` : '';
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'CALL', ?, ?)
    `).run(
      leadId,
      user.id,
      `Call: ${outcome}${formattedDuration}`,
      remark || `Call completed by ${user.name} with outcome "${outcome}"`
    );

    logAudit(req, 'LOG_CALL', 'calls', callResult.lastInsertRowid, null, { lead_id: leadId, outcome, duration_seconds });

    return res.status(201).json({
      message: 'Call activity logged successfully',
      call_id: callResult.lastInsertRowid,
      lead_status: newStatus,
    });
  } catch (error: any) {
    console.error('Log call error:', error);
    return res.status(500).json({ error: 'Failed to log call' });
  }
});

// 2. Log WhatsApp Activity
activitiesRouter.post('/whatsapp', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      lead_id,
      outcome = 'SENT', // SENT, REPLIED, INTERESTED, NOT_INTERESTED, NO_RESPONSE
      template_name,
      message_preview,
      remark,
    } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id is required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only log WhatsApp activities for your assigned leads.' });
    }

    const waStmt = db.prepare(`
      INSERT INTO whatsapp_activities (
        lead_id, consultant_id, outcome, template_name, message_preview, remark
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const waResult = waStmt.run(
      leadId,
      user.id,
      outcome,
      template_name || 'Standard Outreach',
      message_preview || null,
      remark || null
    );

    // Update Lead last_activity_at
    db.prepare(`
      UPDATE leads SET 
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(leadId);

    // Record Timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'WHATSAPP', ?, ?)
    `).run(
      leadId,
      user.id,
      `WhatsApp: ${outcome}`,
      remark || `WhatsApp message (${template_name || 'Outreach'}) sent by ${user.name}`
    );

    logAudit(req, 'LOG_WHATSAPP', 'whatsapp_activities', waResult.lastInsertRowid, null, { lead_id: leadId, outcome, template_name });

    return res.status(201).json({
      message: 'WhatsApp activity logged successfully',
      whatsapp_id: waResult.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('Log whatsapp error:', error);
    return res.status(500).json({ error: 'Failed to log WhatsApp activity' });
  }
});

// 3. Add General Remark
activitiesRouter.post('/remark', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { lead_id, remark } = req.body;

    if (!lead_id || !remark || !remark.trim()) {
      return res.status(400).json({ error: 'lead_id and remark are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only add remarks to your assigned leads.' });
    }

    // Update lead remarks and last_activity
    db.prepare(`
      UPDATE leads SET 
        remarks = ?,
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(remark.trim(), leadId);

    // Timeline activity
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'REMARK', 'Remark Added', ?)
    `).run(leadId, user.id, remark.trim());

    logAudit(req, 'ADD_REMARK', 'leads', leadId, null, { remark });

    return res.status(201).json({ message: 'Remark added successfully' });
  } catch (error: any) {
    console.error('Add remark error:', error);
    return res.status(500).json({ error: 'Failed to add remark' });
  }
});

// 4. Get Lead Activity Timeline
activitiesRouter.get('/lead/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const leadId = Number(req.params.id);

    const lead = db.prepare('SELECT assigned_consultant_id FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const activities = db.prepare(`
      SELECT 
        lead_activities.*,
        users.name as user_name,
        users.role as user_role
      FROM lead_activities
      LEFT JOIN users ON users.id = lead_activities.user_id
      WHERE lead_activities.lead_id = ?
      ORDER BY lead_activities.created_at DESC
    `).all(leadId);

    return res.json({ activities });
  } catch (error: any) {
    console.error('Fetch timeline error:', error);
    return res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

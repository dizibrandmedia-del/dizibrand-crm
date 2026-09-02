import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const followupsRouter = Router();

// 1. Get Follow-ups with Views (Today, Overdue, Upcoming, Hot, All)
followupsRouter.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { view = 'all', status = 'PENDING', priority } = req.query as any;

    const todayStr = new Date().toISOString().split('T')[0];
    const conditions: string[] = [];
    const params: any[] = [];

    // Consultant isolation
    if (user.role === 'CONSULTANT') {
      conditions.push('follow_ups.consultant_id = ?');
      params.push(user.id);
    }

    if (status) {
      conditions.push('follow_ups.status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('follow_ups.priority = ?');
      params.push(priority);
    }

    if (view === 'today') {
      conditions.push('follow_ups.followup_date = ?');
      params.push(todayStr);
    } else if (view === 'overdue') {
      conditions.push('follow_ups.followup_date < ?');
      params.push(todayStr);
    } else if (view === 'upcoming') {
      conditions.push('follow_ups.followup_date > ?');
      params.push(todayStr);
    } else if (view === 'hot') {
      conditions.push('follow_ups.priority = ?');
      params.push('HOT');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const querySql = `
      SELECT 
        follow_ups.*,
        leads.lead_id,
        leads.lead_id as lead_code,
        leads.company_name,
        leads.contact_person,
        leads.mobile,
        leads.email,
        leads.city,
        leads.status as lead_status,
        leads.lead_score,
        leads.priority as lead_priority,
        leads.internal_business_id,
        businesses.name as business_name,
        businesses.name as internal_business_name,
        consultant.name as consultant_name,
        consultant.name as assigned_consultant_name,
        consultant.email as consultant_email,
        CASE 
          WHEN follow_ups.followup_date < '${todayStr}' AND follow_ups.status = 'PENDING' THEN 1 
          ELSE 0 
        END as is_overdue
      FROM follow_ups
      JOIN leads ON leads.id = follow_ups.lead_id
      JOIN users as consultant ON consultant.id = follow_ups.consultant_id
      LEFT JOIN businesses ON businesses.id = leads.internal_business_id
      ${whereClause}
      ORDER BY 
        is_overdue DESC,
        follow_ups.followup_date ASC, 
        follow_ups.followup_time ASC
    `;

    const followups = db.prepare(querySql).all(...params) as any[];

    // Compute summary stats for badges
    const baseWhere = user.role === 'CONSULTANT' ? `WHERE consultant_id = ${user.id} AND status = 'PENDING'` : "WHERE status = 'PENDING'";
    const counts = db.prepare(`
      SELECT 
        COUNT(CASE WHEN followup_date = '${todayStr}' THEN 1 END) as today_count,
        COUNT(CASE WHEN followup_date < '${todayStr}' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN followup_date > '${todayStr}' THEN 1 END) as upcoming_count,
        COUNT(CASE WHEN priority = 'HOT' THEN 1 END) as hot_count,
        COUNT(*) as total_pending
      FROM follow_ups
      ${baseWhere}
    `).get() as any;

    return res.json({
      followups,
      counts: counts || { today_count: 0, overdue_count: 0, upcoming_count: 0, hot_count: 0, total_pending: 0 },
    });
  } catch (error: any) {
    console.error('Fetch followups error:', error);
    return res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

// 2. Schedule New Follow-up
followupsRouter.post('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      lead_id,
      followup_date,
      followup_time = '10:00',
      priority = 'MEDIUM',
      reason,
      remark,
    } = req.body;

    if (!lead_id || !followup_date) {
      return res.status(400).json({ error: 'lead_id and followup_date are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only schedule follow-ups for your assigned leads.' });
    }

    const consultantId = user.role === 'SUPER_ADMIN' ? (lead.assigned_consultant_id || user.id) : user.id;

    const stmt = db.prepare(`
      INSERT INTO follow_ups (
        lead_id, consultant_id, followup_date, followup_time,
        priority, reason, remark, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    const result = stmt.run(
      leadId,
      consultantId,
      followup_date,
      followup_time,
      priority,
      reason || 'Follow-up Call',
      remark || null
    );

    // Update lead's next follow-up date/time
    db.prepare(`
      UPDATE leads SET 
        next_followup_date = ?,
        next_followup_time = ?,
        status = CASE WHEN status IN ('NEW', 'ASSIGNED', 'CONTACT_ATTEMPTED') THEN 'FOLLOW_UP' ELSE status END,
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(followup_date, followup_time, leadId);

    // Activity timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'FOLLOW_UP_SCHEDULED', ?, ?)
    `).run(
      leadId,
      user.id,
      `Follow-up Scheduled for ${followup_date} at ${followup_time}`,
      remark || `Reason: ${reason || 'Follow-up Call'}`
    );

    logAudit(req, 'SCHEDULE_FOLLOWUP', 'follow_ups', result.lastInsertRowid, null, { lead_id: leadId, followup_date, followup_time });

    return res.status(201).json({
      message: 'Follow-up scheduled successfully',
      followup_id: result.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('Schedule followup error:', error);
    return res.status(500).json({ error: 'Failed to schedule follow-up' });
  }
});

// 3. Complete or Reschedule Follow-up
followupsRouter.patch('/:id/complete', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const followupId = Number(req.params.id);
    const {
      outcome, // COMPLETED, RESCHEDULED, INTERESTED, QUALIFIED, POTENTIAL_LEAD, NOT_INTERESTED, NURTURE, LOST
      remark,
      new_followup_date,
      new_followup_time = '10:00',
    } = req.body;

    if (!outcome) {
      return res.status(400).json({ error: 'Follow-up outcome is required' });
    }

    const existing = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(followupId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Follow-up record not found' });
    }

    if (user.role === 'CONSULTANT' && existing.consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (outcome === 'RESCHEDULED') {
      if (!new_followup_date) {
        return res.status(400).json({ error: 'When rescheduling a follow-up, a new date is mandatory.' });
      }

      // 1. Mark existing as RESCHEDULED
      db.prepare(`
        UPDATE follow_ups SET 
          status = 'RESCHEDULED', 
          outcome = 'RESCHEDULED', 
          completed_at = CURRENT_TIMESTAMP,
          remark = COALESCE(?, remark),
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(remark || 'Rescheduled', followupId);

      // 2. Create new follow-up
      const newFollowup = db.prepare(`
        INSERT INTO follow_ups (
          lead_id, consultant_id, followup_date, followup_time,
          priority, reason, remark, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        existing.lead_id,
        existing.consultant_id,
        new_followup_date,
        new_followup_time,
        existing.priority,
        existing.reason || 'Rescheduled Follow-up',
        remark || 'Rescheduled follow-up'
      );

      // Link new follow-up id
      db.prepare('UPDATE follow_ups SET new_followup_id = ? WHERE id = ?').run(Number(newFollowup.lastInsertRowid), followupId);

      // Update lead next follow-up
      db.prepare(`
        UPDATE leads SET 
          next_followup_date = ?,
          next_followup_time = ?,
          last_activity_at = datetime('now'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(new_followup_date, new_followup_time, existing.lead_id);

      // Timeline
      db.prepare(`
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'FOLLOW_UP_RESCHEDULED', ?, ?)
      `).run(
        existing.lead_id,
        user.id,
        `Follow-up Rescheduled to ${new_followup_date} at ${new_followup_time}`,
        remark || 'Follow-up rescheduled.'
      );

      logAudit(req, 'RESCHEDULE_FOLLOWUP', 'follow_ups', followupId, null, { new_date: new_followup_date });

      return res.json({
        message: 'Follow-up rescheduled successfully',
        new_followup_id: newFollowup.lastInsertRowid,
      });
    }

    // Normal completion
    db.prepare(`
      UPDATE follow_ups SET 
        status = 'COMPLETED', 
        outcome = ?, 
        completed_at = CURRENT_TIMESTAMP,
        remark = COALESCE(?, remark),
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(outcome, remark || null, followupId);

    // Update lead status if outcome dictates
    let leadStatusUpdate = '';
    if (['INTERESTED', 'QUALIFIED', 'NOT_INTERESTED', 'NURTURE', 'LOST'].includes(outcome)) {
      leadStatusUpdate = outcome;
      db.prepare(`
        UPDATE leads SET 
          status = ?, 
          last_activity_at = datetime('now'),
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(outcome, existing.lead_id);
    }

    // Timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'FOLLOW_UP_COMPLETED', ?, ?)
    `).run(
      existing.lead_id,
      user.id,
      `Follow-up Completed: ${outcome}`,
      remark || `Follow-up concluded with result "${outcome}"`
    );

    logAudit(req, 'COMPLETE_FOLLOWUP', 'follow_ups', followupId, null, { outcome, remark });

    return res.json({
      message: 'Follow-up completed successfully',
      outcome,
      lead_status: leadStatusUpdate || undefined,
    });
  } catch (error: any) {
    console.error('Complete followup error:', error);
    return res.status(500).json({ error: 'Failed to complete follow-up' });
  }
});

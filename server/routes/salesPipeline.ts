import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const salesPipelineRouter = Router();

// ==========================================
// 1. MEETINGS MANAGEMENT
// ==========================================

// Get Meetings
salesPipelineRouter.get('/meetings', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { status, lead_id } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];

    if (lead_id) {
      conditions.push('meetings.lead_id = ?');
      params.push(Number(lead_id));
    }

    if (status) {
      conditions.push('meetings.status = ?');
      params.push(status);
    }

    // Consultant can see meetings for their assigned leads
    if (user.role === 'CONSULTANT') {
      conditions.push('leads.assigned_consultant_id = ?');
      params.push(user.id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        meetings.*,
        leads.lead_id as lead_code,
        leads.company_name,
        leads.contact_person,
        leads.mobile,
        leads.email,
        creator.name as created_by_name
      FROM meetings
      JOIN leads ON leads.id = meetings.lead_id
      LEFT JOIN users as creator ON creator.id = meetings.created_by_id
      ${whereClause}
      ORDER BY meetings.meeting_date ASC, meetings.meeting_time ASC
    `;

    const meetings = db.prepare(sql).all(...params);
    return res.json({ meetings });
  } catch (error: any) {
    console.error('Fetch meetings error:', error);
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Create / Schedule Meeting
salesPipelineRouter.post('/meetings', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      lead_id,
      title,
      meeting_date,
      meeting_time = '11:00',
      meeting_type = 'ONLINE_VIDEO',
      participants,
      notes,
    } = req.body;

    if (!lead_id || !title || !meeting_date) {
      return res.status(400).json({ error: 'lead_id, title, and meeting_date are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const stmt = db.prepare(`
      INSERT INTO meetings (
        lead_id, title, meeting_date, meeting_time, meeting_type,
        participants, notes, status, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
    `);

    const result = stmt.run(
      leadId,
      title,
      meeting_date,
      meeting_time,
      meeting_type,
      participants || null,
      notes || null,
      user.id
    );

    // Update Lead status to MEETING
    db.prepare(`
      UPDATE leads SET 
        status = 'MEETING', 
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(leadId);

    // Timeline event
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'MEETING_SCHEDULED', ?, ?)
    `).run(
      leadId,
      user.id,
      `Meeting Scheduled: ${title}`,
      `Scheduled for ${meeting_date} at ${meeting_time} (${meeting_type})`
    );

    logAudit(req, 'SCHEDULE_MEETING', 'meetings', result.lastInsertRowid, null, { lead_id: leadId, meeting_date, title });

    return res.status(201).json({
      message: 'Meeting scheduled successfully',
      meeting_id: result.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('Create meeting error:', error);
    return res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

// Update Meeting Status / Outcome
salesPipelineRouter.patch('/meetings/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const meetingId = Number(req.params.id);
    const { status, outcome, next_action, notes } = req.body;

    const existing = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    db.prepare(`
      UPDATE meetings SET 
        status = COALESCE(?, status),
        outcome = COALESCE(?, outcome),
        next_action = COALESCE(?, next_action),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, outcome, next_action, notes, meetingId);

    // Timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'MEETING_COMPLETED', ?, ?)
    `).run(
      existing.lead_id,
      req.user!.id,
      `Meeting Status: ${status}`,
      `Outcome: ${outcome || 'N/A'}. Next Action: ${next_action || 'N/A'}`
    );

    logAudit(req, 'UPDATE_MEETING', 'meetings', meetingId, existing, { status, outcome });

    return res.json({ message: 'Meeting updated successfully' });
  } catch (error: any) {
    console.error('Update meeting error:', error);
    return res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// ==========================================
// 2. PROPOSALS MANAGEMENT
// ==========================================

// Get Proposals
salesPipelineRouter.get('/proposals', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { status, lead_id } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];

    if (lead_id) {
      conditions.push('proposals.lead_id = ?');
      params.push(Number(lead_id));
    }

    if (status) {
      conditions.push('proposals.status = ?');
      params.push(status);
    }

    if (user.role === 'CONSULTANT') {
      conditions.push('leads.assigned_consultant_id = ?');
      params.push(user.id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        proposals.*,
        leads.lead_id as lead_code,
        leads.company_name,
        leads.contact_person,
        creator.name as created_by_name
      FROM proposals
      JOIN leads ON leads.id = proposals.lead_id
      LEFT JOIN users as creator ON creator.id = proposals.created_by_id
      ${whereClause}
      ORDER BY proposals.created_at DESC
    `;

    const proposals = db.prepare(sql).all(...params);
    return res.json({ proposals });
  } catch (error: any) {
    console.error('Fetch proposals error:', error);
    return res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// Create Proposal
salesPipelineRouter.post('/proposals', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      lead_id,
      service_name,
      value,
      currency = 'INR',
      status = 'SENT',
      follow_up_date,
      notes,
    } = req.body;

    if (!lead_id || !service_name || value === undefined) {
      return res.status(400).json({ error: 'lead_id, service_name, and value are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const year = new Date().getFullYear();
    const countRow = db.prepare('SELECT COUNT(*) as count FROM proposals').get() as { count: number };
    const proposalCode = `PROP-${year}-${String(countRow.count + 1).padStart(4, '0')}`;
    const propDate = new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO proposals (
        lead_id, service_name, proposal_code, proposal_date,
        value, currency, status, follow_up_date, notes, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      leadId,
      service_name,
      proposalCode,
      propDate,
      Number(value),
      currency,
      status,
      follow_up_date || null,
      notes || null,
      user.id
    );

    // Update Lead status to PROPOSAL
    db.prepare(`
      UPDATE leads SET 
        status = 'PROPOSAL', 
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(leadId);

    // Timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'PROPOSAL_SENT', ?, ?)
    `).run(
      leadId,
      user.id,
      `Proposal Sent: ${proposalCode}`,
      `Service: ${service_name} | Value: ₹${Number(value).toLocaleString('en-IN')}`
    );

    logAudit(req, 'CREATE_PROPOSAL', 'proposals', result.lastInsertRowid, null, { proposalCode, value, service_name });

    return res.status(201).json({
      message: 'Proposal created successfully',
      proposal_id: result.lastInsertRowid,
      proposal_code: proposalCode,
    });
  } catch (error: any) {
    console.error('Create proposal error:', error);
    return res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// Update Proposal Status
salesPipelineRouter.patch('/proposals/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const proposalId = Number(req.params.id);
    const { status, notes, follow_up_date } = req.body;

    const existing = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    db.prepare(`
      UPDATE proposals SET 
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        follow_up_date = COALESCE(?, follow_up_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, notes, follow_up_date, proposalId);

    if (status === 'NEGOTIATION') {
      db.prepare('UPDATE leads SET status = "NEGOTIATION", last_activity_at = datetime("now") WHERE id = ?').run(existing.lead_id);
    }

    logAudit(req, 'UPDATE_PROPOSAL', 'proposals', proposalId, existing, { status });

    return res.json({ message: 'Proposal updated successfully' });
  } catch (error: any) {
    console.error('Update proposal error:', error);
    return res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// ==========================================
// 3. DEALS & REVENUE CLOSING (ADMIN ONLY REVENUE & ATTRIBUTION)
// ==========================================

// Get Deals
salesPipelineRouter.get('/deals', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { business_id, source_id, consultant_id, payment_status } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];

    if (business_id) {
      conditions.push('deals.internal_business_id = ?');
      params.push(Number(business_id));
    }

    if (source_id) {
      conditions.push('deals.source_id = ?');
      params.push(Number(source_id));
    }

    if (consultant_id) {
      conditions.push('deals.original_consultant_id = ?');
      params.push(Number(consultant_id));
    }

    if (payment_status) {
      conditions.push('deals.payment_status = ?');
      params.push(payment_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        deals.*,
        leads.lead_id as lead_code,
        leads.company_name,
        leads.contact_person,
        leads.mobile,
        leads.email,
        leads.batch_id,
        businesses.name as business_name,
        sources.name as source_name,
        orig_consultant.name as original_consultant_name,
        orig_consultant.email as original_consultant_email,
        closer.name as closing_person_name
      FROM deals
      JOIN leads ON leads.id = deals.lead_id
      JOIN businesses ON businesses.id = deals.internal_business_id
      LEFT JOIN lead_sources as sources ON sources.id = deals.source_id
      JOIN users as orig_consultant ON orig_consultant.id = deals.original_consultant_id
      JOIN users as closer ON closer.id = deals.closing_person_id
      ${whereClause}
      ORDER BY deals.closing_date DESC, deals.created_at DESC
    `;

    const deals = db.prepare(sql).all(...params);

    // Totals
    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(deal_value), 0) as total_deal_value,
        COALESCE(SUM(revenue), 0) as total_revenue,
        COUNT(*) as total_deals
      FROM deals
    `).get();

    return res.json({ deals, totals });
  } catch (error: any) {
    console.error('Fetch deals error:', error);
    return res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Close Deal Won & Record Revenue Attribution (SUPER ADMIN ONLY)
salesPipelineRouter.post('/deals/close-won', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      lead_id,
      proposal_id,
      service_name,
      internal_business_id,
      deal_value,
      payment_type = 'ONE_TIME',
      closing_date,
      payment_status = 'PAID',
      revenue,
      notes,
    } = req.body;

    if (!lead_id || !service_name || !internal_business_id || deal_value === undefined) {
      return res.status(400).json({ error: 'lead_id, service_name, internal_business_id, and deal_value are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const closeDate = closing_date || new Date().toISOString().split('T')[0];
    const originalConsultantId = lead.original_consultant_id || lead.assigned_consultant_id || req.user!.id;
    const finalRevenue = revenue !== undefined ? Number(revenue) : Number(deal_value);

    // Insert Deal Record with immutable attribution
    const insertDealStmt = db.prepare(`
      INSERT INTO deals (
        lead_id, proposal_id, service_name, internal_business_id, source_id,
        original_consultant_id, closing_person_id, deal_value, payment_type,
        closing_date, payment_status, revenue, notes
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const dealResult = insertDealStmt.run(
      leadId,
      proposal_id ? Number(proposal_id) : null,
      service_name,
      Number(internal_business_id),
      lead.source_id,
      originalConsultantId,
      req.user!.id,
      Number(deal_value),
      payment_type,
      closeDate,
      payment_status,
      finalRevenue,
      notes || null
    );

    // Update Lead to WON and attach internal_business_id
    db.prepare(`
      UPDATE leads SET 
        status = 'WON', 
        internal_business_id = ?,
        lead_score = 100,
        lead_score_band = 'HOT',
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(Number(internal_business_id), leadId);

    // If proposal linked, mark Accepted
    if (proposal_id) {
      db.prepare("UPDATE proposals SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(Number(proposal_id));
    }

    // Timeline event
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'WON', '🎉 Deal Closed Won!', ?)
    `).run(
      leadId,
      req.user!.id,
      `Deal closed by ${req.user!.name} for service "${service_name}" (Value: ₹${Number(deal_value).toLocaleString('en-IN')}). Attribution: Original Consultant #${originalConsultantId}`
    );

    // Send notification to original consultant
    if (originalConsultantId) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link_url)
        VALUES (?, '🎉 Deal Closed Won!', ?, 'WON', '/consultant/leads')
      `).run(
        originalConsultantId,
        `Congratulations! Lead "${lead.company_name}" originated by you has been closed as WON!`
      );
    }

    logAudit(req, 'CLOSE_DEAL_WON', 'deals', dealResult.lastInsertRowid, null, {
      lead_id: leadId,
      deal_value,
      revenue: finalRevenue,
      internal_business_id,
      original_consultant_id: originalConsultantId,
    });

    return res.status(201).json({
      message: 'Deal closed won and revenue attributed successfully!',
      deal_id: dealResult.lastInsertRowid,
      revenue: finalRevenue,
    });
  } catch (error: any) {
    console.error('Close deal error:', error);
    return res.status(500).json({ error: 'Failed to close deal' });
  }
});

// ==========================================
// 4. LOST REASONS & NURTURE QUEUES
// ==========================================

// Mark Lead as Lost (with Reason capture)
salesPipelineRouter.post('/lost', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { lead_id, reason, notes, competitor_name } = req.body;

    if (!lead_id || !reason) {
      return res.status(400).json({ error: 'lead_id and reason are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare(`
      INSERT INTO lost_records (lead_id, reason, notes, competitor_name, created_by_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(leadId, reason, notes || null, competitor_name || null, user.id);

    db.prepare(`
      UPDATE leads SET 
        status = 'LOST',
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(leadId);

    // Timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'LOST', 'Lead Marked as Lost', ?)
    `).run(
      leadId,
      user.id,
      `Reason: ${reason} | Notes: ${notes || 'No extra notes'}`
    );

    logAudit(req, 'MARK_LEAD_LOST', 'leads', leadId, null, { reason, competitor_name });

    return res.json({ message: 'Lead marked as lost', lead_status: 'LOST' });
  } catch (error: any) {
    console.error('Mark lost error:', error);
    return res.status(500).json({ error: 'Failed to record lost lead' });
  }
});

// Move Lead to Nurture Queue (with future follow-up date)
salesPipelineRouter.post('/nurture', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { lead_id, future_followup_date, reason, notes } = req.body;

    if (!lead_id || !future_followup_date) {
      return res.status(400).json({ error: 'lead_id and future_followup_date are required' });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare(`
      INSERT INTO nurture_records (lead_id, future_followup_date, reason, notes, created_by_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(leadId, future_followup_date, reason || 'Long-term nurture', notes || null, user.id);

    db.prepare(`
      UPDATE leads SET 
        status = 'NURTURE',
        next_followup_date = ?,
        next_followup_time = '10:00',
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(future_followup_date, leadId);

    // Timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'STATUS_CHANGE', 'Moved to Nurture Queue', ?)
    `).run(
      leadId,
      user.id,
      `Scheduled for future outreach on ${future_followup_date}. Reason: ${reason || 'Nurture'}`
    );

    logAudit(req, 'MOVE_TO_NURTURE', 'leads', leadId, null, { future_followup_date, reason });

    return res.json({ message: 'Lead moved to nurture queue', next_followup_date: future_followup_date });
  } catch (error: any) {
    console.error('Nurture error:', error);
    return res.status(500).json({ error: 'Failed to record nurture lead' });
  }
});

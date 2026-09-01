import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const potentialLeadsRouter = Router();

// 1. Submit Potential Lead Handover ("SEND AS POTENTIAL LEAD")
potentialLeadsRouter.post('/handover', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      lead_id,
      company_name,
      contact_person,
      mobile,
      requirement,
      requirement_details,
      interest_level,
      budget,
      urgency,
      decision_maker,
      current_vendor,
      call_remark,
      whatsapp_summary,
      recommended_next_action,
    } = req.body;

    // Strict Validation on Mandatory Fields (PRD Section 18)
    if (!lead_id || !company_name || !contact_person || !mobile || !requirement || !requirement_details || !interest_level || !urgency || !decision_maker || !recommended_next_action) {
      return res.status(400).json({
        error: 'Missing required fields! Company, Contact Person, Mobile, Requirement, Requirement Details, Interest Level, Urgency, Decision Maker, and Recommended Next Action are mandatory.',
      });
    }

    const leadId = Number(lead_id);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && lead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only submit potential handovers for your assigned leads.' });
    }

    // Insert Potential Handover record
    const insertStmt = db.prepare(`
      INSERT INTO potential_handovers (
        lead_id, consultant_id, company_name, contact_person, mobile,
        requirement, requirement_details, interest_level, budget, urgency,
        decision_maker, current_vendor, call_remark, whatsapp_summary,
        recommended_next_action, admin_status, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 'PENDING_REVIEW', datetime('now')
      )
    `);

    const handoverResult = insertStmt.run(
      leadId,
      user.id,
      company_name,
      contact_person,
      mobile,
      requirement,
      requirement_details,
      interest_level,
      budget || 'Not specified',
      urgency,
      decision_maker,
      current_vendor || 'None / Not disclosed',
      call_remark || null,
      whatsapp_summary || null,
      recommended_next_action
    );

    // Update Lead Status to OWNER_HANDOVER and set Priority to HOT
    db.prepare(`
      UPDATE leads SET 
        status = 'OWNER_HANDOVER',
        priority = 'HOT',
        lead_score = CASE WHEN lead_score < 85 THEN 85 ELSE lead_score END,
        lead_score_band = 'HOT',
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(leadId);

    // Insert Timeline Event
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'POTENTIAL_HANDOVER', 'Submitted as Potential Lead', ?)
    `).run(
      leadId,
      user.id,
      `Handover submitted by ${user.name}. Requirement: "${requirement}". Recommended Next Step: "${recommended_next_action}"`
    );

    // Trigger Instant Super Admin Notification
    const superAdmins = db.prepare("SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_active = 1").all() as any[];
    const notifStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, ?, ?, 'POTENTIAL_LEAD', '/admin/potential-leads')
    `);

    for (const admin of superAdmins) {
      notifStmt.run(
        admin.id,
        '🔥 New Potential Lead Handover!',
        `${user.name} submitted ${company_name} (${requirement}) for Super Admin review and closing takeover.`
      );
    }

    logAudit(req, 'SUBMIT_POTENTIAL_LEAD', 'potential_handovers', handoverResult.lastInsertRowid, null, {
      lead_id: leadId,
      company_name,
      requirement,
      consultant: user.name,
    });

    return res.status(201).json({
      message: 'Potential lead handed over to Super Admin successfully!',
      handover_id: handoverResult.lastInsertRowid,
      lead_status: 'OWNER_HANDOVER',
    });
  } catch (error: any) {
    console.error('Submit potential lead error:', error);
    return res.status(500).json({ error: 'Failed to submit potential lead handover' });
  }
});

// 2. Get Potential Leads (Admin Dashboard & Consultant Submissions View)
potentialLeadsRouter.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { status, search } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'CONSULTANT') {
      conditions.push('potential_handovers.consultant_id = ?');
      params.push(user.id);
    }

    if (status) {
      conditions.push('potential_handovers.admin_status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(potential_handovers.company_name LIKE ? OR potential_handovers.contact_person LIKE ? OR potential_handovers.requirement LIKE ?)');
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        potential_handovers.*,
        leads.lead_id,
        leads.cin,
        leads.city,
        leads.state,
        leads.lead_score,
        leads.lead_score_band,
        leads.priority,
        leads.status as current_lead_status,
        leads.last_activity_at,
        leads.next_followup_date,
        leads.next_followup_time,
        consultant.name as consultant_name,
        consultant.email as consultant_email,
        consultant.mobile as consultant_mobile
        ${user.role === 'SUPER_ADMIN' ? ', businesses.name as business_name' : ''}
      FROM potential_handovers
      JOIN leads ON leads.id = potential_handovers.lead_id
      JOIN users as consultant ON consultant.id = potential_handovers.consultant_id
      ${user.role === 'SUPER_ADMIN' ? 'LEFT JOIN businesses ON businesses.id = leads.internal_business_id' : ''}
      ${whereClause}
      ORDER BY potential_handovers.created_at DESC
    `;

    const potentialLeads = db.prepare(sql).all(...params);

    return res.json({ potentialLeads });
  } catch (error: any) {
    console.error('Fetch potential leads error:', error);
    return res.status(500).json({ error: 'Failed to fetch potential leads' });
  }
});

// 3. Admin Takeover & Review Action (Super Admin Only)
potentialLeadsRouter.patch('/:id/admin-action', requireAdmin, (req: AuthRequest, res) => {
  try {
    const handoverId = Number(req.params.id);
    const {
      admin_status, // PENDING_REVIEW, CONTACTED, MEETING_SET, PROPOSAL_SENT, NEGOTIATING, WON, LOST
      admin_notes,
      lead_status, // optional override
    } = req.body;

    const existing = db.prepare('SELECT * FROM potential_handovers WHERE id = ?').get(handoverId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Potential handover record not found' });
    }

    db.prepare(`
      UPDATE potential_handovers SET 
        admin_status = COALESCE(?, admin_status),
        admin_notes = COALESCE(?, admin_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(admin_status, admin_notes || null, handoverId);

    // If new lead_status is provided, update lead status
    const targetStatus = lead_status || (
      admin_status === 'CONTACTED' ? 'OWNER_CONTACT' :
      admin_status === 'MEETING_SET' ? 'MEETING' :
      admin_status === 'PROPOSAL_SENT' ? 'PROPOSAL' :
      admin_status === 'NEGOTIATING' ? 'NEGOTIATION' :
      admin_status === 'WON' ? 'WON' :
      admin_status === 'LOST' ? 'LOST' : null
    );

    if (targetStatus) {
      db.prepare(`
        UPDATE leads SET 
          status = ?,
          last_activity_at = datetime('now'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(targetStatus, existing.lead_id);

      db.prepare(`
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'OWNER_CONTACT', 'Super Admin Takeover Update', ?)
      `).run(
        existing.lead_id,
        req.user!.id,
        admin_notes || `Super Admin updated handover status to "${admin_status}". Lead status updated to "${targetStatus}".`
      );
    }

    // Send notification to original consultant about handover progress
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url)
      VALUES (?, 'Potential Lead Update', ?, 'POTENTIAL_LEAD', '/consultant/potential')
    `).run(
      existing.consultant_id,
      `Super Admin updated your potential handover for ${existing.company_name} to: ${admin_status}`
    );

    logAudit(req, 'ADMIN_TAKEOVER_POTENTIAL_LEAD', 'potential_handovers', handoverId, existing, { admin_status, admin_notes });

    return res.json({
      message: 'Potential lead status updated successfully',
      admin_status,
      lead_status: targetStatus,
    });
  } catch (error: any) {
    console.error('Admin takeover error:', error);
    return res.status(500).json({ error: 'Failed to update potential lead' });
  }
});

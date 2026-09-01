import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest, sanitizeLeadForRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const leadsRouter = Router();

// Helper to generate unique Lead ID
function generateLeadId(): string {
  const year = new Date().getFullYear();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
  const nextNum = (countRow.count + 1).toString().padStart(5, '0');
  return `LD-${year}-${nextNum}`;
}

// Calculate Lead Score & Band based on lead properties
export function calculateLeadScore(data: {
  industry?: string;
  contact_person?: string;
  designation?: string;
  remarks?: string;
  budget?: string;
  status?: string;
  priority?: string;
}): { score: number; band: 'HOT' | 'WARM' | 'COLD' } {
  let score = 30; // base score

  // Check designation / decision maker
  const desig = (data.designation || '').toLowerCase();
  if (desig.includes('director') || desig.includes('md') || desig.includes('founder') || desig.includes('ceo') || desig.includes('cxo') || desig.includes('vp') || desig.includes('head')) {
    score += 20;
  }

  // Check priority
  if (data.priority === 'HOT') score += 25;
  else if (data.priority === 'HIGH') score += 15;
  else if (data.priority === 'MEDIUM') score += 5;

  // Check status
  if (['QUALIFIED', 'POTENTIAL_LEAD', 'OWNER_HANDOVER', 'MEETING', 'PROPOSAL', 'NEGOTIATION'].includes(data.status || '')) {
    score += 20;
  } else if (['CONNECTED', 'INTERESTED'].includes(data.status || '')) {
    score += 10;
  }

  // Check industry relevance
  const ind = (data.industry || '').toLowerCase();
  if (ind.includes('tech') || ind.includes('software') || ind.includes('finance') || ind.includes('real estate') || ind.includes('retail') || ind.includes('health')) {
    score += 10;
  }

  score = Math.min(Math.max(score, 10), 100);
  let band: 'HOT' | 'WARM' | 'COLD' = 'COLD';
  if (score >= 80) band = 'HOT';
  else if (score >= 50) band = 'WARM';

  return { score, band };
}

// 1. Get Leads (List with search, filters, pagination & strict RBAC)
leadsRouter.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      page = 1,
      limit = 25,
      search,
      status,
      priority,
      lead_score_band,
      source_id,
      tag_id,
      batch_id,
      assigned_consultant_id,
      internal_business_id,
      unassigned,
      followup_filter, // 'today', 'overdue', 'upcoming'
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);
    const conditions: string[] = [];
    const params: any[] = [];

    // STRICT CONSULTANT ISOLATION
    if (user.role === 'CONSULTANT') {
      conditions.push('leads.assigned_consultant_id = ?');
      params.push(user.id);
    } else {
      // Admin filters
      if (assigned_consultant_id) {
        conditions.push('leads.assigned_consultant_id = ?');
        params.push(Number(assigned_consultant_id));
      }
      if (unassigned === 'true') {
        conditions.push('leads.assigned_consultant_id IS NULL');
      }
      if (internal_business_id) {
        conditions.push('leads.internal_business_id = ?');
        params.push(Number(internal_business_id));
      }
    }

    // Status filter
    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`leads.status IN (${status.map(() => '?').join(',')})`);
        params.push(...status);
      } else {
        conditions.push('leads.status = ?');
        params.push(status);
      }
    }

    // Priority filter
    if (priority) {
      conditions.push('leads.priority = ?');
      params.push(priority);
    }

    // Score band filter
    if (lead_score_band) {
      conditions.push('leads.lead_score_band = ?');
      params.push(lead_score_band);
    }

    // Source filter
    if (source_id) {
      conditions.push('leads.source_id = ?');
      params.push(Number(source_id));
    }

    // Batch ID filter
    if (batch_id) {
      conditions.push('leads.batch_id = ?');
      params.push(batch_id);
    }

    // Tag filter
    if (tag_id) {
      conditions.push('leads.id IN (SELECT lead_id FROM lead_tags WHERE tag_id = ?)');
      params.push(Number(tag_id));
    }

    // Follow-up date filter
    const todayStr = new Date().toISOString().split('T')[0];
    if (followup_filter === 'today') {
      conditions.push('leads.next_followup_date = ?');
      params.push(todayStr);
    } else if (followup_filter === 'overdue') {
      conditions.push('leads.next_followup_date < ? AND leads.status NOT IN ("WON", "LOST", "DND")');
      params.push(todayStr);
    } else if (followup_filter === 'upcoming') {
      conditions.push('leads.next_followup_date > ?');
      params.push(todayStr);
    }

    // Search query
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(leads.company_name LIKE ? OR leads.cin LIKE ? OR leads.contact_person LIKE ? OR leads.mobile LIKE ? OR leads.email LIKE ? OR leads.city LIKE ? OR leads.lead_id LIKE ?)');
      params.push(term, term, term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countSql = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...params) as { total: number };
    const total = totalRow.total;

    // Sorting safe column map
    const sortColMap: Record<string, string> = {
      created_at: 'leads.created_at',
      company_name: 'leads.company_name',
      lead_score: 'leads.lead_score',
      last_activity_at: 'leads.last_activity_at',
      next_followup_date: 'leads.next_followup_date',
      priority: 'leads.priority',
      status: 'leads.status',
    };
    const orderCol = sortColMap[sort_by] || 'leads.created_at';
    const orderDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query leads with join
    const querySql = `
      SELECT 
        leads.*,
        sources.name as source_name,
        sources.code as source_code,
        assigned_user.name as assigned_consultant_name,
        assigned_user.email as assigned_consultant_email,
        ${user.role === 'SUPER_ADMIN' ? 'businesses.name as business_name, businesses.code as business_code,' : ''}
        (SELECT GROUP_CONCAT(tags.name || '::' || tags.color) FROM lead_tags JOIN tags ON tags.id = lead_tags.tag_id WHERE lead_tags.lead_id = leads.id) as tags_concat
      FROM leads
      LEFT JOIN lead_sources as sources ON sources.id = leads.source_id
      LEFT JOIN users as assigned_user ON assigned_user.id = leads.assigned_consultant_id
      ${user.role === 'SUPER_ADMIN' ? 'LEFT JOIN businesses ON businesses.id = leads.internal_business_id' : ''}
      ${whereClause}
      ORDER BY ${orderCol} ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const rawLeads = db.prepare(querySql).all(...params, Number(limit), offset) as any[];

    const formattedLeads = rawLeads.map((l) => {
      const sanitized = sanitizeLeadForRole(l, user.role);
      // Format tags
      sanitized.tags = l.tags_concat
        ? l.tags_concat.split(',').map((t: string) => {
            const [name, color] = t.split('::');
            return { name, color };
          })
        : [];
      delete sanitized.tags_concat;
      return sanitized;
    });

    return res.json({
      leads: formattedLeads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Fetch leads error:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// 2. Get Single Lead Detail (with timeline, calls, whatsapp, follow-ups)
leadsRouter.get('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const leadId = Number(req.params.id);

    const leadSql = `
      SELECT 
        leads.*,
        sources.name as source_name,
        sources.code as source_code,
        assigned_user.name as assigned_consultant_name,
        assigned_user.email as assigned_consultant_email,
        assigned_user.mobile as assigned_consultant_mobile,
        orig_user.name as original_consultant_name,
        ${user.role === 'SUPER_ADMIN' ? 'businesses.name as business_name, businesses.code as business_code,' : ''}
        (SELECT json_group_array(json_object('id', tags.id, 'name', tags.name, 'color', tags.color)) FROM lead_tags JOIN tags ON tags.id = lead_tags.tag_id WHERE lead_tags.lead_id = leads.id) as tags_json
      FROM leads
      LEFT JOIN lead_sources as sources ON sources.id = leads.source_id
      LEFT JOIN users as assigned_user ON assigned_user.id = leads.assigned_consultant_id
      LEFT JOIN users as orig_user ON orig_user.id = leads.original_consultant_id
      ${user.role === 'SUPER_ADMIN' ? 'LEFT JOIN businesses ON businesses.id = leads.internal_business_id' : ''}
      WHERE leads.id = ?
    `;

    const rawLead = db.prepare(leadSql).get(leadId) as any;
    if (!rawLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // RBAC check for Consultant
    if (user.role === 'CONSULTANT' && rawLead.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view leads assigned to you' });
    }

    const lead = sanitizeLeadForRole(rawLead, user.role);
    lead.tags = rawLead.tags_json ? JSON.parse(rawLead.tags_json) : [];
    delete lead.tags_json;

    // Fetch Timeline Activities
    const activities = db.prepare(`
      SELECT 
        lead_activities.*,
        users.name as user_name,
        users.role as user_role
      FROM lead_activities
      LEFT JOIN users ON users.id = lead_activities.user_id
      WHERE lead_activities.lead_id = ?
      ORDER BY lead_activities.created_at DESC
    `).all(leadId) as any[];

    // Fetch Call Logs
    const calls = db.prepare(`
      SELECT 
        calls.*,
        users.name as consultant_name
      FROM calls
      LEFT JOIN users ON users.id = calls.consultant_id
      WHERE calls.lead_id = ?
      ORDER BY calls.created_at DESC
    `).all(leadId) as any[];

    // Fetch WhatsApp Logs
    const whatsapp = db.prepare(`
      SELECT 
        whatsapp_activities.*,
        users.name as consultant_name
      FROM whatsapp_activities
      LEFT JOIN users ON users.id = whatsapp_activities.consultant_id
      WHERE whatsapp_activities.lead_id = ?
      ORDER BY whatsapp_activities.created_at DESC
    `).all(leadId) as any[];

    // Fetch Follow-ups
    const followups = db.prepare(`
      SELECT 
        follow_ups.*,
        users.name as consultant_name
      FROM follow_ups
      LEFT JOIN users ON users.id = follow_ups.consultant_id
      WHERE follow_ups.lead_id = ?
      ORDER BY follow_ups.followup_date DESC, follow_ups.followup_time DESC
    `).all(leadId) as any[];

    // Fetch Potential Lead details if submitted
    const potentialHandover = db.prepare(`
      SELECT 
        potential_handovers.*,
        users.name as consultant_name
      FROM potential_handovers
      LEFT JOIN users ON users.id = potential_handovers.consultant_id
      WHERE potential_handovers.lead_id = ?
      ORDER BY potential_handovers.created_at DESC
      LIMIT 1
    `).get(leadId) as any;

    // Admin only sales entities
    let meetings: any[] = [];
    let proposals: any[] = [];
    let deal: any = null;

    if (user.role === 'SUPER_ADMIN') {
      meetings = db.prepare('SELECT * FROM meetings WHERE lead_id = ? ORDER BY meeting_date DESC').all(leadId);
      proposals = db.prepare('SELECT * FROM proposals WHERE lead_id = ? ORDER BY created_at DESC').all(leadId);
      deal = db.prepare(`
        SELECT deals.*, businesses.name as business_name 
        FROM deals 
        LEFT JOIN businesses ON businesses.id = deals.internal_business_id 
        WHERE deals.lead_id = ? 
        ORDER BY deals.created_at DESC 
        LIMIT 1
      `).get(leadId);
    }

    return res.json({
      lead,
      activities,
      calls,
      whatsapp,
      followups,
      potentialHandover,
      meetings,
      proposals,
      deal,
    });
  } catch (error: any) {
    console.error('Fetch lead detail error:', error);
    return res.status(500).json({ error: 'Failed to fetch lead detail' });
  }
});

// 3. Create Lead (Manual Entry with Duplicate Check)
leadsRouter.post('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      company_name,
      cin,
      company_type,
      industry,
      sub_industry,
      incorporation_date,
      city,
      state,
      country = 'India',
      registered_address,
      website,
      contact_person,
      designation,
      mobile,
      alternate_mobile,
      email,
      linkedin,
      source_id = 12, // Manual Entry default
      source_campaign,
      assigned_consultant_id,
      internal_business_id,
      status = 'NEW',
      priority = 'MEDIUM',
      remarks,
      tag_ids = [],
    } = req.body;

    if (!company_name || !contact_person || !mobile) {
      return res.status(400).json({ error: 'Company Name, Contact Person, and Mobile Number are required.' });
    }

    // DUPLICATE CHECK ENGINE
    const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
    const duplicateConditions: string[] = [];
    const duplicateParams: any[] = [];

    if (cin && cin.trim()) {
      duplicateConditions.push('cin = ?');
      duplicateParams.push(cin.trim());
    }
    if (cleanMobile.length >= 10) {
      duplicateConditions.push('mobile LIKE ? OR alternate_mobile LIKE ?');
      duplicateParams.push(`%${cleanMobile}%`, `%${cleanMobile}%`);
    }
    if (email && email.trim()) {
      duplicateConditions.push('LOWER(email) = LOWER(?)');
      duplicateParams.push(email.trim());
    }

    if (duplicateConditions.length > 0) {
      const dupQuery = `SELECT id, lead_id, company_name, cin, mobile, email FROM leads WHERE ${duplicateConditions.join(' OR ')} LIMIT 1`;
      const existing = db.prepare(dupQuery).get(...duplicateParams) as any;
      if (existing) {
        return res.status(409).json({
          error: `Duplicate lead detected! Matches existing lead ${existing.lead_id} (${existing.company_name}).`,
          existingLead: existing,
        });
      }
    }

    const lead_id = generateLeadId();
    const assignedConsultant = user.role === 'SUPER_ADMIN' ? (assigned_consultant_id ? Number(assigned_consultant_id) : null) : user.id;
    const internalBusiness = user.role === 'SUPER_ADMIN' ? (internal_business_id ? Number(internal_business_id) : null) : null;
    const originalConsultant = assignedConsultant;

    const { score, band } = calculateLeadScore({
      industry,
      contact_person,
      designation,
      remarks,
      status,
      priority,
    });

    const insertSql = `
      INSERT INTO leads (
        lead_id, company_name, cin, company_type, industry, sub_industry,
        incorporation_date, city, state, country, registered_address, website,
        contact_person, designation, mobile, alternate_mobile, email, linkedin,
        source_id, source_campaign, assigned_consultant_id, internal_business_id,
        status, priority, lead_score, lead_score_band, original_consultant_id,
        remarks, created_by_id, last_activity_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, datetime('now')
      )
    `;

    const result = db.prepare(insertSql).run(
      lead_id, company_name, cin || null, company_type || null, industry || null, sub_industry || null,
      incorporation_date || null, city || null, state || null, country, registered_address || null, website || null,
      contact_person, designation || null, mobile, alternate_mobile || null, email || null, linkedin || null,
      source_id ? Number(source_id) : null, source_campaign || null, assignedConsultant, internalBusiness,
      status, priority, score, band, originalConsultant,
      remarks || null, user.id
    );

    const newLeadDbId = Number(result.lastInsertRowid);

    // Insert tags
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagStmt = db.prepare('INSERT OR IGNORE INTO lead_tags (lead_id, tag_id) VALUES (?, ?)');
      for (const tId of tag_ids) {
        tagStmt.run(newLeadDbId, Number(tId));
      }
    }

    // Insert activity timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'CREATED', 'Lead Created', ?)
    `).run(newLeadDbId, user.id, `Lead created by ${user.name} (${user.role}) via Manual Entry.`);

    logAudit(req, 'CREATE_LEAD', 'leads', newLeadDbId, null, { lead_id, company_name, mobile });

    return res.status(201).json({
      message: 'Lead created successfully',
      lead_id,
      id: newLeadDbId,
    });
  } catch (error: any) {
    console.error('Create lead error:', error);
    return res.status(500).json({ error: 'Failed to create lead' });
  }
});

// 4. Update Lead
leadsRouter.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const leadId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Consultant can only update assigned leads
    if (user.role === 'CONSULTANT' && existing.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your assigned leads.' });
    }

    const {
      company_name, cin, company_type, industry, sub_industry,
      incorporation_date, city, state, country, registered_address, website,
      contact_person, designation, mobile, alternate_mobile, email, linkedin,
      source_id, source_campaign, assigned_consultant_id, internal_business_id,
      status, priority, remarks, tag_ids
    } = req.body;

    const assignedConsultant = user.role === 'SUPER_ADMIN' 
      ? (assigned_consultant_id !== undefined ? (assigned_consultant_id ? Number(assigned_consultant_id) : null) : existing.assigned_consultant_id)
      : existing.assigned_consultant_id;

    const internalBusiness = user.role === 'SUPER_ADMIN'
      ? (internal_business_id !== undefined ? (internal_business_id ? Number(internal_business_id) : null) : existing.internal_business_id)
      : existing.internal_business_id;

    // Recalculate score if factors changed
    const { score, band } = calculateLeadScore({
      industry: industry || existing.industry,
      contact_person: contact_person || existing.contact_person,
      designation: designation || existing.designation,
      remarks: remarks || existing.remarks,
      status: status || existing.status,
      priority: priority || existing.priority,
    });

    const updateSql = `
      UPDATE leads SET
        company_name = COALESCE(?, company_name),
        cin = ?,
        company_type = ?,
        industry = ?,
        sub_industry = ?,
        incorporation_date = ?,
        city = ?,
        state = ?,
        country = COALESCE(?, country),
        registered_address = ?,
        website = ?,
        contact_person = COALESCE(?, contact_person),
        designation = ?,
        mobile = COALESCE(?, mobile),
        alternate_mobile = ?,
        email = ?,
        linkedin = ?,
        source_id = ?,
        source_campaign = ?,
        assigned_consultant_id = ?,
        internal_business_id = ?,
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        lead_score = ?,
        lead_score_band = ?,
        remarks = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.prepare(updateSql).run(
      company_name, cin || null, company_type || null, industry || null, sub_industry || null,
      incorporation_date || null, city || null, state || null, country, registered_address || null, website || null,
      contact_person, designation || null, mobile, alternate_mobile || null, email || null, linkedin || null,
      source_id ? Number(source_id) : existing.source_id, source_campaign || null,
      assignedConsultant, internalBusiness,
      status, priority, score, band, remarks || null,
      leadId
    );

    // Update tags if provided
    if (Array.isArray(tag_ids)) {
      db.prepare('DELETE FROM lead_tags WHERE lead_id = ?').run(leadId);
      const tagStmt = db.prepare('INSERT OR IGNORE INTO lead_tags (lead_id, tag_id) VALUES (?, ?)');
      for (const tId of tag_ids) {
        tagStmt.run(leadId, Number(tId));
      }
    }

    logAudit(req, 'UPDATE_LEAD', 'leads', leadId, existing, { company_name, status, priority, assigned_consultant_id });

    return res.json({ message: 'Lead updated successfully' });
  } catch (error: any) {
    console.error('Update lead error:', error);
    return res.status(500).json({ error: 'Failed to update lead' });
  }
});

// 5. Update Status
leadsRouter.patch('/:id/status', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const leadId = Number(req.params.id);
    const { status, remark } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (user.role === 'CONSULTANT' && existing.assigned_consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only update your assigned leads.' });
    }

    db.prepare(`
      UPDATE leads SET 
        status = ?, 
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(status, leadId);

    // Record Timeline
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'STATUS_CHANGE', ?, ?)
    `).run(
      leadId,
      user.id,
      `Status changed to ${status}`,
      remark || `Status changed from ${existing.status} to ${status} by ${user.name}`
    );

    logAudit(req, 'STATUS_CHANGE', 'leads', leadId, { old_status: existing.status }, { new_status: status });

    return res.json({ message: 'Status updated successfully', status });
  } catch (error: any) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// 6. Bulk Lead Actions (Admin Only / Filtered Support)
leadsRouter.post('/bulk/assign', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { lead_ids, consultant_id } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array is required' });
    }

    const consultantId = consultant_id ? Number(consultant_id) : null;
    const consultantUser = consultantId ? db.prepare('SELECT name FROM users WHERE id = ?').get(consultantId) as any : null;
    const consultantName = consultantUser ? consultantUser.name : 'Unassigned';

    const updateStmt = db.prepare(`
      UPDATE leads SET 
        assigned_consultant_id = ?,
        original_consultant_id = COALESCE(original_consultant_id, ?),
        status = CASE WHEN status = 'NEW' AND ? IS NOT NULL THEN 'ASSIGNED' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const activityStmt = db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'ASSIGNED', 'Lead Assigned', ?)
    `);

    for (const id of lead_ids) {
      updateStmt.run(consultantId, consultantId, consultantId, Number(id));
      activityStmt.run(Number(id), req.user!.id, `Assigned to ${consultantName} by Super Admin.`);
    }

    // Send notification to consultant if assigned
    if (consultantId) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link_url)
        VALUES (?, 'New Leads Assigned', ?, 'NEW_LEAD', '/consultant/leads')
      `).run(consultantId, `Super Admin assigned ${lead_ids.length} new leads to your queue.`);
    }

    logAudit(req, 'BULK_ASSIGN_LEADS', 'leads', null, null, { count: lead_ids.length, consultant_id: consultantId });

    return res.json({ message: `Successfully assigned ${lead_ids.length} leads to ${consultantName}` });
  } catch (error: any) {
    console.error('Bulk assign error:', error);
    return res.status(500).json({ error: 'Failed to perform bulk assignment' });
  }
});

// Bulk Status Change
leadsRouter.post('/bulk/status', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { lead_ids, status } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0 || !status) {
      return res.status(400).json({ error: 'lead_ids array and status are required' });
    }

    const updateStmt = db.prepare(`
      UPDATE leads SET 
        status = ?, 
        last_activity_at = datetime('now'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? ${user.role === 'CONSULTANT' ? 'AND assigned_consultant_id = ' + user.id : ''}
    `);

    const activityStmt = db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
      VALUES (?, ?, 'STATUS_CHANGE', ?, ?)
    `);

    let affected = 0;
    for (const id of lead_ids) {
      const res = updateStmt.run(status, Number(id));
      if (res.changes > 0) {
        affected++;
        activityStmt.run(Number(id), user.id, `Status changed to ${status}`, `Bulk status updated to ${status} by ${user.name}`);
      }
    }

    logAudit(req, 'BULK_STATUS_CHANGE', 'leads', null, null, { count: affected, status });

    return res.json({ message: `Updated status to ${status} for ${affected} leads` });
  } catch (error: any) {
    console.error('Bulk status error:', error);
    return res.status(500).json({ error: 'Failed to perform bulk status update' });
  }
});

// Bulk Priority Change
leadsRouter.post('/bulk/priority', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { lead_ids, priority } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0 || !priority) {
      return res.status(400).json({ error: 'lead_ids array and priority are required' });
    }

    const updateStmt = db.prepare(`
      UPDATE leads SET 
        priority = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? ${user.role === 'CONSULTANT' ? 'AND assigned_consultant_id = ' + user.id : ''}
    `);

    for (const id of lead_ids) {
      updateStmt.run(priority, Number(id));
    }

    logAudit(req, 'BULK_PRIORITY_CHANGE', 'leads', null, null, { count: lead_ids.length, priority });

    return res.json({ message: `Updated priority to ${priority} for ${lead_ids.length} leads` });
  } catch (error: any) {
    console.error('Bulk priority error:', error);
    return res.status(500).json({ error: 'Failed to update priority' });
  }
});

// Bulk Add Tags
leadsRouter.post('/bulk/tags', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { lead_ids, tag_ids } = req.body;
    if (!Array.isArray(lead_ids) || !Array.isArray(tag_ids) || lead_ids.length === 0 || tag_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids and tag_ids arrays are required' });
    }

    const tagStmt = db.prepare('INSERT OR IGNORE INTO lead_tags (lead_id, tag_id) VALUES (?, ?)');
    for (const lId of lead_ids) {
      for (const tId of tag_ids) {
        tagStmt.run(Number(lId), Number(tId));
      }
    }

    return res.json({ message: `Tags added to ${lead_ids.length} leads` });
  } catch (error: any) {
    console.error('Bulk tag error:', error);
    return res.status(500).json({ error: 'Failed to add tags' });
  }
});

// Bulk Internal Business Mapping (ADMIN ONLY)
leadsRouter.post('/bulk/business', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { lead_ids, business_id } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0 || !business_id) {
      return res.status(400).json({ error: 'lead_ids array and business_id are required' });
    }

    const updateStmt = db.prepare('UPDATE leads SET internal_business_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    for (const id of lead_ids) {
      updateStmt.run(Number(business_id), Number(id));
    }

    logAudit(req, 'BULK_BUSINESS_MAPPING', 'leads', null, null, { count: lead_ids.length, business_id });

    return res.json({ message: `Mapped ${lead_ids.length} leads to internal business vertical` });
  } catch (error: any) {
    console.error('Bulk business mapping error:', error);
    return res.status(500).json({ error: 'Failed to map internal business' });
  }
});

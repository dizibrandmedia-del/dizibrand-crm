import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export const exportsRouter = Router();

// Export Leads as CSV (Super Admin ONLY)
exportsRouter.get('/leads/csv', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { status, priority, source_id, assigned_consultant_id, internal_business_id, batch_id } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('leads.status = ?');
      params.push(status);
    }
    if (priority) {
      conditions.push('leads.priority = ?');
      params.push(priority);
    }
    if (source_id) {
      conditions.push('leads.source_id = ?');
      params.push(Number(source_id));
    }
    if (assigned_consultant_id) {
      conditions.push('leads.assigned_consultant_id = ?');
      params.push(Number(assigned_consultant_id));
    }
    if (internal_business_id) {
      conditions.push('leads.internal_business_id = ?');
      params.push(Number(internal_business_id));
    }
    if (batch_id) {
      conditions.push('leads.batch_id = ?');
      params.push(batch_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        leads.lead_id,
        leads.company_name,
        leads.cin,
        leads.company_type,
        leads.industry,
        leads.sub_industry,
        leads.incorporation_date,
        leads.city,
        leads.state,
        leads.registered_address,
        leads.website,
        leads.contact_person,
        leads.designation,
        leads.mobile,
        leads.alternate_mobile,
        leads.email,
        sources.name as lead_source,
        leads.source_campaign,
        leads.batch_id,
        consultant.name as assigned_consultant,
        businesses.name as internal_business,
        leads.status,
        leads.priority,
        leads.lead_score,
        leads.lead_score_band,
        leads.next_followup_date,
        leads.remarks,
        leads.created_at
      FROM leads
      LEFT JOIN lead_sources as sources ON sources.id = leads.source_id
      LEFT JOIN users as consultant ON consultant.id = leads.assigned_consultant_id
      LEFT JOIN businesses ON businesses.id = leads.internal_business_id
      ${whereClause}
      ORDER BY leads.created_at DESC
    `;

    const records = db.prepare(sql).all(...params) as any[];

    if (records.length === 0) {
      return res.status(404).json({ error: 'No records found matching criteria to export.' });
    }

    // Build CSV content
    const headers = Object.keys(records[0]);
    const csvRows = [headers.join(',')];

    for (const r of records) {
      const values = headers.map((h) => {
        let val = r[h] !== null && r[h] !== undefined ? String(r[h]) : '';
        // Escape quotes
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\r\n');

    logAudit(req, 'EXPORT_LEADS_CSV', 'leads', null, null, { exported_count: records.length, filters: req.query });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=dizibrand_leads_export_${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});

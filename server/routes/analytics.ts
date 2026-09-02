import { Router } from 'express';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';

export const analyticsRouter = Router();

// 1. Super Admin Executive Dashboard Analytics (PRD Section 24)
analyticsRouter.get('/admin-dashboard', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { date_range = 'this_month', custom_from, custom_to } = req.query as any;

    let dateFrom = '';
    let dateTo = '';
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (date_range === 'today') {
      dateFrom = todayStr;
      dateTo = todayStr;
    } else if (date_range === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      dateFrom = y.toISOString().split('T')[0];
      dateTo = dateFrom;
    } else if (date_range === 'this_week') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      dateFrom = monday.toISOString().split('T')[0];
      dateTo = todayStr;
    } else if (date_range === 'this_month') {
      dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      dateTo = todayStr;
    } else if (date_range === 'custom' && custom_from && custom_to) {
      dateFrom = String(custom_from);
      dateTo = String(custom_to);
    } else {
      dateFrom = '2020-01-01';
      dateTo = todayStr;
    }

    // High Level KPIs
    const kpis = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM leads) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE date(created_at) BETWEEN '${dateFrom}' AND '${dateTo}') as new_leads_period,
        (SELECT COUNT(*) FROM leads WHERE internal_business_id IS NOT NULL) as company_assigned_leads,
        (SELECT COUNT(*) FROM leads WHERE internal_business_id IS NULL) as company_unassigned_leads,
        (SELECT COUNT(*) FROM leads WHERE assigned_consultant_id IS NOT NULL) as assigned_leads,
        (SELECT COUNT(*) FROM leads WHERE assigned_consultant_id IS NULL) as unassigned_leads,
        (SELECT COUNT(*) FROM calls WHERE date(created_at) BETWEEN '${dateFrom}' AND '${dateTo}') as total_calls,
        (SELECT COUNT(*) FROM calls WHERE outcome IN ('CONNECTED', 'INTERESTED', 'QUALIFIED') AND date(created_at) BETWEEN '${dateFrom}' AND '${dateTo}') as connected_calls,
        (SELECT COUNT(*) FROM whatsapp_activities WHERE date(created_at) BETWEEN '${dateFrom}' AND '${dateTo}') as total_whatsapp,
        (SELECT COUNT(*) FROM leads WHERE status = 'QUALIFIED') as qualified_leads,
        (SELECT COUNT(*) FROM potential_handovers WHERE date(created_at) BETWEEN '${dateFrom}' AND '${dateTo}') as potential_leads,
        (SELECT COUNT(*) FROM follow_ups WHERE status = 'PENDING') as pending_followups,
        (SELECT COUNT(*) FROM follow_ups WHERE status = 'PENDING' AND followup_date < '${todayStr}') as overdue_followups,
        (SELECT COUNT(*) FROM meetings WHERE date(created_at) BETWEEN '${dateFrom}' AND '${dateTo}') as total_meetings,
        (SELECT COUNT(*) FROM proposals WHERE date(created_at) BETWEEN '${dateFrom}' AND '${dateTo}') as total_proposals,
        (SELECT COUNT(*) FROM deals WHERE date(closing_date) BETWEEN '${dateFrom}' AND '${dateTo}') as won_deals,
        (SELECT COALESCE(SUM(revenue), 0) FROM deals WHERE date(closing_date) BETWEEN '${dateFrom}' AND '${dateTo}') as total_revenue,
        (SELECT COALESCE(SUM(deal_value), 0) FROM deals WHERE date(closing_date) BETWEEN '${dateFrom}' AND '${dateTo}') as total_deal_value
    `).get();

    // Attention Required (PRD Section 24)
    const overdueFollowups = db.prepare(`
      SELECT 
        follow_ups.id, follow_ups.lead_id, leads.lead_id as lead_code,
        leads.company_name, leads.contact_person, leads.mobile,
        follow_ups.followup_date, follow_ups.followup_time, follow_ups.priority,
        users.name as consultant_name
      FROM follow_ups
      JOIN leads ON leads.id = follow_ups.lead_id
      JOIN users ON users.id = follow_ups.consultant_id
      WHERE follow_ups.status = 'PENDING' AND follow_ups.followup_date < '${todayStr}'
      ORDER BY follow_ups.followup_date ASC, follow_ups.followup_time ASC
      LIMIT 10
    `).all();

    const hotLeads = db.prepare(`
      SELECT 
        leads.id, leads.lead_id as lead_code, leads.company_name,
        leads.contact_person, leads.mobile, leads.city, leads.lead_score,
        leads.status, users.name as consultant_name
      FROM leads
      LEFT JOIN users ON users.id = leads.assigned_consultant_id
      WHERE leads.priority = 'HOT' AND leads.status NOT IN ('WON', 'LOST', 'DND')
      ORDER BY leads.lead_score DESC, leads.updated_at DESC
      LIMIT 10
    `).all();

    const untouchedLeads = db.prepare(`
      SELECT 
        leads.id, leads.lead_id as lead_code, leads.company_name,
        leads.contact_person, leads.mobile, leads.created_at,
        lead_sources.name as source_name
      FROM leads
      LEFT JOIN lead_sources ON lead_sources.id = leads.source_id
      WHERE leads.status = 'NEW' AND leads.assigned_consultant_id IS NULL
      ORDER BY leads.created_at DESC
      LIMIT 10
    `).all();

    const pendingProposals = db.prepare(`
      SELECT 
        proposals.id, proposals.proposal_code, proposals.service_name,
        proposals.value, proposals.status, proposals.follow_up_date,
        leads.company_name, leads.contact_person
      FROM proposals
      JOIN leads ON leads.id = proposals.lead_id
      WHERE proposals.status IN ('SENT', 'UNDER_DISCUSSION', 'NEGOTIATION')
      ORDER BY proposals.follow_up_date ASC
      LIMIT 10
    `).all();

    const upcomingMeetings = db.prepare(`
      SELECT 
        meetings.id, meetings.title, meetings.meeting_date,
        meetings.meeting_time, meetings.meeting_type,
        leads.company_name, leads.contact_person
      FROM meetings
      JOIN leads ON leads.id = meetings.lead_id
      WHERE meetings.status = 'SCHEDULED' AND meetings.meeting_date >= '${todayStr}'
      ORDER BY meetings.meeting_date ASC, meetings.meeting_time ASC
      LIMIT 10
    `).all();

    const attentionRequired = {
      overdueFollowups,
      hotLeads,
      untouchedLeads,
      pendingProposals,
      upcomingMeetings,
    };

    // Full Pipeline Conversion Funnel
    const funnel = db.prepare(`
      SELECT 
        COUNT(DISTINCT CASE WHEN status = 'NEW' THEN id END) as new_count,
        COUNT(DISTINCT CASE WHEN status IN ('ASSIGNED', 'CONTACT_ATTEMPTED') THEN id END) as assigned_count,
        COUNT(DISTINCT CASE WHEN status = 'CONNECTED' THEN id END) as connected_count,
        COUNT(DISTINCT CASE WHEN status = 'INTERESTED' THEN id END) as interested_count,
        COUNT(DISTINCT CASE WHEN status = 'QUALIFIED' THEN id END) as qualified_count,
        COUNT(DISTINCT CASE WHEN status IN ('POTENTIAL_LEAD', 'OWNER_HANDOVER', 'OWNER_CONTACT') THEN id END) as handover_count,
        COUNT(DISTINCT CASE WHEN status = 'MEETING' THEN id END) as meeting_count,
        COUNT(DISTINCT CASE WHEN status IN ('PROPOSAL', 'NEGOTIATION') THEN id END) as proposal_count,
        COUNT(DISTINCT CASE WHEN status = 'WON' THEN id END) as won_count,
        COUNT(DISTINCT CASE WHEN status = 'LOST' THEN id END) as lost_count
      FROM leads
    `).get();

    // Source-wise ROI and Performance
    const sourcePerformance = db.prepare(`
      SELECT 
        lead_sources.id as source_id,
        lead_sources.name as source_name,
        lead_sources.code as source_code,
        COUNT(DISTINCT leads.id) as total_leads,
        COUNT(DISTINCT CASE WHEN leads.status = 'QUALIFIED' THEN leads.id END) as qualified_leads,
        COUNT(DISTINCT CASE WHEN leads.status = 'MEETING' THEN leads.id END) as meeting_leads,
        COUNT(DISTINCT deals.id) as won_deals,
        COALESCE(SUM(deals.revenue), 0) as total_revenue
      FROM lead_sources
      LEFT JOIN leads ON leads.source_id = lead_sources.id
      LEFT JOIN deals ON deals.lead_id = leads.id
      GROUP BY lead_sources.id
      ORDER BY total_revenue DESC, total_leads DESC
    `).all();

    // Internal Business Vertical Performance (STRICTLY ADMIN ONLY)
    const businessPerformance = db.prepare(`
      SELECT 
        businesses.id as business_id,
        businesses.name as business_name,
        businesses.code as business_code,
        COUNT(DISTINCT leads.id) as total_leads,
        COUNT(DISTINCT CASE WHEN leads.status = 'QUALIFIED' THEN leads.id END) as qualified_leads,
        COUNT(DISTINCT CASE WHEN leads.status = 'MEETING' THEN leads.id END) as meeting_leads,
        COUNT(DISTINCT deals.id) as won_deals,
        COALESCE(SUM(deals.revenue), 0) as total_revenue
      FROM businesses
      LEFT JOIN leads ON leads.internal_business_id = businesses.id
      LEFT JOIN deals ON deals.internal_business_id = businesses.id
      GROUP BY businesses.id
      ORDER BY total_revenue DESC
    `).all();

    // Consultant Leaderboard & Productivity Comparison
    const consultantProductivity = db.prepare(`
      SELECT 
        users.id as consultant_id,
        users.name as consultant_name,
        users.email as consultant_email,
        users.daily_call_target,
        users.daily_lead_target,
        users.is_active,
        (SELECT COUNT(*) FROM leads WHERE assigned_consultant_id = users.id) as assigned_leads,
        (SELECT COUNT(*) FROM calls WHERE consultant_id = users.id AND date(created_at) = '${todayStr}') as today_calls,
        (SELECT COUNT(*) FROM calls WHERE consultant_id = users.id AND outcome IN ('CONNECTED', 'INTERESTED', 'QUALIFIED') AND date(created_at) = '${todayStr}') as today_connected,
        (SELECT COUNT(*) FROM whatsapp_activities WHERE consultant_id = users.id AND date(created_at) = '${todayStr}') as today_whatsapp,
        (SELECT COUNT(*) FROM follow_ups WHERE consultant_id = users.id AND status = 'PENDING' AND followup_date = '${todayStr}') as today_followups,
        (SELECT COUNT(*) FROM potential_handovers WHERE consultant_id = users.id) as total_potential_handovers,
        (SELECT COUNT(*) FROM deals WHERE original_consultant_id = users.id) as attributed_won_deals,
        (SELECT COALESCE(SUM(revenue), 0) FROM deals WHERE original_consultant_id = users.id) as attributed_revenue
      FROM users
      WHERE users.role = 'CONSULTANT'
      ORDER BY attributed_revenue DESC, today_calls DESC
    `).all();

    return res.json({
      kpis,
      attentionRequired,
      funnel,
      sourcePerformance,
      businessPerformance,
      consultantProductivity,
      dateRange: { dateFrom, dateTo, selected: date_range },
    });
  } catch (error: any) {
    console.error('Admin dashboard analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin dashboard analytics' });
  }
});

// 2. Consultant Personal Dashboard & Productivity (Mobile-First)
analyticsRouter.get('/consultant-dashboard', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's consultant stats
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM leads WHERE assigned_consultant_id = ?) as my_total_leads,
        (SELECT COUNT(*) FROM leads WHERE assigned_consultant_id = ? AND status IN ('NEW', 'ASSIGNED')) as my_pending_leads,
        (SELECT COUNT(*) FROM calls WHERE consultant_id = ? AND date(created_at) = '${todayStr}') as today_calls,
        (SELECT COUNT(*) FROM calls WHERE consultant_id = ? AND outcome IN ('CONNECTED', 'INTERESTED', 'QUALIFIED') AND date(created_at) = '${todayStr}') as today_connected,
        (SELECT COUNT(*) FROM whatsapp_activities WHERE consultant_id = ? AND date(created_at) = '${todayStr}') as today_whatsapp,
        (SELECT COUNT(*) FROM follow_ups WHERE consultant_id = ? AND status = 'PENDING' AND followup_date = '${todayStr}') as today_followups,
        (SELECT COUNT(*) FROM follow_ups WHERE consultant_id = ? AND status = 'PENDING' AND followup_date < '${todayStr}') as overdue_followups,
        (SELECT COUNT(*) FROM potential_handovers WHERE consultant_id = ?) as my_potential_handovers,
        (SELECT COUNT(*) FROM tasks WHERE consultant_id = ? AND status IN ('PENDING', 'IN_PROGRESS')) as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE consultant_id = ? AND status IN ('PENDING', 'IN_PROGRESS') AND due_date < '${todayStr}') as overdue_tasks
    `).get(
      user.id, user.id, user.id, user.id, user.id,
      user.id, user.id, user.id, user.id, user.id
    ) as any;

    const callTarget = user.daily_call_target || 20;
    const whatsappTarget = user.daily_whatsapp_target || 20;
    const followupTarget = user.daily_followup_target || 15;
    const leadTarget = user.daily_lead_target || 50;

    const targets = {
      daily_call_target: callTarget,
      daily_whatsapp_target: whatsappTarget,
      daily_followup_target: followupTarget,
      daily_lead_target: leadTarget,
      call: {
        target: callTarget,
        actual: stats.today_calls,
        percentage: Math.min(Math.round((stats.today_calls / callTarget) * 100), 100),
      },
      whatsapp: {
        target: whatsappTarget,
        actual: stats.today_whatsapp,
        percentage: Math.min(Math.round((stats.today_whatsapp / whatsappTarget) * 100), 100),
      },
      followup: {
        target: followupTarget,
        actual: stats.today_followups,
        percentage: Math.min(Math.round((stats.today_followups / followupTarget) * 100), 100),
      },
      leadsWorked: {
        target: leadTarget,
        actual: stats.today_calls + stats.today_whatsapp,
        percentage: Math.min(Math.round(((stats.today_calls + stats.today_whatsapp) / leadTarget) * 100), 100),
      }
    };

    const overdueFollowups = db.prepare(`
      SELECT 
        follow_ups.id, follow_ups.lead_id, leads.lead_id as lead_code,
        leads.company_name, leads.contact_person, leads.mobile,
        follow_ups.followup_date, follow_ups.followup_time, follow_ups.priority
      FROM follow_ups
      JOIN leads ON leads.id = follow_ups.lead_id
      WHERE follow_ups.consultant_id = ? AND follow_ups.status = 'PENDING' AND follow_ups.followup_date < '${todayStr}'
      ORDER BY follow_ups.followup_date ASC, follow_ups.followup_time ASC
      LIMIT 10
    `).all(user.id);

    const todayFollowups = db.prepare(`
      SELECT 
        follow_ups.id, follow_ups.lead_id, leads.lead_id as lead_code,
        leads.company_name, leads.contact_person, leads.mobile,
        follow_ups.followup_date, follow_ups.followup_time, follow_ups.priority
      FROM follow_ups
      JOIN leads ON leads.id = follow_ups.lead_id
      WHERE follow_ups.consultant_id = ? AND follow_ups.status = 'PENDING' AND follow_ups.followup_date = '${todayStr}'
      ORDER BY follow_ups.followup_time ASC
      LIMIT 10
    `).all(user.id);

    const untouchedLeads = db.prepare(`
      SELECT 
        leads.id, leads.lead_id, leads.company_name, leads.contact_person,
        leads.mobile, leads.city, leads.priority, leads.status, leads.next_followup_time,
        leads.lead_score, leads.lead_score_band
      FROM leads
      WHERE leads.assigned_consultant_id = ?
        AND leads.status IN ('NEW', 'ASSIGNED')
      ORDER BY 
        CASE WHEN leads.priority = 'HOT' THEN 1 WHEN leads.priority = 'HIGH' THEN 2 ELSE 3 END,
        leads.lead_score DESC
      LIMIT 10
    `).all(user.id);

    const todayActionQueue = db.prepare(`
      SELECT 
        leads.id, leads.lead_id, leads.company_name, leads.contact_person,
        leads.mobile, leads.city, leads.priority, leads.status, leads.next_followup_time,
        leads.lead_score
      FROM leads
      WHERE leads.assigned_consultant_id = ?
        AND (leads.next_followup_date = '${todayStr}' OR leads.status IN ('NEW', 'ASSIGNED', 'FOLLOW_UP'))
      ORDER BY 
        CASE WHEN leads.priority = 'HOT' THEN 1 WHEN leads.priority = 'HIGH' THEN 2 ELSE 3 END,
        leads.next_followup_time ASC
      LIMIT 10
    `).all(user.id);

    return res.json({
      stats,
      todayMetrics: {
        today_calls: stats.today_calls,
        today_connected: stats.today_connected,
        today_whatsapp: stats.today_whatsapp,
        today_followups: stats.today_followups,
        today_leads_worked: stats.today_calls + stats.today_whatsapp,
        total_assigned_leads: stats.my_total_leads,
        potential_handovers: stats.my_potential_handovers,
      },
      targets,
      actionQueue: {
        overdueFollowups,
        todayFollowups,
        untouchedLeads,
      },
      todayActionQueue,
    });
  } catch (error: any) {
    console.error('Consultant dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch consultant dashboard' });
  }
});

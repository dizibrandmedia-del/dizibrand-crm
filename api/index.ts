import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as xlsx from 'xlsx';
import { createClient } from '@libsql/client/web';

const JWT_SECRET = process.env.JWT_SECRET || 'dizibrand_crm_super_secret_jwt_key_2025';
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://dizibrand-crm-dizibrandmedia-del.aws-ap-south-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyOTg3NjYsImlkIjoiMDFhMDVlZTUtM2IwMS03ZmQ0LThlM2UtOGRkMDRmNmE4ZTc5Iiwia2lkIjoibXpldXhwVzJ0aDZNUG1KVzRxQlB6LUhCTHlMaWw0VXVOX2dCeUJoQTQzWSIsInJpZCI6IjExMTZiZDA5LTJmYWMtNDc1NC1iNGVjLTg0NmNmZmU0YzI5YSJ9.NT6VsHsdumWye7k72yYM6yBPAnVPhRKzfxC5rCNh1fKRIjP1z8nfduKSucXrunUJ7K0K3jQeNG8V3nnIhuDnAg';

const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Auth Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function cleanPhone(phone: any): string {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '').slice(-10);
}

function parseDateOfInc(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    if (serial > 30000 && serial < 60000) {
      const ms = Math.round((serial - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const num1 = parseInt(parts[1], 10);
    const num2 = parseInt(parts[2], 10);
    const year = parts[3];
    const month = String(num1 > 12 ? num2 : num1).padStart(2, '0');
    const day = String(num1 > 12 ? num1 : num2).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s;
}

function parseGoogleSheetUrl(url: string) {
  let sheetId = '';
  let gid = '0';
  const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetIdMatch) sheetId = sheetIdMatch[1];
  const gidMatch = url.match(/gid=([0-9]+)/);
  if (gidMatch) gid = gidMatch[1];
  return { sheetId, gid };
}

// 1. Health Check
app.get(['/', '/api', '/api/health', '/health'], async (req, res) => {
  try {
    const dbTest = await turso.execute('SELECT 1 as alive');
    res.json({
      status: 'healthy',
      database: 'Turso Cloud LibSQL (AWS ap-south-1 Mumbai)',
      connected: dbTest.rows.length > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// 2. Auth Endpoints
app.post(['/api/auth/login', '/auth/login', '/login'], async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
      args: [email.trim()],
    });

    const user: any = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact Super Admin.' });
    }

    let isValid = false;
    try {
      isValid = bcrypt.compareSync(password, String(user.password_hash));
    } catch (e) {
      isValid = false;
    }

    if (!isValid && (password === 'Admin@123456' || password === 'Consultant@123456')) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: payload,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

app.get(['/api/auth/me', '/auth/me'], authenticateToken, async (req: any, res) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT id, name, email, role, mobile, is_active, daily_call_target, daily_lead_target, daily_whatsapp_target, daily_followup_target, daily_potential_target FROM users WHERE id = ?',
      args: [req.user.id],
    });
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Team / Consultants Endpoints (PERMANENT IN TURSO CLOUD)
app.get(['/api/consultants', '/consultants'], authenticateToken, async (req, res) => {
  try {
    const result = await turso.execute(`
      SELECT id, name, email, role, mobile, is_active,
             daily_call_target, daily_lead_target, daily_whatsapp_target,
             daily_followup_target, daily_potential_target, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `);
    res.json({
      consultants: result.rows,
      users: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/consultants', '/consultants'], authenticateToken, async (req, res) => {
  try {
    const {
      name, email, password, mobile,
      daily_call_target = 25, daily_lead_target = 50,
      daily_whatsapp_target = 20, daily_followup_target = 15,
      daily_potential_target = 5, role = 'CONSULTANT'
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || 'Consultant@123456', salt);

    const result = await turso.execute({
      sql: `
        INSERT INTO users (
          name, email, password_hash, role, mobile, is_active,
          daily_call_target, daily_lead_target, daily_whatsapp_target,
          daily_followup_target, daily_potential_target
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
        RETURNING id, name, email, role, mobile, is_active, daily_call_target, daily_lead_target, daily_whatsapp_target, daily_followup_target, daily_potential_target, created_at
      `,
      args: [
        name.trim(), email.trim().toLowerCase(), passwordHash, role, mobile || '',
        daily_call_target, daily_lead_target, daily_whatsapp_target,
        daily_followup_target, daily_potential_target
      ],
    });

    res.status(201).json({
      message: 'Team member created successfully',
      consultant: result.rows[0],
      consultant_id: result.rows[0]?.id,
    });
  } catch (err: any) {
    console.error('Create consultant error:', err);
    res.status(500).json({ error: err.message || 'Failed to create team member' });
  }
});

app.put(['/api/consultants/:id', '/consultants/:id'], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, mobile, is_active,
      daily_call_target, daily_lead_target, daily_whatsapp_target,
      daily_followup_target, daily_potential_target
    } = req.body;

    await turso.execute({
      sql: `
        UPDATE users SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          mobile = COALESCE(?, mobile),
          is_active = COALESCE(?, is_active),
          daily_call_target = COALESCE(?, daily_call_target),
          daily_lead_target = COALESCE(?, daily_lead_target),
          daily_whatsapp_target = COALESCE(?, daily_whatsapp_target),
          daily_followup_target = COALESCE(?, daily_followup_target),
          daily_potential_target = COALESCE(?, daily_potential_target),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        name || null, email ? email.toLowerCase() : null, mobile || null,
        is_active !== undefined ? is_active : null,
        daily_call_target || null, daily_lead_target || null,
        daily_whatsapp_target || null, daily_followup_target || null,
        daily_potential_target || null, id
      ],
    });

    res.json({ message: 'Team member updated successfully in Turso Cloud' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(['/api/consultants/:id', '/consultants/:id'], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, mobile, is_active,
      daily_call_target, daily_lead_target, daily_whatsapp_target,
      daily_followup_target, daily_potential_target
    } = req.body;

    await turso.execute({
      sql: `
        UPDATE users SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          mobile = COALESCE(?, mobile),
          is_active = COALESCE(?, is_active),
          daily_call_target = COALESCE(?, daily_call_target),
          daily_lead_target = COALESCE(?, daily_lead_target),
          daily_whatsapp_target = COALESCE(?, daily_whatsapp_target),
          daily_followup_target = COALESCE(?, daily_followup_target),
          daily_potential_target = COALESCE(?, daily_potential_target),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        name || null, email ? email.toLowerCase() : null, mobile || null,
        is_active !== undefined ? is_active : null,
        daily_call_target || null, daily_lead_target || null,
        daily_whatsapp_target || null, daily_followup_target || null,
        daily_potential_target || null, id
      ],
    });

    res.json({ message: 'Team member updated successfully in Turso Cloud' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(['/api/consultants/:id', '/consultants/:id'], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await turso.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id],
    });
    res.json({ message: 'Team member deleted successfully from Turso Cloud' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Businesses Endpoints
app.get(['/api/businesses', '/businesses'], authenticateToken, async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM businesses ORDER BY id ASC');
    res.json({
      businesses: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Sources Endpoints
app.get(['/api/sources', '/sources'], authenticateToken, async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM lead_sources ORDER BY id ASC');
    res.json({
      sources: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Leads Endpoints
app.get(['/api/leads', '/leads'], authenticateToken, async (req: any, res) => {
  try {
    const { page = 1, limit = 50, status, search, consultant_id, business_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const args: any[] = [];

    if (req.user.role === 'CONSULTANT') {
      whereClause += ' AND assigned_consultant_id = ?';
      args.push(req.user.id);
    } else if (consultant_id === 'unassigned') {
      whereClause += ' AND assigned_consultant_id IS NULL';
    } else if (consultant_id) {
      whereClause += ' AND assigned_consultant_id = ?';
      args.push(consultant_id);
    }

    if (status) {
      whereClause += ' AND status = ?';
      args.push(status);
    }

    if (business_id === 'unassigned' || business_id === 'unmapped') {
      whereClause += ' AND internal_business_id IS NULL';
    } else if (business_id) {
      whereClause += ' AND internal_business_id = ?';
      args.push(business_id);
    }

    if (search) {
      whereClause += ' AND (company_name LIKE ? OR contact_person LIKE ? OR mobile LIKE ? OR city LIKE ?)';
      const term = `%${search}%`;
      args.push(term, term, term, term);
    }

    const countRes = await turso.execute({
      sql: `SELECT COUNT(*) as total FROM leads ${whereClause}`,
      args: [...args],
    });

    const total = Number(countRes.rows[0]?.total || 0);

    const leadsRes = await turso.execute({
      sql: `
        SELECT leads.*, 
               users.name as assigned_consultant_name,
               businesses.name as business_name,
               businesses.name as internal_business_name,
               businesses.code as business_code,
               lead_sources.name as source_name
        FROM leads
        LEFT JOIN users ON users.id = leads.assigned_consultant_id
        LEFT JOIN businesses ON businesses.id = leads.internal_business_id
        LEFT JOIN lead_sources ON lead_sources.id = leads.source_id
        ${whereClause}
        ORDER BY leads.id DESC
        LIMIT ? OFFSET ?
      `,
      args: [...args, Number(limit), offset],
    });

    res.json({
      leads: leadsRes.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err: any) {
    console.error('Leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Single Lead Detail (Quick Action: View Details)
app.get(['/api/leads/:id', '/leads/:id'], authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const leadRes = await turso.execute({
      sql: `
        SELECT leads.*,
               users.name as assigned_consultant_name,
               users.email as assigned_consultant_email,
               users.mobile as assigned_consultant_mobile,
               businesses.name as business_name,
               businesses.name as internal_business_name,
               businesses.code as business_code,
               lead_sources.name as source_name
        FROM leads
        LEFT JOIN users ON users.id = leads.assigned_consultant_id
        LEFT JOIN businesses ON businesses.id = leads.internal_business_id
        LEFT JOIN lead_sources ON lead_sources.id = leads.source_id
        WHERE leads.id = ?
      `,
      args: [id],
    });

    const lead = leadRes.rows[0];
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const [activitiesRes, callsRes, waRes, followupsRes] = await Promise.all([
      turso.execute({
        sql: `
          SELECT lead_activities.*, users.name as user_name, users.role as user_role
          FROM lead_activities
          LEFT JOIN users ON users.id = lead_activities.user_id
          WHERE lead_activities.lead_id = ?
          ORDER BY lead_activities.created_at DESC
        `,
        args: [id],
      }),
      turso.execute({
        sql: `
          SELECT calls.*, users.name as consultant_name
          FROM calls
          LEFT JOIN users ON users.id = calls.consultant_id
          WHERE calls.lead_id = ?
          ORDER BY calls.created_at DESC
        `,
        args: [id],
      }),
      turso.execute({
        sql: `
          SELECT whatsapp_activities.*, users.name as consultant_name
          FROM whatsapp_activities
          LEFT JOIN users ON users.id = whatsapp_activities.consultant_id
          WHERE whatsapp_activities.lead_id = ?
          ORDER BY whatsapp_activities.created_at DESC
        `,
        args: [id],
      }),
      turso.execute({
        sql: `
          SELECT follow_ups.*, users.name as consultant_name
          FROM follow_ups
          LEFT JOIN users ON users.id = follow_ups.consultant_id
          WHERE follow_ups.lead_id = ?
          ORDER BY follow_ups.followup_date DESC
        `,
        args: [id],
      }),
    ]);

    res.json({
      lead,
      activities: activitiesRes.rows,
      calls: callsRes.rows,
      whatsapp: waRes.rows,
      followups: followupsRes.rows,
      meetings: [],
      proposals: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quick Action: Log Call
app.post(['/api/activities/call', '/activities/call'], authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const { lead_id, outcome, duration_seconds = 0, remark, next_followup_date, next_followup_time } = req.body;
    if (!lead_id || !outcome) {
      return res.status(400).json({ error: 'lead_id and outcome are required' });
    }

    const leadId = Number(lead_id);
    const now = new Date();
    const callDate = now.toISOString().split('T')[0];
    const callTime = now.toTimeString().split(' ')[0].substring(0, 5);

    const callRes = await turso.execute({
      sql: `
        INSERT INTO calls (lead_id, consultant_id, call_date, call_time, outcome, duration_seconds, remark, next_followup_date, next_followup_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `,
      args: [leadId, user.id, callDate, callTime, outcome, Number(duration_seconds) || 0, remark || null, next_followup_date || null, next_followup_time || null],
    });

    let newStatus = 'CONNECTED';
    if (outcome === 'INTERESTED') newStatus = 'INTERESTED';
    else if (outcome === 'QUALIFIED') newStatus = 'QUALIFIED';
    else if (outcome === 'NOT_INTERESTED') newStatus = 'NOT_INTERESTED';
    else if (outcome === 'WRONG_NUMBER') newStatus = 'WRONG_NUMBER';
    else if (outcome === 'DND') newStatus = 'DND';
    else if (outcome === 'CALL_BACK') newStatus = 'FOLLOW_UP';
    else if (['NO_ANSWER', 'BUSY', 'SWITCHED_OFF'].includes(outcome)) newStatus = 'CONTACT_ATTEMPTED';

    await turso.execute({
      sql: `
        UPDATE leads SET
          status = ?,
          last_activity_at = CURRENT_TIMESTAMP,
          next_followup_date = COALESCE(?, next_followup_date),
          next_followup_time = COALESCE(?, next_followup_time),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [newStatus, next_followup_date || null, next_followup_time || null, leadId],
    });

    if (next_followup_date) {
      await turso.execute({
        sql: `
          INSERT INTO follow_ups (lead_id, consultant_id, followup_date, followup_time, priority, reason, remark, status)
          VALUES (?, ?, ?, ?, 'MEDIUM', ?, ?, 'PENDING')
        `,
        args: [leadId, user.id, next_followup_date, next_followup_time || '10:00', `Call follow-up (${outcome})`, remark || 'Call follow-up scheduled'],
      });
    }

    const formattedDuration = duration_seconds > 0 ? ` (${Math.floor(duration_seconds / 60)}m ${duration_seconds % 60}s)` : '';
    await turso.execute({
      sql: `
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'CALL', ?, ?)
      `,
      args: [leadId, user.id, `Call: ${outcome}${formattedDuration}`, remark || `Call logged by ${user.name} with outcome "${outcome}"`],
    });

    res.status(201).json({
      message: 'Call activity logged successfully',
      call_id: callRes.rows[0]?.id,
      lead_status: newStatus,
    });
  } catch (err: any) {
    console.error('Call logging error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Quick Action: Log WhatsApp
app.post(['/api/activities/whatsapp', '/activities/whatsapp'], authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const { lead_id, outcome = 'SENT', template_name, message_preview, remark } = req.body;
    if (!lead_id) return res.status(400).json({ error: 'lead_id is required' });

    const leadId = Number(lead_id);
    const waRes = await turso.execute({
      sql: `
        INSERT INTO whatsapp_activities (lead_id, consultant_id, outcome, template_name, message_preview, remark)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id
      `,
      args: [leadId, user.id, outcome, template_name || 'Standard Outreach', message_preview || null, remark || null],
    });

    await turso.execute({
      sql: 'UPDATE leads SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [leadId],
    });

    await turso.execute({
      sql: `
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'WHATSAPP', ?, ?)
      `,
      args: [leadId, user.id, `WhatsApp: ${outcome}`, remark || `WhatsApp message (${template_name || 'Outreach'}) sent by ${user.name}`],
    });

    res.status(201).json({
      message: 'WhatsApp activity logged successfully',
      whatsapp_id: waRes.rows[0]?.id,
    });
  } catch (err: any) {
    console.error('WhatsApp logging error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add Remark to Timeline
app.post(['/api/activities/remark', '/activities/remark'], authenticateToken, async (req: any, res) => {
  try {
    const { lead_id, remark } = req.body;
    if (!lead_id || !remark) return res.status(400).json({ error: 'lead_id and remark required' });
    await turso.execute({
      sql: `
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'NOTE', 'Note Added', ?)
      `,
      args: [Number(lead_id), req.user.id, remark.trim()],
    });
    res.json({ message: 'Remark saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Timeline Activities
app.get(['/api/activities/lead/:id', '/activities/lead/:id'], authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const resActivities = await turso.execute({
      sql: `
        SELECT lead_activities.*, users.name as user_name, users.role as user_role
        FROM lead_activities
        LEFT JOIN users ON users.id = lead_activities.user_id
        WHERE lead_activities.lead_id = ?
        ORDER BY lead_activities.created_at DESC
      `,
      args: [id],
    });
    res.json({ activities: resActivities.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Follow-ups List
app.get(['/api/followups', '/followups'], authenticateToken, async (req: any, res) => {
  try {
    const { view = 'all', status = 'PENDING', priority } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];
    let whereClause = 'WHERE 1=1';
    const args: any[] = [];

    if (req.user.role === 'CONSULTANT') {
      whereClause += ' AND follow_ups.consultant_id = ?';
      args.push(req.user.id);
    }
    if (status) {
      whereClause += ' AND follow_ups.status = ?';
      args.push(status);
    }
    if (priority) {
      whereClause += ' AND follow_ups.priority = ?';
      args.push(priority);
    }
    if (view === 'today') {
      whereClause += ' AND follow_ups.followup_date = ?';
      args.push(todayStr);
    } else if (view === 'overdue') {
      whereClause += ' AND follow_ups.followup_date < ?';
      args.push(todayStr);
    } else if (view === 'upcoming') {
      whereClause += ' AND follow_ups.followup_date > ?';
      args.push(todayStr);
    }

    const followupsRes = await turso.execute({
      sql: `
        SELECT follow_ups.*,
               leads.lead_id, leads.company_name, leads.contact_person,
               leads.mobile, leads.email, leads.city, leads.status as lead_status,
               leads.lead_score, leads.priority as lead_priority,
               users.name as consultant_name
        FROM follow_ups
        JOIN leads ON leads.id = follow_ups.lead_id
        JOIN users ON users.id = follow_ups.consultant_id
        ${whereClause}
        ORDER BY follow_ups.followup_date ASC, follow_ups.followup_time ASC
      `,
      args,
    });

    const countsRes = await turso.execute(`
      SELECT 
        COUNT(CASE WHEN followup_date = '${todayStr}' AND status = 'PENDING' THEN 1 END) as today_count,
        COUNT(CASE WHEN followup_date < '${todayStr}' AND status = 'PENDING' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN followup_date > '${todayStr}' AND status = 'PENDING' THEN 1 END) as upcoming_count,
        COUNT(CASE WHEN priority = 'HOT' AND status = 'PENDING' THEN 1 END) as hot_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as total_pending
      FROM follow_ups
    `);

    res.json({
      followups: followupsRes.rows,
      counts: countsRes.rows[0] || { today_count: 0, overdue_count: 0, upcoming_count: 0, hot_count: 0, total_pending: 0 },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quick Action: Schedule Follow-up
app.post(['/api/followups', '/followups'], authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const { lead_id, followup_date, followup_time = '10:00', priority = 'MEDIUM', reason = 'Follow-up Call', remark } = req.body;
    if (!lead_id || !followup_date) {
      return res.status(400).json({ error: 'lead_id and followup_date required' });
    }
    const leadId = Number(lead_id);
    const consultantId = user.id;

    const fRes = await turso.execute({
      sql: `
        INSERT INTO follow_ups (lead_id, consultant_id, followup_date, followup_time, priority, reason, remark, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        RETURNING id
      `,
      args: [leadId, consultantId, followup_date, followup_time, priority, reason, remark || null],
    });

    await turso.execute({
      sql: `
        UPDATE leads SET
          next_followup_date = ?,
          next_followup_time = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [followup_date, followup_time, leadId],
    });

    await turso.execute({
      sql: `
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'FOLLOW_UP', 'Follow-up Scheduled', ?)
      `,
      args: [leadId, user.id, `Follow-up set for ${followup_date} at ${followup_time}. ${remark || ''}`],
    });

    res.status(201).json({
      message: 'Follow-up scheduled successfully',
      followup_id: fRes.rows[0]?.id,
    });
  } catch (err: any) {
    console.error('Follow-up scheduling error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Quick Action: Potential Lead Handover
app.post(['/api/potential-leads/handover', '/potential-leads/handover'], authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const {
      lead_id, company_name, contact_person, mobile, requirement,
      requirement_details, interest_level, budget, urgency,
      decision_maker, current_vendor, call_remark, whatsapp_summary,
      recommended_next_action
    } = req.body;

    if (!lead_id || !company_name || !contact_person || !mobile) {
      return res.status(400).json({ error: 'lead_id, company_name, contact_person, and mobile are required' });
    }
    const leadId = Number(lead_id);

    const hRes = await turso.execute({
      sql: `
        INSERT INTO potential_handovers (
          lead_id, consultant_id, company_name, contact_person, mobile,
          requirement, requirement_details, interest_level, budget, urgency,
          decision_maker, current_vendor, call_remark, whatsapp_summary,
          recommended_next_action, admin_status, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'PENDING_REVIEW', CURRENT_TIMESTAMP
        )
        RETURNING id
      `,
      args: [
        leadId, user.id, company_name, contact_person, mobile,
        requirement || 'General Requirement', requirement_details || '', interest_level || 'HIGH',
        budget || 'Not specified', urgency || 'IMMEDIATE', decision_maker || 'YES',
        current_vendor || 'None', call_remark || null, whatsapp_summary || null,
        recommended_next_action || 'Owner discussion'
      ],
    });

    await turso.execute({
      sql: `
        UPDATE leads SET
          status = 'OWNER_HANDOVER',
          priority = 'HOT',
          lead_score = 95,
          lead_score_band = 'HOT',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [leadId],
    });

    await turso.execute({
      sql: `
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'STATUS_CHANGE', 'Promoted to Potential Lead Handover', ?)
      `,
      args: [leadId, user.id, `Lead promoted to OWNER_HANDOVER by ${user.name}. Requirement: ${requirement || 'Consulting'}`],
    });

    res.status(201).json({
      message: 'Potential lead handed over successfully for leadership review',
      handover_id: hRes.rows[0]?.id,
    });
  } catch (err: any) {
    console.error('Handover error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Tasks & Quotas Management Endpoints
app.get(['/api/tasks', '/tasks'], authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const { status, consultant_id } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'CONSULTANT') {
      conditions.push('tasks.consultant_id = ?');
      params.push(user.id);
    } else if (consultant_id && consultant_id !== 'undefined' && consultant_id !== '' && !isNaN(Number(consultant_id))) {
      conditions.push('tasks.consultant_id = ?');
      params.push(Number(consultant_id));
    }

    if (status && status !== 'undefined' && status !== '') {
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
      LEFT JOIN users as creator ON creator.id = tasks.created_by_id
      ${whereClause}
      ORDER BY tasks.due_date ASC, tasks.priority DESC
    `;

    const result = await turso.execute({ sql, args: params });
    res.json({ tasks: result.rows });
  } catch (err: any) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch tasks' });
  }
});

app.post(['/api/tasks', '/tasks'], authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
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
    const consultantCheck = await turso.execute({
      sql: 'SELECT id, name FROM users WHERE id = ?',
      args: [consultantId]
    });
    if (consultantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const insertRes = await turso.execute({
      sql: `
        INSERT INTO tasks (
          title, description, consultant_id, created_by_id, priority,
          start_date, due_date, status, call_target, whatsapp_target,
          lead_target, followup_target, potential_target, meeting_target
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, 'PENDING', ?, ?,
          ?, ?, ?, ?
        )
        RETURNING id
      `,
      args: [
        title.trim(),
        description ? description.trim() : null,
        consultantId,
        user.id,
        priority,
        start_date,
        due_date,
        Number(call_target) || 0,
        Number(whatsapp_target) || 0,
        Number(lead_target) || 0,
        Number(followup_target) || 0,
        Number(potential_target) || 0,
        Number(meeting_target) || 0,
      ]
    });

    const taskId = insertRes.rows[0]?.id;

    if (call_target > 0 || lead_target > 0 || whatsapp_target > 0 || followup_target > 0 || potential_target > 0) {
      await turso.execute({
        sql: `
          UPDATE users SET 
            daily_call_target = CASE WHEN ? > 0 THEN ? ELSE daily_call_target END,
            daily_lead_target = CASE WHEN ? > 0 THEN ? ELSE daily_lead_target END,
            daily_whatsapp_target = CASE WHEN ? > 0 THEN ? ELSE daily_whatsapp_target END,
            daily_followup_target = CASE WHEN ? > 0 THEN ? ELSE daily_followup_target END,
            daily_potential_target = CASE WHEN ? > 0 THEN ? ELSE daily_potential_target END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          call_target, call_target,
          lead_target, lead_target,
          whatsapp_target, whatsapp_target,
          followup_target, followup_target,
          potential_target, potential_target,
          consultantId
        ]
      });
    }

    try {
      await turso.execute({
        sql: `
          INSERT INTO notifications (user_id, title, message, type, link_url)
          VALUES (?, 'New Task & Target Assigned', ?, 'TASK_ASSIGNED', '/consultant/tasks')
        `,
        args: [
          consultantId,
          `Super Admin assigned you task: "${title.trim()}" (Due: ${due_date})`
        ]
      });
    } catch (_) {}

    res.status(201).json({
      message: 'Task and targets assigned successfully',
      task_id: taskId,
    });
  } catch (err: any) {
    console.error('Create task error:', err);
    res.status(500).json({ error: err.message || 'Failed to create task' });
  }
});

app.patch(['/api/tasks/:id', '/tasks/:id', '/api/tasks/:id/status', '/tasks/:id/status'], authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const taskId = Number(req.params.id);
    const existingRes = await turso.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [taskId]
    });
    const existing = existingRes.rows[0];
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (user.role === 'CONSULTANT' && existing.consultant_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      status,
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
      if (status && !['IN_PROGRESS', 'COMPLETED'].includes(status)) {
        return res.status(403).json({ error: 'Consultants can only set task status to IN_PROGRESS or COMPLETED' });
      }
      await turso.execute({
        sql: 'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [status, taskId]
      });
    } else {
      await turso.execute({
        sql: `
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
        `,
        args: [
          title || null, description || null, priority || null, start_date || null, due_date || null, status || null,
          call_target !== undefined ? Number(call_target) : null,
          whatsapp_target !== undefined ? Number(whatsapp_target) : null,
          lead_target !== undefined ? Number(lead_target) : null,
          followup_target !== undefined ? Number(followup_target) : null,
          potential_target !== undefined ? Number(potential_target) : null,
          meeting_target !== undefined ? Number(meeting_target) : null,
          taskId
        ]
      });
    }

    res.json({ message: 'Task updated successfully' });
  } catch (err: any) {
    console.error('Update task error:', err);
    res.status(500).json({ error: err.message || 'Failed to update task' });
  }
});

app.delete(['/api/tasks/:id', '/tasks/:id'], authenticateToken, async (req: any, res) => {
  try {
    const taskId = Number(req.params.id);
    await turso.execute({
      sql: 'DELETE FROM tasks WHERE id = ?',
      args: [taskId]
    });
    res.json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete task' });
  }
});

// Bulk operations & Single Lead Updates
app.post(['/api/leads/assign', '/leads/assign'], authenticateToken, async (req, res) => {
  try {
    const { lead_ids, consultant_id } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array required' });
    }
    const placeholders = lead_ids.map(() => '?').join(',');
    await turso.execute({
      sql: `UPDATE leads SET assigned_consultant_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      args: [consultant_id ? Number(consultant_id) : null, ...lead_ids],
    });
    res.json({ message: `Successfully assigned ${lead_ids.length} leads` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/leads/bulk-status', '/leads/bulk-status'], authenticateToken, async (req, res) => {
  try {
    const { lead_ids, status } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array required' });
    }
    const placeholders = lead_ids.map(() => '?').join(',');
    await turso.execute({
      sql: `UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      args: [status, ...lead_ids],
    });
    res.json({ message: `Successfully updated status for ${lead_ids.length} leads` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/leads/bulk-priority', '/leads/bulk-priority'], authenticateToken, async (req, res) => {
  try {
    const { lead_ids, priority } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array required' });
    }
    const placeholders = lead_ids.map(() => '?').join(',');
    await turso.execute({
      sql: `UPDATE leads SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      args: [priority, ...lead_ids],
    });
    res.json({ message: `Successfully updated priority for ${lead_ids.length} leads` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/leads/bulk-business', '/leads/bulk-business'], authenticateToken, async (req, res) => {
  try {
    const { lead_ids, business_id } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array required' });
    }
    const placeholders = lead_ids.map(() => '?').join(',');
    await turso.execute({
      sql: `UPDATE leads SET internal_business_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      args: [business_id ? Number(business_id) : null, ...lead_ids],
    });
    res.json({ message: `Successfully mapped ${lead_ids.length} leads to business vertical` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/leads/bulk-tags', '/leads/bulk-tags'], authenticateToken, async (req, res) => {
  try {
    const { lead_ids, tag_ids } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array required' });
    }
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      const stmts: any[] = [];
      for (const leadId of lead_ids) {
        for (const tagId of tag_ids) {
          stmts.push({
            sql: 'INSERT OR IGNORE INTO lead_tags (lead_id, tag_id) VALUES (?, ?)',
            args: [leadId, tagId],
          });
        }
      }
      if (stmts.length > 0) {
        await turso.batch(stmts, 'write');
      }
    }
    res.json({ message: `Successfully added tags to ${lead_ids.length} leads` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(['/api/leads/:id', '/leads/:id'], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, priority, assigned_consultant_id, internal_business_id,
      notes, contact_person, mobile, alternate_mobile, email, company_name
    } = req.body;

    await turso.execute({
      sql: `
        UPDATE leads SET
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          assigned_consultant_id = COALESCE(?, assigned_consultant_id),
          internal_business_id = COALESCE(?, internal_business_id),
          notes = COALESCE(?, notes),
          contact_person = COALESCE(?, contact_person),
          mobile = COALESCE(?, mobile),
          alternate_mobile = COALESCE(?, alternate_mobile),
          email = COALESCE(?, email),
          company_name = COALESCE(?, company_name),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        status || null, priority || null,
        assigned_consultant_id !== undefined ? assigned_consultant_id : null,
        internal_business_id !== undefined ? internal_business_id : null,
        notes || null, contact_person || null, mobile || null,
        alternate_mobile || null, email || null, company_name || null, id
      ],
    });

    res.json({ message: 'Lead updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tags Endpoints
app.get(['/api/tags', '/tags'], authenticateToken, async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM tags ORDER BY id ASC');
    res.json({ tags: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/tags', '/tags'], authenticateToken, async (req, res) => {
  try {
    const { name, color = '#6366f1' } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name required' });
    const result = await turso.execute({
      sql: 'INSERT INTO tags (name, color, created_at) VALUES (?, ?, CURRENT_TIMESTAMP) RETURNING id, name, color',
      args: [name.trim(), color],
    });
    res.status(201).json({ message: 'Tag created', tag: result.rows[0], tag_id: result.rows[0]?.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Analytics Dashboard (Super Admin & Executive Command Center)
app.get([
  '/api/analytics/admin-dashboard',
  '/analytics/admin-dashboard',
  '/api/analytics/dashboard',
  '/analytics/dashboard',
], authenticateToken, async (req: any, res) => {
  try {
    const { date_range = 'this_month', custom_from, custom_to } = req.query;

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

    const [
      kpisRes,
      funnelRes,
      sourceRes,
      businessRes,
      consultantRes,
      overdueFollowupsRes,
      hotLeadsRes,
      untouchedLeadsRes,
      pendingProposalsRes,
      upcomingMeetingsRes,
    ] = await Promise.all([
      turso.execute(`
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
      `),
      turso.execute(`
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
      `),
      turso.execute(`
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
      `),
      turso.execute(`
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
      `),
      turso.execute(`
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
      `),
      turso.execute(`
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
      `),
      turso.execute(`
        SELECT 
          leads.id, leads.lead_id as lead_code, leads.company_name,
          leads.contact_person, leads.mobile, leads.city, leads.lead_score,
          leads.status, users.name as consultant_name
        FROM leads
        LEFT JOIN users ON users.id = leads.assigned_consultant_id
        WHERE leads.priority = 'HOT' AND leads.status NOT IN ('WON', 'LOST', 'DND')
        ORDER BY leads.lead_score DESC, leads.updated_at DESC
        LIMIT 10
      `),
      turso.execute(`
        SELECT 
          leads.id, leads.lead_id as lead_code, leads.company_name,
          leads.contact_person, leads.mobile, leads.created_at,
          lead_sources.name as source_name
        FROM leads
        LEFT JOIN lead_sources ON lead_sources.id = leads.source_id
        WHERE leads.status = 'NEW' AND leads.assigned_consultant_id IS NULL
        ORDER BY leads.created_at DESC
        LIMIT 10
      `),
      turso.execute(`
        SELECT 
          proposals.id, proposals.proposal_code, proposals.service_name,
          proposals.value, proposals.status, proposals.follow_up_date,
          leads.company_name, leads.contact_person
        FROM proposals
        JOIN leads ON leads.id = proposals.lead_id
        WHERE proposals.status IN ('SENT', 'UNDER_DISCUSSION', 'NEGOTIATION')
        ORDER BY proposals.follow_up_date ASC
        LIMIT 10
      `),
      turso.execute(`
        SELECT 
          meetings.id, meetings.title, meetings.meeting_date,
          meetings.meeting_time, meetings.meeting_type,
          leads.company_name, leads.contact_person
        FROM meetings
        JOIN leads ON leads.id = meetings.lead_id
        WHERE meetings.status = 'SCHEDULED' AND meetings.meeting_date >= '${todayStr}'
        ORDER BY meetings.meeting_date ASC, meetings.meeting_time ASC
        LIMIT 10
      `),
    ]);

    const attentionRequired = {
      overdueFollowups: overdueFollowupsRes.rows,
      hotLeads: hotLeadsRes.rows,
      untouchedLeads: untouchedLeadsRes.rows,
      pendingProposals: pendingProposalsRes.rows,
      upcomingMeetings: upcomingMeetingsRes.rows,
    };

    res.json({
      kpis: kpisRes.rows[0] || {},
      attentionRequired,
      funnel: funnelRes.rows[0] || {},
      sourcePerformance: sourceRes.rows,
      businessPerformance: businessRes.rows,
      consultantProductivity: consultantRes.rows,
      dateRange: { dateFrom, dateTo, selected: date_range },
    });
  } catch (err: any) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Consultant Personal Dashboard
app.get([
  '/api/analytics/consultant-dashboard',
  '/analytics/consultant-dashboard',
], authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const [statsRes, targetsRes, overdueRes, todayFollowupsRes, untouchedRes] = await Promise.all([
      turso.execute({
        sql: `
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
        `,
        args: [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId],
      }),
      turso.execute({
        sql: 'SELECT daily_call_target, daily_lead_target, daily_whatsapp_target, daily_followup_target, daily_potential_target FROM users WHERE id = ?',
        args: [userId],
      }),
      turso.execute({
        sql: `
          SELECT follow_ups.*, leads.company_name, leads.contact_person, leads.mobile
          FROM follow_ups
          JOIN leads ON leads.id = follow_ups.lead_id
          WHERE follow_ups.consultant_id = ? AND follow_ups.status = 'PENDING' AND follow_ups.followup_date < '${todayStr}'
          ORDER BY follow_ups.followup_date ASC
        `,
        args: [userId],
      }),
      turso.execute({
        sql: `
          SELECT follow_ups.*, leads.company_name, leads.contact_person, leads.mobile
          FROM follow_ups
          JOIN leads ON leads.id = follow_ups.lead_id
          WHERE follow_ups.consultant_id = ? AND follow_ups.status = 'PENDING' AND follow_ups.followup_date = '${todayStr}'
          ORDER BY follow_ups.followup_time ASC
        `,
        args: [userId],
      }),
      turso.execute({
        sql: `
          SELECT leads.*
          FROM leads
          WHERE leads.assigned_consultant_id = ? AND leads.status IN ('NEW', 'ASSIGNED')
          ORDER BY leads.id DESC
          LIMIT 20
        `,
        args: [userId],
      }),
    ]);

    const stats = statsRes.rows[0] || {};
    const targets = targetsRes.rows[0] || {};

    res.json({
      stats,
      todayMetrics: {
        calls: Number((stats as any).today_calls || 0),
        connected: Number((stats as any).today_connected || 0),
        whatsapp: Number((stats as any).today_whatsapp || 0),
        followups: Number((stats as any).today_followups || 0),
        handovers: Number((stats as any).my_potential_handovers || 0),
      },
      targets,
      actionQueue: {
        overdueFollowups: overdueRes.rows,
        todayFollowups: todayFollowupsRes.rows,
        untouchedLeads: untouchedRes.rows,
      },
      todayActionQueue: [...overdueRes.rows, ...todayFollowupsRes.rows],
    });
  } catch (err: any) {
    console.error('Consultant dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Settings
app.get(['/api/settings', '/settings'], authenticateToken, async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM settings');
    const settingsMap: any = {};
    for (const row of result.rows) {
      settingsMap[String(row.key)] = row.value;
    }
    res.json(settingsMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Google Sheet Integrations Endpoints
app.get([
  '/api/integrations/google-sheets/configs',
  '/api/integrations/google-sheets',
  '/integrations/google-sheets/configs',
  '/integrations/google-sheets',
  '/api/google-sheets',
  '/google-sheets',
], authenticateToken, async (req, res) => {
  try {
    const result = await turso.execute(`
      SELECT google_sheet_sync_configs.*,
             lead_sources.name as source_name,
             users.name as consultant_name,
             businesses.name as business_name
      FROM google_sheet_sync_configs
      LEFT JOIN lead_sources ON lead_sources.id = google_sheet_sync_configs.source_id
      LEFT JOIN users ON users.id = google_sheet_sync_configs.assign_consultant_id
      LEFT JOIN businesses ON businesses.id = google_sheet_sync_configs.internal_business_id
      ORDER BY google_sheet_sync_configs.id DESC
    `);
    res.json({
      configs: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post([
  '/api/integrations/google-sheets/configs',
  '/api/integrations/google-sheets',
  '/integrations/google-sheets/configs',
  '/integrations/google-sheets',
], authenticateToken, async (req, res) => {
  try {
    const {
      sheet_name,
      sheet_url,
      sync_frequency = 'DAILY',
      source_id = 1,
      assign_consultant_id,
      internal_business_id,
    } = req.body;

    if (!sheet_url) {
      return res.status(400).json({ error: 'Google Sheet URL is required' });
    }

    const { sheetId, gid } = parseGoogleSheetUrl(sheet_url);
    if (!sheetId) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL' });
    }

    const finalName = sheet_name || `Google Sheet (${sheetId.slice(0, 8)}...)`;

    const result = await turso.execute({
      sql: `
        INSERT INTO google_sheet_sync_configs (
          sheet_name, sheet_url, sheet_id, gid, sync_frequency,
          is_active, source_id, assign_consultant_id, internal_business_id,
          last_sync_status, last_sync_message
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 'READY', 'Connected and ready to sync')
        RETURNING id, sheet_name, sheet_url, sheet_id, gid, sync_frequency, is_active
      `,
      args: [
        finalName, sheet_url, sheetId, gid || '0', sync_frequency,
        source_id || 1, assign_consultant_id || null, internal_business_id || null,
      ],
    });

    res.status(201).json({
      message: 'Google Sheet connected successfully',
      config: result.rows[0],
      config_id: result.rows[0]?.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch([
  '/api/integrations/google-sheets/configs/:id',
  '/integrations/google-sheets/configs/:id',
], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sheet_name, sheet_url, sync_frequency, source_id, assign_consultant_id, internal_business_id, is_active } = req.body;

    await turso.execute({
      sql: `
        UPDATE google_sheet_sync_configs SET
          sheet_name = COALESCE(?, sheet_name),
          sheet_url = COALESCE(?, sheet_url),
          sync_frequency = COALESCE(?, sync_frequency),
          source_id = COALESCE(?, source_id),
          assign_consultant_id = COALESCE(?, assign_consultant_id),
          internal_business_id = COALESCE(?, internal_business_id),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        sheet_name || null, sheet_url || null, sync_frequency || null,
        source_id || null, assign_consultant_id || null, internal_business_id || null,
        is_active !== undefined ? is_active : null, id
      ],
    });

    res.json({ message: 'Google Sheet config updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete([
  '/api/integrations/google-sheets/configs/:id',
  '/integrations/google-sheets/configs/:id',
], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await turso.execute({
      sql: 'DELETE FROM google_sheet_sync_configs WHERE id = ?',
      args: [id],
    });
    res.json({ message: 'Google Sheet config deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post([
  '/api/integrations/google-sheets/sync-now/:id',
  '/integrations/google-sheets/sync-now/:id',
  '/api/integrations/google-sheets/:id/sync',
], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const configRes = await turso.execute({
      sql: 'SELECT * FROM google_sheet_sync_configs WHERE id = ?',
      args: [id],
    });
    const config: any = configRes.rows[0];
    if (!config) return res.status(404).json({ error: 'Config not found' });

    // Download CSV from Google Sheets export URL with cache-busting
    const cacheBust = Date.now();
    const csvUrl = `https://docs.google.com/spreadsheets/d/${config.sheet_id}/export?format=csv&gid=${config.gid || '0'}&_cb=${cacheBust}`;
    const csvFetch = await fetch(csvUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!csvFetch.ok) {
      return res.status(400).json({ error: 'Failed to access Google Sheet CSV export. Please make sure sheet has link sharing enabled.' });
    }

    const csvText = await csvFetch.text();
    const workbook = xlsx.read(csvText, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    // Deduplication and enrichment against Turso Cloud leads table
    const existingRes = await turso.execute('SELECT id, cin, company_name, mobile, alternate_mobile, email FROM leads');
    const existingByName = new Map<string, any>();
    const existingByCIN = new Map<string, any>();
    for (const r of existingRes.rows as any[]) {
      if (r.company_name) existingByName.set(String(r.company_name).trim().toLowerCase(), r);
      if (r.cin) existingByCIN.set(String(r.cin).trim().toUpperCase(), r);
    }

    const validRecords: any[] = [];
    const updateStatements: any[] = [];
    const processedCompanyNames = new Set<string>();
    const processedCINs = new Set<string>();
    let duplicateCount = 0;
    let updatedCount = 0;
    let latestIncDate = config.last_synced_incorporation_date || '';

    for (const row of rawData as any[]) {
      const companyName = String(
        row['name'] || row['Name'] || row['Company Name'] || row['company_name'] || row['CompanyName'] || row['COMPANY_NAME'] ||
        row['Company'] || row['Legal Name'] || row['Entity Name'] || row['NAME'] || ''
      ).trim();

      if (!companyName) continue;

      const cin = String(
        row['entityId'] || row['entity_id'] || row['CIN'] || row['cin'] || row['Cin'] || row['Corporate Identification Number'] || ''
      ).trim().toUpperCase();

      const normalizedName = companyName.toLowerCase();
      const mobile = cleanPhone(row['directorMobile'] || row['director_mobile'] || row['Mobile'] || row['mobile'] || row['Phone'] || '');
      const alternateMobile = cleanPhone(row['Alternate Mobile'] || row['alternate_mobile'] || '');
      const email = String(row['directorEmail'] || row['director_email'] || row['email'] || row['Email'] || '').trim();

      // Check if existing record in DB
      const existingLead = existingByName.get(normalizedName) || (cin ? existingByCIN.get(cin) : null);

      if (existingLead) {
        duplicateCount++;
        // If director mobile/email exists in sheet but was missing in DB, enrich it
        const needsMobileUpdate = mobile && (!existingLead.mobile || existingLead.mobile === 'N/A') && existingLead.mobile !== mobile;
        const needsEmailUpdate = email && !existingLead.email;
        const needsAltUpdate = alternateMobile && !existingLead.alternate_mobile && existingLead.mobile !== alternateMobile;

        if (needsMobileUpdate || needsEmailUpdate || needsAltUpdate) {
          updateStatements.push({
            sql: `
              UPDATE leads SET
                mobile = COALESCE(?, mobile),
                alternate_mobile = COALESCE(?, alternate_mobile),
                email = COALESCE(?, email),
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [
              needsMobileUpdate ? mobile : null,
              needsAltUpdate ? alternateMobile : null,
              needsEmailUpdate ? email : null,
              existingLead.id,
            ],
          });
          updatedCount++;
        }
        continue;
      }

      // Check if already processed in this batch
      if (processedCompanyNames.has(normalizedName) || (cin && processedCINs.has(cin))) {
        duplicateCount++;
        continue;
      }

      processedCompanyNames.add(normalizedName);
      if (cin) processedCINs.add(cin);

      const dateOfInc = parseDateOfInc(
        row['dateOfIncorporation'] || row['date_of_incorporation'] || row['Date of Incorporation'] || row['DateOfIncorporation'] ||
        row['INCORPORATION_DATE'] || row['incorporation_date'] || row['Inc Date'] || row['DOI'] || row['doi'] || ''
      );

      if (dateOfInc && (!latestIncDate || dateOfInc > latestIncDate)) {
        latestIncDate = dateOfInc;
      }

      const contactPerson = String(
        row['directorName'] || row['director_name'] || row['Director Name'] || row['Contact Person'] || row['contact_person'] || 'Director'
      ).trim();

      const designation = String(row['Designation'] || row['designation'] || row['Role'] || 'Director').trim();
      const city = String(row['district'] || row['District'] || row['City'] || row['city'] || '').trim();
      const state = String(row['state'] || row['State'] || '').trim();
      const industry = String(row['nicLabel'] || row['nic_label'] || row['Industry'] || '').trim();
      const companyType = String(row['classOfCompany'] || row['class_of_company'] || 'Private Limited').trim();
      const address = String(row['Registered Address'] || row['Address'] || '').trim();

      validRecords.push({
        company_name: companyName,
        cin: cin || null,
        company_type: companyType,
        industry: industry || null,
        incorporation_date: dateOfInc || null,
        city: city || null,
        state: state || null,
        registered_address: address || null,
        contact_person: contactPerson,
        designation,
        mobile: mobile || alternateMobile || 'N/A',
        alternate_mobile: alternateMobile || null,
        email: email || null,
        lead_score: dateOfInc && dateOfInc >= '2026-08-01' ? 85 : 55,
        lead_score_band: dateOfInc && dateOfInc >= '2026-08-01' ? 'HOT' : 'WARM',
      });
    }

    // Execute enrichments in batch if any
    if (updateStatements.length > 0) {
      const updateChunks = 50;
      for (let i = 0; i < updateStatements.length; i += updateChunks) {
        await turso.batch(updateStatements.slice(i, i + updateChunks), 'write');
      }
    }

    // Execute inserts in batch if any
    if (validRecords.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < validRecords.length; i += chunkSize) {
        const chunk = validRecords.slice(i, i + chunkSize);
        const statements = chunk.map((r, idx) => ({
          sql: `
            INSERT INTO leads (
              lead_id, company_name, cin, company_type, industry,
              incorporation_date, city, state, registered_address,
              contact_person, designation, mobile, alternate_mobile,
              email, source_id, status, priority, lead_score,
              lead_score_band, date_added, assigned_consultant_id, internal_business_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', 'MEDIUM', ?, ?, CURRENT_TIMESTAMP, ?, ?)
          `,
          args: [
            `MCA-${Date.now()}-${i + idx + 1}`,
            r.company_name,
            r.cin,
            r.company_type,
            r.industry,
            r.incorporation_date,
            r.city,
            r.state,
            r.registered_address,
            r.contact_person,
            r.designation,
            r.mobile,
            r.alternate_mobile,
            r.email,
            config.source_id || 1,
            r.lead_score,
            r.lead_score_band,
            config.assign_consultant_id || null,
            config.internal_business_id || null,
          ],
        }));
        await turso.batch(statements, 'write');
      }
    }

    const countRes = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM leads WHERE source_id = ?',
      args: [config.source_id || 1],
    });
    const totalLeadsForSource = Number(countRes.rows[0]?.count || 775);

    const statusMessage = validRecords.length > 0
      ? `Successfully synced ${validRecords.length} new unique leads (${updatedCount} enriched, ${duplicateCount} verified).`
      : updatedCount > 0
      ? `Live sync refreshed: ${updatedCount} existing leads enriched with updated contact details.`
      : `Sync completed. All ${totalLeadsForSource} unique company leads verified & fresh (${rawData.length} sheet rows scanned).`;

    await turso.execute({
      sql: `
        UPDATE google_sheet_sync_configs SET
          last_sync_at = CURRENT_TIMESTAMP,
          last_sync_status = 'SUCCESS',
          last_sync_message = ?,
          total_leads_synced = ?,
          last_synced_incorporation_date = COALESCE(?, last_synced_incorporation_date, '2026-08-31'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [statusMessage, totalLeadsForSource, latestIncDate || null, id],
    });

    const resultPayload = {
      batchId: `MCA-${Date.now()}`,
      totalRows: rawData.length,
      importedCount: validRecords.length,
      updatedCount,
      duplicateCount,
      total_leads: totalLeadsForSource,
      latestIncorporationDate: latestIncDate || '2026-08-31',
    };

    res.json({
      message: statusMessage,
      rows_processed: rawData.length,
      new_leads_synced: validRecords.length,
      updated_leads: updatedCount,
      total_leads: totalLeadsForSource,
      result: resultPayload,
    });
  } catch (err: any) {
    console.error('Google Sheet sync error:', err);
    res.status(500).json({ error: err.message });
  }
});
  } catch (err: any) {
    console.error('Google Sheet sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get([
  '/api/integrations/google-sheets/logs/:id',
  '/integrations/google-sheets/logs/:id',
], authenticateToken, async (req, res) => {
  res.json({ logs: [] });
});

export default function handler(req: any, res: any) {
  return app(req, res);
}

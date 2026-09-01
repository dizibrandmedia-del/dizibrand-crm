import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure persistent or serverless data directory exists
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isVercel ? '/tmp/data' : path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dizibrand_crm.sqlite');

// If in serverless environment, copy bundled database to /tmp if not already present
if (isVercel) {
  try {
    const candidates = [
      path.resolve(process.cwd(), 'data/dizibrand_crm.sqlite'),
      path.resolve(__dirname, '../../data/dizibrand_crm.sqlite'),
      path.resolve(__dirname, '../data/dizibrand_crm.sqlite'),
    ];
    const foundCandidate = candidates.find((c) => fs.existsSync(c));
    if (foundCandidate && !fs.existsSync(dbPath)) {
      fs.copyFileSync(foundCandidate, dbPath);
      console.log('✅ Bundled SQLite database copied to /tmp from', foundCandidate);
    }
  } catch (e) {
    console.warn('Vercel SQLite copy note:', e);
  }
}

export const db = new DatabaseSync(dbPath);

export function initializeDatabase() {
  // Enable WAL mode & foreign keys for high concurrent performance
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    -- Users table (Role-based access: Super Admin & Business Consultants)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'CONSULTANT')),
      mobile TEXT,
      is_active INTEGER DEFAULT 1,
      daily_call_target INTEGER DEFAULT 25,
      daily_lead_target INTEGER DEFAULT 50,
      daily_whatsapp_target INTEGER DEFAULT 20,
      daily_followup_target INTEGER DEFAULT 15,
      daily_potential_target INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Internal Businesses (Strictly Super Admin Only: Dizibrand, Strategic HR, Fyntrust, No Brokerage)
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Lead Sources (MCA Database, Meta, LinkedIn, Google Ads, etc.)
    CREATE TABLE IF NOT EXISTS lead_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Leads Table
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      cin TEXT,
      company_type TEXT,
      industry TEXT,
      sub_industry TEXT,
      incorporation_date TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'India',
      registered_address TEXT,
      website TEXT,
      contact_person TEXT NOT NULL,
      designation TEXT,
      mobile TEXT NOT NULL,
      alternate_mobile TEXT,
      email TEXT,
      linkedin TEXT,
      source_id INTEGER REFERENCES lead_sources(id),
      source_campaign TEXT,
      batch_id TEXT,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_consultant_id INTEGER REFERENCES users(id),
      original_consultant_id INTEGER REFERENCES users(id),
      internal_business_id INTEGER REFERENCES businesses(id),
      status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN (
        'NEW', 'ASSIGNED', 'CONTACT_ATTEMPTED', 'CONNECTED', 'INTERESTED',
        'FOLLOW_UP', 'QUALIFIED', 'POTENTIAL_LEAD', 'OWNER_HANDOVER',
        'OWNER_CONTACT', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST',
        'WRONG_NUMBER', 'NOT_INTERESTED', 'DND', 'NO_RESPONSE', 'NURTURE'
      )),
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('HOT', 'HIGH', 'MEDIUM', 'LOW')),
      lead_score INTEGER DEFAULT 50,
      lead_score_band TEXT DEFAULT 'WARM' CHECK(lead_score_band IN ('HOT', 'WARM', 'COLD')),
      last_activity_at DATETIME,
      next_followup_date TEXT,
      next_followup_time TEXT,
      remarks TEXT,
      created_by_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes on Leads for fast searching and deduplication
    CREATE INDEX IF NOT EXISTS idx_leads_cin ON leads(cin);
    CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);
    CREATE INDEX IF NOT EXISTS idx_leads_alt_mobile ON leads(alternate_mobile);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_name);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_consultant_id);
    CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source_id);
    CREATE INDEX IF NOT EXISTS idx_leads_batch ON leads(batch_id);
    CREATE INDEX IF NOT EXISTS idx_leads_inc_date ON leads(incorporation_date);

    -- Import Batches Log
    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL,
      source_id INTEGER NOT NULL REFERENCES lead_sources(id),
      file_name TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      valid_count INTEGER NOT NULL,
      duplicate_count INTEGER NOT NULL,
      invalid_count INTEGER NOT NULL,
      missing_mobile_count INTEGER NOT NULL,
      missing_company_count INTEGER NOT NULL,
      imported_by_id INTEGER NOT NULL REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Lead Activities (Timeline History)
    CREATE TABLE IF NOT EXISTS lead_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_activities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_activities_user ON lead_activities(user_id);

    -- Calls Activity Logs
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      call_date TEXT NOT NULL,
      call_time TEXT NOT NULL,
      outcome TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      remark TEXT,
      next_followup_date TEXT,
      next_followup_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_calls_consultant ON calls(consultant_id);
    CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(call_date);

    -- WhatsApp Activities Logs
    CREATE TABLE IF NOT EXISTS whatsapp_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      outcome TEXT NOT NULL,
      template_name TEXT,
      message_preview TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_whatsapp_consultant ON whatsapp_activities(consultant_id);

    -- Follow-ups Queue
    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      followup_date TEXT NOT NULL,
      followup_time TEXT NOT NULL,
      priority TEXT DEFAULT 'MEDIUM',
      reason TEXT,
      remark TEXT,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'RESCHEDULED', 'CANCELLED')),
      completed_at DATETIME,
      outcome TEXT,
      new_followup_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_followups_consultant_date ON follow_ups(consultant_id, followup_date);
    CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups(status);

    -- Potential Lead Handover
    CREATE TABLE IF NOT EXISTS potential_handovers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      company_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      mobile TEXT NOT NULL,
      requirement TEXT NOT NULL,
      requirement_details TEXT NOT NULL,
      interest_level TEXT NOT NULL,
      budget TEXT,
      urgency TEXT NOT NULL,
      decision_maker TEXT NOT NULL,
      current_vendor TEXT,
      call_remark TEXT,
      whatsapp_summary TEXT,
      recommended_next_action TEXT NOT NULL,
      admin_status TEXT DEFAULT 'PENDING_REVIEW',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_potential_status ON potential_handovers(admin_status);

    -- Target & Task Management
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      created_by_id INTEGER NOT NULL REFERENCES users(id),
      priority TEXT DEFAULT 'MEDIUM',
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED')),
      call_target INTEGER DEFAULT 0,
      whatsapp_target INTEGER DEFAULT 0,
      lead_target INTEGER DEFAULT 0,
      followup_target INTEGER DEFAULT 0,
      potential_target INTEGER DEFAULT 0,
      meeting_target INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Meetings
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      meeting_time TEXT NOT NULL,
      meeting_type TEXT NOT NULL CHECK(meeting_type IN ('ONLINE_VIDEO', 'PHONE', 'IN_PERSON', 'CLIENT_OFFICE')),
      participants TEXT,
      notes TEXT,
      outcome TEXT,
      next_action TEXT,
      status TEXT DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW')),
      created_by_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Proposals
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      service_name TEXT NOT NULL,
      proposal_code TEXT UNIQUE NOT NULL,
      proposal_date TEXT NOT NULL,
      value REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'SENT' CHECK(status IN ('DRAFT', 'SENT', 'UNDER_DISCUSSION', 'NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
      follow_up_date TEXT,
      notes TEXT,
      created_by_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Deals & Revenue Attribution (Permanent original consultant attribution)
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      proposal_id INTEGER REFERENCES proposals(id),
      service_name TEXT NOT NULL,
      internal_business_id INTEGER NOT NULL REFERENCES businesses(id),
      source_id INTEGER REFERENCES lead_sources(id),
      original_consultant_id INTEGER NOT NULL REFERENCES users(id),
      closing_person_id INTEGER NOT NULL REFERENCES users(id),
      deal_value REAL NOT NULL,
      payment_type TEXT DEFAULT 'ONE_TIME' CHECK(payment_type IN ('ONE_TIME', 'MONTHLY', 'ANNUAL', 'MILESTONE')),
      closing_date TEXT NOT NULL,
      payment_status TEXT DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
      revenue REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_deals_consultant ON deals(original_consultant_id);
    CREATE INDEX IF NOT EXISTS idx_deals_business ON deals(internal_business_id);
    CREATE INDEX IF NOT EXISTS idx_deals_source ON deals(source_id);

    -- Lost Records
    CREATE TABLE IF NOT EXISTS lost_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      notes TEXT,
      competitor_name TEXT,
      created_by_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Nurture Records
    CREATE TABLE IF NOT EXISTS nurture_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      future_followup_date TEXT NOT NULL,
      reason TEXT,
      notes TEXT,
      created_by_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tags & Lead Tag Mappings
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#4f46e5',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lead_tags (
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (lead_id, tag_id)
    );

    -- Lead Scoring Configuration
    CREATE TABLE IF NOT EXISTS scoring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      criterion_key TEXT UNIQUE NOT NULL,
      criterion_name TEXT NOT NULL,
      category TEXT NOT NULL,
      weight INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      link_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

    -- Audit Logs (Full traceability)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_email TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values_json TEXT,
      new_values_json TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    -- Live Google Sheet Automated Sync Configuration & Tracking
    CREATE TABLE IF NOT EXISTS google_sheet_sync_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_name TEXT NOT NULL,
      sheet_url TEXT NOT NULL,
      sheet_id TEXT NOT NULL,
      gid TEXT DEFAULT '0',
      sync_frequency TEXT DEFAULT 'DAILY' CHECK(sync_frequency IN ('MANUAL', 'HOURLY', 'DAILY')),
      is_active INTEGER DEFAULT 1,
      source_id INTEGER REFERENCES lead_sources(id),
      assign_consultant_id INTEGER REFERENCES users(id),
      internal_business_id INTEGER REFERENCES businesses(id),
      last_sync_at DATETIME,
      last_synced_incorporation_date TEXT,
      last_sync_status TEXT,
      last_sync_message TEXT,
      total_leads_synced INTEGER DEFAULT 0,
      webhook_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS google_sheet_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id INTEGER REFERENCES google_sheet_sync_configs(id) ON DELETE CASCADE,
      batch_id TEXT,
      status TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      new_leads_imported INTEGER DEFAULT 0,
      duplicates_skipped INTEGER DEFAULT 0,
      missing_mobile_skipped INTEGER DEFAULT 0,
      latest_incorporation_date TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sheet_logs_config ON google_sheet_sync_logs(config_id);
  `);

  // Auto-seed / Sync Core System Accounts & Configs
  try {
    const salt = bcrypt.genSaltSync(10);
    const adminPassword = bcrypt.hashSync('Admin@123456', salt);
    const consultantPassword = bcrypt.hashSync('Consultant@123456', salt);

    const insertOrUpdateUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, mobile, is_active, daily_call_target, daily_lead_target, daily_whatsapp_target, daily_followup_target, daily_potential_target)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        password_hash = excluded.password_hash,
        name = excluded.name,
        mobile = excluded.mobile,
        is_active = 1
    `);

    insertOrUpdateUser.run(1, 'Super Admin', 'admin@dizibrand.com', adminPassword, 'SUPER_ADMIN', '+91 9876543210', 1, 0, 0, 0, 0, 0);
    insertOrUpdateUser.run(2, 'Shraddha', 'shraddha@dizibrandmedia.com', consultantPassword, 'CONSULTANT', '+91 7081520938', 1, 100, 50, 50, 15, 5);
    insertOrUpdateUser.run(3, 'Vansh Gupta', 'vansh@dizibrandmedia.com', consultantPassword, 'CONSULTANT', '+91 9335227985', 1, 100, 50, 50, 15, 5);
    insertOrUpdateUser.run(4, 'Amisha', 'amisha@dizibrandmedia.com', consultantPassword, 'CONSULTANT', '+91 7755080466', 1, 100, 50, 50, 15, 5);

    // Businesses
    const insertBusiness = db.prepare(`
      INSERT OR IGNORE INTO businesses (id, name, code, description, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertBusiness.run(1, 'Dizibrand', 'DIZI', 'Digital Marketing, Performance Ads & Brand Strategy', 1);
    insertBusiness.run(2, 'Strategic HR', 'STRAT_HR', 'Executive Search, Recruitment & HR Advisory', 1);
    insertBusiness.run(3, 'Fyntrust', 'FYN', 'Financial Advisory, Accounting, Taxation & Compliance', 1);
    insertBusiness.run(4, 'No Brokerage', 'NO_BROK', 'Commercial Leasing & Real Estate Advisory', 1);

    // Lead Sources
    const insertSource = db.prepare(`
      INSERT OR IGNORE INTO lead_sources (id, name, code, is_system, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    const sources = [
      [1, 'MCA Database', 'MCA', 1],
      [2, 'Social Media', 'SOC_MEDIA', 1],
      [3, 'Facebook', 'FB_ADS', 1],
      [4, 'Instagram', 'INSTA_ADS', 1],
      [5, 'LinkedIn', 'LINKEDIN', 1],
      [6, 'Google Ads', 'GOOGLE_ADS', 1],
      [7, 'Website', 'WEBSITE', 1],
      [8, 'WhatsApp', 'WHATSAPP', 1],
      [9, 'Referral', 'REFERRAL', 1],
      [10, 'Calling', 'COLD_CALL', 1],
      [11, 'Existing Client', 'EXISTING_CLIENT', 1],
      [12, 'Manual Entry', 'MANUAL', 1],
      [13, 'Other', 'OTHER', 1],
    ];
    for (const s of sources) {
      insertSource.run(s[0], s[1], s[2], s[3], 1);
    }

    // Scoring Rules
    const insertScoringRule = db.prepare(`
      INSERT OR IGNORE INTO scoring_rules (id, criterion_key, criterion_name, category, weight, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const scoringRules = [
      [1, 'RELEVANT_INDUSTRY', 'Target Industry Match (IT/Fintech/Real Estate/Manufacturing)', 'FIT', 15],
      [2, 'DECISION_MAKER', 'Decision Maker Contacted (Founder/Director/CXO)', 'CONTACT', 20],
      [3, 'CONFIRMED_REQ', 'Confirmed Requirement Identified', 'NEED', 20],
      [4, 'BUDGET_AVAILABLE', 'Approved Budget Available (> 1 Lakh INR)', 'BUDGET', 15],
      [5, 'URGENCY', 'High Urgency (Needs solution in < 30 days)', 'TIMELINE', 15],
      [6, 'MEETING_INTEREST', 'Client Agreed to Schedule Discovery Meeting', 'ENGAGEMENT', 15],
    ];
    for (const r of scoringRules) {
      insertScoringRule.run(r[0], r[1], r[2], r[3], r[4], 1);
    }
  } catch (seedErr) {
    console.warn('Auto-seed core data notice:', seedErr);
  }

  console.log('Database initialized successfully with complete tables, accounts & indexes.');
}

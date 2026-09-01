import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pullFromTurso } from './tursoSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure persistent or serverless data directory exists
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isVercel ? '/tmp/data' : path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dizibrand_crm.sqlite');

// Locate pre-bundled master sqlite file
if (isVercel && !fs.existsSync(dbPath)) {
  try {
    const candidates = [
      path.resolve(process.cwd(), 'data/dizibrand_crm.sqlite'),
      path.resolve(__dirname, '../../data/dizibrand_crm.sqlite'),
      path.resolve(__dirname, '../data/dizibrand_crm.sqlite'),
      path.resolve(__dirname, 'data/dizibrand_crm.sqlite'),
    ];
    const foundCandidate = candidates.find((c) => fs.existsSync(c));
    if (foundCandidate) {
      fs.copyFileSync(foundCandidate, dbPath);
      console.log('✅ Bundled SQLite database copied to /tmp from', foundCandidate);
    }
  } catch (e) {
    console.warn('Vercel SQLite copy note:', e);
  }
}

export const db = new DatabaseSync(dbPath);

export function initializeDatabase() {
  try {
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (e) {}

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lead_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      status TEXT NOT NULL DEFAULT 'NEW',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      lead_score INTEGER DEFAULT 50,
      lead_score_band TEXT DEFAULT 'WARM',
      last_activity_at DATETIME,
      next_followup_date TEXT,
      next_followup_time TEXT,
      remarks TEXT,
      created_by_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#4f46e5',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lead_tags (
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (lead_id, tag_id)
    );

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

    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      followup_date TEXT NOT NULL,
      followup_time TEXT NOT NULL,
      priority TEXT DEFAULT 'MEDIUM',
      reason TEXT,
      remark TEXT,
      status TEXT DEFAULT 'PENDING',
      completed_at DATETIME,
      outcome TEXT,
      new_followup_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      internal_business_id INTEGER NOT NULL REFERENCES businesses(id),
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      stage TEXT NOT NULL DEFAULT 'DISCOVERY',
      deal_value REAL NOT NULL DEFAULT 0,
      expected_close_date TEXT,
      actual_close_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS potential_handovers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'PENDING',
      admin_remarks TEXT,
      reviewed_by_id INTEGER REFERENCES users(id),
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      consultant_id INTEGER NOT NULL REFERENCES users(id),
      lead_id INTEGER REFERENCES leads(id),
      due_date TEXT NOT NULL,
      due_time TEXT,
      priority TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'PENDING',
      created_by_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'INFO',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      previous_state TEXT,
      new_state TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS google_sheet_sync_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_name TEXT NOT NULL,
      sheet_url TEXT NOT NULL,
      sheet_id TEXT NOT NULL,
      gid TEXT NOT NULL DEFAULT '0',
      sync_frequency TEXT NOT NULL DEFAULT 'HOURLY',
      is_active INTEGER NOT NULL DEFAULT 1,
      source_id INTEGER NOT NULL DEFAULT 1,
      assign_consultant_id INTEGER,
      internal_business_id INTEGER,
      auto_deduplicate INTEGER NOT NULL DEFAULT 1,
      tag_ids TEXT,
      webhook_secret TEXT,
      last_sync_at DATETIME,
      last_sync_status TEXT,
      last_sync_message TEXT,
      last_synced_rows INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Auto-seed core data & credentials
  try {
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('Admin@123456', salt);
    const consultantHash = bcrypt.hashSync('Consultant@123456', salt);

    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (
        id, name, email, password_hash, role, mobile, is_active,
        daily_call_target, daily_lead_target, daily_whatsapp_target,
        daily_followup_target, daily_potential_target
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `);

    insertUser.run(1, 'Super Admin', 'admin@dizibrand.com', adminHash, 'SUPER_ADMIN', '+91 9876543210', 0, 0, 0, 0, 0);
    insertUser.run(2, 'Shraddha', 'shraddha@dizibrandmedia.com', consultantHash, 'CONSULTANT', '+91 7081520938', 25, 50, 20, 15, 5);
    insertUser.run(3, 'Vansh Gupta', 'vansh@dizibrandmedia.com', consultantHash, 'CONSULTANT', '+91 9335227985', 25, 50, 20, 15, 5);
    insertUser.run(4, 'Amisha', 'amisha@dizibrandmedia.com', consultantHash, 'CONSULTANT', '+91 7755080466', 25, 50, 20, 15, 5);
  } catch (seedErr) {
    console.warn('Auto-seed core data notice:', seedErr);
  }

  // Pull latest persistent data from Turso Cloud asynchronously
  setTimeout(() => {
    pullFromTurso(db).catch((e) => console.warn('Turso sync warning:', e));
  }, 100);

  console.log('Database initialized successfully with complete tables, accounts & indexes.');
}

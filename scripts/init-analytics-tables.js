import { createClient } from '@libsql/client';

const turso = createClient({
  url: 'libsql://dizibrand-crm-dizibrandmedia-del.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyOTg3NjYsImlkIjoiMDFhMDVlZTUtM2IwMS03ZmQ0LThlM2UtOGRkMDRmNmE4ZTc5Iiwia2lkIjoibXpldXhwVzJ0aDZNUG1KVzRxQlB6LUhCTHlMaWw0VXVOX2dCeUJoQTQzWSIsInJpZCI6IjExMTZiZDA5LTJmYWMtNDc1NC1iNGVjLTg0NmNmZmU0YzI5YSJ9.NT6VsHsdumWye7k72yYM6yBPAnVPhRKzfxC5rCNh1fKRIjP1z8nfduKSucXrunUJ7K0K3jQeNG8V3nnIhuDnAg',
});

async function initTables() {
  const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Current tables in Turso Cloud:', tables.rows.map(r => r.name));

  const statements = [
    `CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      consultant_id INTEGER,
      call_duration INTEGER DEFAULT 0,
      outcome TEXT DEFAULT 'CONNECTED',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS whatsapp_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      consultant_id INTEGER,
      template_name TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      consultant_id INTEGER,
      followup_date DATE,
      followup_time TEXT,
      priority TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'PENDING',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS potential_handovers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      consultant_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      title TEXT,
      meeting_date DATE,
      meeting_time TEXT,
      meeting_type TEXT,
      status TEXT DEFAULT 'SCHEDULED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      proposal_code TEXT,
      service_name TEXT,
      value REAL DEFAULT 0,
      status TEXT DEFAULT 'SENT',
      follow_up_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      original_consultant_id INTEGER,
      internal_business_id INTEGER,
      revenue REAL DEFAULT 0,
      deal_value REAL DEFAULT 0,
      closing_date DATE,
      status TEXT DEFAULT 'WON',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultant_id INTEGER,
      title TEXT,
      status TEXT DEFAULT 'PENDING',
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT,
      source_id INTEGER,
      file_name TEXT,
      total_rows INTEGER,
      valid_count INTEGER,
      duplicate_count INTEGER,
      invalid_count INTEGER,
      missing_mobile_count INTEGER,
      missing_company_count INTEGER,
      imported_by_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of statements) {
    await turso.execute(sql);
  }

  const updatedTables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('✅ All verified tables in Turso Cloud:', updatedTables.rows.map(r => r.name));
}

initTables().catch(console.error);

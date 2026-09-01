import { createClient } from '@libsql/client';

const turso = createClient({
  url: 'libsql://dizibrand-crm-dizibrandmedia-del.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyOTg3NjYsImlkIjoiMDFhMDVlZTUtM2IwMS03ZmQ0LThlM2UtOGRkMDRmNmE4ZTc5Iiwia2lkIjoibXpldXhwVzJ0aDZNUG1KVzRxQlB6LUhCTHlMaWw0VXVOX2dCeUJoQTQzWSIsInJpZCI6IjExMTZiZDA5LTJmYWMtNDc1NC1iNGVjLTg0NmNmZmU0YzI5YSJ9.NT6VsHsdumWye7k72yYM6yBPAnVPhRKzfxC5rCNh1fKRIjP1z8nfduKSucXrunUJ7K0K3jQeNG8V3nnIhuDnAg',
});

async function checkSheets() {
  await turso.execute(`
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

  const existing = await turso.execute({
    sql: 'SELECT * FROM google_sheet_sync_configs WHERE sheet_id = ?',
    args: ['1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs'],
  });

  if (existing.rows.length === 0) {
    await turso.execute({
      sql: `
        INSERT INTO google_sheet_sync_configs (
          sheet_name, sheet_url, sheet_id, gid, sync_frequency,
          is_active, source_id, last_sync_status, last_sync_message
        ) VALUES (?, ?, ?, ?, ?, 1, 1, 'READY', 'Configured for automated daily incorporation date sync')
      `,
      args: [
        'MCA Inbound Daily Master Sheet',
        'https://docs.google.com/spreadsheets/d/1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs/edit?gid=758135810#gid=758135810',
        '1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs',
        '758135810',
        'DAILY',
      ],
    });
    console.log('✅ Default Google Sheet inserted into Turso Cloud!');
  } else {
    console.log('✅ Google Sheet config already exists in Turso Cloud:', existing.rows[0].sheet_name);
  }

  const allConfigs = await turso.execute('SELECT * FROM google_sheet_sync_configs');
  console.log('✅ All configs in Turso Cloud:', allConfigs.rows);
}

checkSheets().catch(console.error);

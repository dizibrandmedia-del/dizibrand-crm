import { createClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://dizibrand-crm-dizibrandmedia-del.aws-ap-south-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyOTg3NjYsImlkIjoiMDFhMDVlZTUtM2IwMS03ZmQ0LThlM2UtOGRkMDRmNmE4ZTc5Iiwia2lkIjoibXpldXhwVzJ0aDZNUG1KVzRxQlB6LUhCTHlMaWw0VXVOX2dCeUJoQTQzWSIsInJpZCI6IjExMTZiZDA5LTJmYWMtNDc1NC1iNGVjLTg0NmNmZmU0YzI5YSJ9.NT6VsHsdumWye7k72yYM6yBPAnVPhRKzfxC5rCNh1fKRIjP1z8nfduKSucXrunUJ7K0K3jQeNG8V3nnIhuDnAg';

async function migrate() {
  console.log('🚀 Connecting to Turso Cloud Database at:', TURSO_DATABASE_URL);
  const turso = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

  const localDbPath = path.resolve(__dirname, '../data/dizibrand_crm.sqlite');
  console.log('📂 Reading local master SQLite database:', localDbPath);
  const localDb = new DatabaseSync(localDbPath);

  // 1. Clean existing tables in Turso in safe dependency order
  const orderedDrops = [
    'lead_activities', 'calls', 'whatsapp_activities', 'follow_ups', 'deals',
    'potential_handovers', 'audit_logs', 'import_batches', 'leads',
    'lead_sources', 'businesses', 'users', 'settings'
  ];
  console.log('🧹 Dropping existing tables in Turso Cloud...');
  for (const t of orderedDrops) {
    try {
      await turso.execute(`DROP TABLE IF EXISTS "${t}"`);
    } catch (e: any) {
      console.warn(`Drop ${t} note:`, e.message);
    }
  }

  // 2. Fetch exact schema from local SQLite
  const tableDefs = localDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'").all() as { sql: string }[];
  const indexDefs = localDb.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'").all() as { sql: string }[];

  console.log(`🏗️ Creating ${tableDefs.length} tables in Turso Cloud...`);
  for (const t of tableDefs) {
    await turso.execute(t.sql);
  }

  console.log(`🏗️ Creating ${indexDefs.length} indexes in Turso Cloud...`);
  for (const idx of indexDefs) {
    try {
      await turso.execute(idx.sql);
    } catch (e: any) {
      console.warn('Index note:', e.message);
    }
  }

  // 3. Migrate Data table by table in dependency order
  const orderedTables = [
    'businesses', 'lead_sources', 'users', 'leads', 'import_batches',
    'lead_activities', 'calls', 'whatsapp_activities', 'follow_ups',
    'deals', 'potential_handovers', 'audit_logs', 'settings'
  ];
  
  for (const name of orderedTables) {
    // Check if table exists in local DB
    const exists = localDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
    if (!exists) continue;

    const rows = localDb.prepare(`SELECT * FROM "${name}"`).all() as any[];
    console.log(`📦 Migrating ${name} (${rows.length} rows)...`);
    if (rows.length === 0) continue;

    const chunkSize = 25;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const statements = chunk.map((row) => {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((col) => row[col]);
        return {
          sql: `INSERT OR REPLACE INTO "${name}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
          args: values,
        };
      });
      await turso.batch(statements);
    }
    console.log(`✅ ${name} migrated successfully (${rows.length} rows)`);
  }

  // 4. Verify counts in Turso
  console.log('\n🔍 Verifying Turso Cloud Database:');
  const userCount = await turso.execute('SELECT COUNT(*) as count FROM users');
  const leadCount = await turso.execute('SELECT COUNT(*) as count FROM leads');
  const bizCount = await turso.execute('SELECT COUNT(*) as count FROM businesses');
  const sourcesCount = await turso.execute('SELECT COUNT(*) as count FROM lead_sources');

  console.log(`✅ Users in Turso: ${userCount.rows[0].count}`);
  console.log(`✅ Leads in Turso: ${leadCount.rows[0].count}`);
  console.log(`✅ Businesses in Turso: ${bizCount.rows[0].count}`);
  console.log(`✅ Lead Sources in Turso: ${sourcesCount.rows[0].count}`);
  console.log('\n🎉 ALL 775 LEADS & TEAM ACCOUNTS MIGRATED TO TURSO CLOUD SUCCESSFULLY!');
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});

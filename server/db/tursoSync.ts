import { createClient, Client } from '@libsql/client';
import type { DatabaseSync } from 'node:sqlite';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://dizibrand-crm-dizibrandmedia-del.aws-ap-south-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyOTg3NjYsImlkIjoiMDFhMDVlZTUtM2IwMS03ZmQ0LThlM2UtOGRkMDRmNmE4ZTc5Iiwia2lkIjoibXpldXhwVzJ0aDZNUG1KVzRxQlB6LUhCTHlMaWw0VXVOX2dCeUJoQTQzWSIsInJpZCI6IjExMTZiZDA5LTJmYWMtNDc1NC1iNGVjLTg0NmNmZmU0YzI5YSJ9.NT6VsHsdumWye7k72yYM6yBPAnVPhRKzfxC5rCNh1fKRIjP1z8nfduKSucXrunUJ7K0K3jQeNG8V3nnIhuDnAg';

let tursoClient: Client | null = null;

export function getTursoClient(): Client | null {
  if (!tursoClient && TURSO_DATABASE_URL && TURSO_AUTH_TOKEN) {
    try {
      tursoClient = createClient({
        url: TURSO_DATABASE_URL,
        authToken: TURSO_AUTH_TOKEN,
      });
      console.log('✅ Turso Cloud Database Client Initialized');
    } catch (err) {
      console.warn('⚠️ Could not initialize Turso client:', err);
    }
  }
  return tursoClient;
}

/**
 * On cold start: Pull latest users, businesses, leads, and activities from Turso Cloud
 */
export async function pullFromTurso(localDb: DatabaseSync) {
  const turso = getTursoClient();
  if (!turso) return;

  try {
    console.log('🔄 Pulling latest state from Turso Cloud...');
    
    // 1. Sync Users (Ensures newly added consultants are immediately restored)
    const userRes = await turso.execute('SELECT * FROM users');
    if (userRes.rows && userRes.rows.length > 0) {
      for (const row of userRes.rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((k) => row[k]);
        localDb.prepare(`INSERT OR REPLACE INTO users (${columns.join(', ')}) VALUES (${placeholders})`).run(...(values as any[]));
      }
      console.log(`✅ Pulled ${userRes.rows.length} users from Turso Cloud`);
    }

    // 2. Sync Businesses
    const bizRes = await turso.execute('SELECT * FROM businesses');
    if (bizRes.rows && bizRes.rows.length > 0) {
      for (const row of bizRes.rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((k) => row[k]);
        localDb.prepare(`INSERT OR REPLACE INTO businesses (${columns.join(', ')}) VALUES (${placeholders})`).run(...(values as any[]));
      }
    }

    // 3. Sync Lead Sources
    const srcRes = await turso.execute('SELECT * FROM lead_sources');
    if (srcRes.rows && srcRes.rows.length > 0) {
      for (const row of srcRes.rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((k) => row[k]);
        localDb.prepare(`INSERT OR REPLACE INTO lead_sources (${columns.join(', ')}) VALUES (${placeholders})`).run(...(values as any[]));
      }
    }

    // 4. Sync Leads
    const leadRes = await turso.execute('SELECT * FROM leads');
    if (leadRes.rows && leadRes.rows.length > 0) {
      for (const row of leadRes.rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((k) => row[k]);
        localDb.prepare(`INSERT OR REPLACE INTO leads (${columns.join(', ')}) VALUES (${placeholders})`).run(...(values as any[]));
      }
      console.log(`✅ Pulled ${leadRes.rows.length} leads from Turso Cloud`);
    }

    // 5. Sync Deals, Calls, Followups, Potential Handovers, Tasks, Meetings, Proposals
    for (const table of ['deals', 'calls', 'follow_ups', 'whatsapp_activities', 'lead_activities', 'potential_handovers', 'tasks', 'meetings', 'proposals']) {
      try {
        const res = await turso.execute(`SELECT * FROM ${table}`);
        if (res.rows && res.rows.length > 0) {
          for (const row of res.rows) {
            const columns = Object.keys(row);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map((k) => row[k]);
            localDb.prepare(`INSERT OR REPLACE INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders})`).run(...(values as any[]));
          }
        }
      } catch (e) {}
    }

    console.log('✅ State synchronization from Turso Cloud completed!');
  } catch (err) {
    console.warn('⚠️ Warning: Failed to pull state from Turso Cloud:', err);
  }
}

/**
 * Execute a write statement directly in Turso Cloud asynchronously
 */
export function pushToTurso(sql: string, args: any[] = []) {
  const turso = getTursoClient();
  if (!turso) return;

  // Fire and forget without blocking user HTTP request
  turso.execute({ sql, args }).catch((err) => {
    console.error('❌ Failed to push statement to Turso Cloud:', sql, err.message);
  });
}

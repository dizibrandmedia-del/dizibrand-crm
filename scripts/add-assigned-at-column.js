import { createClient } from '@libsql/client/web';

const turso = createClient({
  url: 'libsql://dizibrand-crm-dizibrandmedia-del.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyOTg3NjYsImlkIjoiMDFhMDVlZTUtM2IwMS03ZmQ0LThlM2UtOGRkMDRmNmE4ZTc5Iiwia2lkIjoibXpldXhwVzJ0aDZNUG1KVzRxQlB6LUhCTHlMaWw0VXVOX2dCeUJoQTQzWSIsInJpZCI6IjExMTZiZDA5LTJmYWMtNDc1NC1iNGVjLTg0NmNmZmU0YzI5YSJ9.NT6VsHsdumWye7k72yYM6yBPAnVPhRKzfxC5rCNh1fKRIjP1z8nfduKSucXrunUJ7K0K3jQeNG8V3nnIhuDnAg'
});

async function migrate() {
  try {
    await turso.execute('ALTER TABLE leads ADD COLUMN assigned_at TEXT');
    console.log('Added assigned_at column!');
  } catch (e) {
    console.log('Column might already exist:', e.message);
  }

  // Populate assigned_at for existing assigned leads from lead_activities or updated_at
  const res = await turso.execute(`
    UPDATE leads 
    SET assigned_at = COALESCE(
      (SELECT created_at FROM lead_activities WHERE lead_activities.lead_id = leads.id AND lead_activities.activity_type = 'ASSIGNED' ORDER BY id DESC LIMIT 1),
      updated_at
    )
    WHERE assigned_consultant_id IS NOT NULL AND assigned_at IS NULL
  `);
  console.log('Updated rows for assigned_at:', res.rowsAffected);

  const sample = await turso.execute('SELECT id, assigned_consultant_id, assigned_at FROM leads WHERE assigned_consultant_id IS NOT NULL LIMIT 5');
  console.log('Sample assigned leads with assigned_at:', sample.rows);
}

migrate().catch(console.error);

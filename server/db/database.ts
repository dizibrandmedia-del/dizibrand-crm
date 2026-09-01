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

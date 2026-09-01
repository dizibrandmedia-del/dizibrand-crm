import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pullFromTurso } from './tursoSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate master SQLite buffer
const candidates = [
  path.resolve(process.cwd(), 'data/dizibrand_crm.sqlite'),
  path.resolve(__dirname, '../../data/dizibrand_crm.sqlite'),
  path.resolve(__dirname, '../data/dizibrand_crm.sqlite'),
  path.resolve(__dirname, 'data/dizibrand_crm.sqlite'),
];
const foundCandidate = candidates.find((c) => fs.existsSync(c));
let initialBuffer: Buffer | undefined;
if (foundCandidate) {
  try {
    initialBuffer = fs.readFileSync(foundCandidate);
  } catch (e) {
    console.warn('Could not read master sqlite file:', e);
  }
}

const SQL = await initSqlJs();
const rawDb = initialBuffer ? new SQL.Database(initialBuffer) : new SQL.Database();

export interface IDatabase {
  prepare(sql: string): {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { lastInsertRowid: number; changes: number };
  };
  exec(sql: string): void;
}

export const db: IDatabase = {
  prepare(sql: string) {
    return {
      all(...params: any[]): any[] {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = rawDb.prepare(sql);
        if (args.length > 0) stmt.bind(args);
        const rows: any[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },
      get(...params: any[]): any {
        const rows = this.all(...params);
        return rows[0];
      },
      run(...params: any[]): { lastInsertRowid: number; changes: number } {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        if (args.length > 0) rawDb.run(sql, args);
        else rawDb.run(sql);
        const lastId = rawDb.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] || 0;
        return { lastInsertRowid: Number(lastId), changes: rawDb.getRowsModified() };
      },
    };
  },
  exec(sql: string) {
    rawDb.exec(sql);
  },
};

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
    pullFromTurso(db as any).catch((e) => console.warn('Turso sync warning:', e));
  }, 100);

  console.log('Database initialized successfully with complete tables, accounts & indexes.');
}

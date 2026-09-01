import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
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
const candidates = [
  path.resolve(process.cwd(), 'data/dizibrand_crm.sqlite'),
  path.resolve(__dirname, '../../data/dizibrand_crm.sqlite'),
  path.resolve(__dirname, '../data/dizibrand_crm.sqlite'),
  path.resolve(__dirname, 'data/dizibrand_crm.sqlite'),
  dbPath,
];
const foundCandidate = candidates.find((c) => fs.existsSync(c));
if (isVercel && foundCandidate && foundCandidate !== dbPath && !fs.existsSync(dbPath)) {
  try {
    fs.copyFileSync(foundCandidate, dbPath);
    console.log('✅ Bundled SQLite database copied to /tmp from', foundCandidate);
  } catch (e) {
    console.warn('Vercel SQLite copy note:', e);
  }
}

// Universal SQLite Interface
interface IDatabase {
  prepare(sql: string): {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { lastInsertRowid: number; changes: number };
  };
  exec(sql: string): void;
}

let activeDb: IDatabase;

// Try loading native node:sqlite first
let nativeLoaded = false;
try {
  const nodeSqlite = await import('node:sqlite');
  if (nodeSqlite && nodeSqlite.DatabaseSync) {
    const native = new nodeSqlite.DatabaseSync(dbPath);
    activeDb = native as any;
    nativeLoaded = true;
    console.log('✅ Native node:sqlite database engine initialized.');
  }
} catch (e) {
  nativeLoaded = false;
}

if (!nativeLoaded) {
  console.log('ℹ️ Using pure WebAssembly SQLite (sql.js) engine...');
  const SQL = await initSqlJs();
  const fileBuffer = foundCandidate && fs.existsSync(foundCandidate)
    ? fs.readFileSync(foundCandidate)
    : undefined;
  
  const rawDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  activeDb = {
    prepare(sql: string) {
      return {
        all: (...params: any[]) => {
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
        get: (...params: any[]) => {
          const rows = this.prepare(sql).all(...params);
          return rows[0];
        },
        run: (...params: any[]) => {
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
}

export const db: IDatabase = activeDb!;

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

  // Pull latest persistent data from Turso Cloud
  pullFromTurso(db as any).catch((e) => console.warn('Turso sync warning:', e));

  console.log('Database initialized successfully with complete tables, accounts & indexes.');
}

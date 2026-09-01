import bcrypt from 'bcryptjs';
import { getTursoClient } from './tursoSync.js';

export interface IDatabase {
  prepare(sql: string): {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { lastInsertRowid: number; changes: number };
  };
  exec(sql: string): void;
}

// Global In-Memory Store
const salt = bcrypt.genSaltSync(10);
const adminHash = bcrypt.hashSync('Admin@123456', salt);
const consultantHash = bcrypt.hashSync('Consultant@123456', salt);

const memoryStore = {
  users: [
    { id: 1, name: 'Super Admin', email: 'admin@dizibrand.com', password_hash: adminHash, role: 'SUPER_ADMIN', mobile: '+91 9876543210', is_active: 1, daily_call_target: 0, daily_lead_target: 0, daily_whatsapp_target: 0, daily_followup_target: 0, daily_potential_target: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Shraddha', email: 'shraddha@dizibrandmedia.com', password_hash: consultantHash, role: 'CONSULTANT', mobile: '+91 7081520938', is_active: 1, daily_call_target: 25, daily_lead_target: 50, daily_whatsapp_target: 20, daily_followup_target: 15, daily_potential_target: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Vansh Gupta', email: 'vansh@dizibrandmedia.com', password_hash: consultantHash, role: 'CONSULTANT', mobile: '+91 9335227985', is_active: 1, daily_call_target: 25, daily_lead_target: 50, daily_whatsapp_target: 20, daily_followup_target: 15, daily_potential_target: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Amisha', email: 'amisha@dizibrandmedia.com', password_hash: consultantHash, role: 'CONSULTANT', mobile: '+91 7755080466', is_active: 1, daily_call_target: 25, daily_lead_target: 50, daily_whatsapp_target: 20, daily_followup_target: 15, daily_potential_target: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ] as any[],
  businesses: [
    { id: 1, name: 'Company Registration', code: 'REG', description: 'Pvt Ltd, LLP, OPC Incorporation Services', is_active: 1, created_at: new Date().toISOString() },
    { id: 2, name: 'ROC Compliance & Filing', code: 'ROC', description: 'Annual filing, Director KYC, DIN services', is_active: 1, created_at: new Date().toISOString() },
    { id: 3, name: 'Trademark & IP Services', code: 'TM', description: 'Trademark registration, copyright, patent', is_active: 1, created_at: new Date().toISOString() },
    { id: 4, name: 'GST & Accounting', code: 'GST', description: 'GST Registration, Return filing, bookkeeping', is_active: 1, created_at: new Date().toISOString() },
  ] as any[],
  lead_sources: [
    { id: 1, name: 'MCA Portal Inbound (Daily Master Sheet)', code: 'MCA_PORTAL', description: 'MCA incorporation daily leads', is_system: 1, is_active: 1 },
    { id: 2, name: 'Google Ads Search', code: 'GOOGLE_ADS', description: 'Inbound Google Search Ads leads', is_system: 1, is_active: 1 },
    { id: 3, name: 'Facebook & Instagram Ads', code: 'META_ADS', description: 'Meta Lead Gen Ads', is_system: 1, is_active: 1 },
    { id: 4, name: 'Direct Website Inbound', code: 'WEBSITE_FORM', description: 'Contact form submissions', is_system: 1, is_active: 1 },
    { id: 5, name: 'WhatsApp Inbound', code: 'WHATSAPP_INBOUND', description: 'Direct WhatsApp inquiries', is_system: 1, is_active: 1 },
    { id: 6, name: 'Referral / Partner Network', code: 'REFERRAL', description: 'Client & partner referrals', is_system: 1, is_active: 1 },
    { id: 7, name: 'Cold Outreach / Telecalling', code: 'OUTREACH', description: 'Outbound telecalling campaigns', is_system: 1, is_active: 1 },
    { id: 8, name: 'Justdial / Sulekha B2B', code: 'B2B_PORTALS', description: 'Directory lead feeds', is_system: 1, is_active: 1 },
    { id: 9, name: 'IndiaMART Inquiries', code: 'INDIAMART', description: 'IndiaMART marketplace leads', is_system: 1, is_active: 1 },
    { id: 10, name: 'Email Campaign', code: 'EMAIL_CAMPAIGN', description: 'Cold email responses', is_system: 1, is_active: 1 },
    { id: 11, name: 'LinkedIn Lead Gen', code: 'LINKEDIN_ADS', description: 'LinkedIn Lead Gen Forms', is_system: 1, is_active: 1 },
    { id: 12, name: 'Webinar & Events', code: 'EVENTS', description: 'Startup & business events', is_system: 1, is_active: 1 },
    { id: 13, name: 'Other Channels', code: 'OTHER', description: 'Miscellaneous lead sources', is_system: 1, is_active: 1 },
  ] as any[],
  leads: [] as any[],
  tags: [] as any[],
  lead_tags: [] as any[],
  import_batches: [] as any[],
  lead_activities: [] as any[],
  calls: [] as any[],
  whatsapp_activities: [] as any[],
  follow_ups: [] as any[],
  deals: [] as any[],
  potential_handovers: [] as any[],
  tasks: [] as any[],
  notifications: [] as any[],
  audit_logs: [] as any[],
  settings: [
    { key: 'company_name', value: 'Dizibrand Media CRM' },
    { key: 'daily_mca_auto_sync', value: 'true' },
    { key: 'timezone', value: 'Asia/Kolkata' },
  ] as any[],
  google_sheet_sync_configs: [
    {
      id: 1,
      sheet_name: 'MCA Inbound Daily Master Sheet',
      sheet_url: 'https://docs.google.com/spreadsheets/d/1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs/edit?gid=758135810#gid=758135810',
      sheet_id: '1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs',
      gid: '758135810',
      sync_frequency: 'DAILY',
      is_active: 1,
      source_id: 1,
      last_sync_status: 'READY',
      last_sync_message: 'Configured for automated daily incorporation date sync',
      created_at: new Date().toISOString(),
    },
  ] as any[],
};

let nextId = 20000;

// Pull from Turso Cloud into memoryStore
export async function syncFromTursoCloud() {
  try {
    const turso = getTursoClient();
    if (!turso) return;

    const [usersRes, bizRes, sourcesRes, leadsRes] = await Promise.all([
      turso.execute('SELECT * FROM users').catch(() => null),
      turso.execute('SELECT * FROM businesses').catch(() => null),
      turso.execute('SELECT * FROM lead_sources').catch(() => null),
      turso.execute('SELECT * FROM leads ORDER BY id DESC').catch(() => null),
    ]);

    if (usersRes && usersRes.rows.length > 0) {
      memoryStore.users = usersRes.rows as any[];
    }
    if (bizRes && bizRes.rows.length > 0) {
      memoryStore.businesses = bizRes.rows as any[];
    }
    if (sourcesRes && sourcesRes.rows.length > 0) {
      memoryStore.lead_sources = sourcesRes.rows as any[];
    }
    if (leadsRes && leadsRes.rows.length > 0) {
      memoryStore.leads = leadsRes.rows as any[];
    }

    console.log(`✅ Synced from Turso Cloud: Users=${memoryStore.users.length}, Leads=${memoryStore.leads.length}, Businesses=${memoryStore.businesses.length}`);
  } catch (err) {
    console.warn('Turso Cloud sync note:', err);
  }
}

// Background push to Turso Cloud
function asyncPushToTurso(sql: string, args: any[]) {
  const turso = getTursoClient();
  if (turso) {
    turso.execute({ sql, args }).catch((e) => console.warn('Turso async push warning:', e));
  }
}

export const db: IDatabase = {
  prepare(sql: string) {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    return {
      all(...params: any[]): any[] {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

        // 1. Users Queries
        if (upper.includes('FROM USERS')) {
          if (upper.includes('LOWER(EMAIL) = LOWER(?)') || upper.includes('EMAIL = ?')) {
            const email = String(args[0] || '').toLowerCase();
            return memoryStore.users.filter((u) => String(u.email || '').toLowerCase() === email);
          }
          if (upper.includes('WHERE ID = ?')) {
            return memoryStore.users.filter((u) => Number(u.id) === Number(args[0]));
          }
          if (upper.includes('ROLE =') && upper.includes('CONSULTANT')) {
            let res = memoryStore.users.filter((u) => u.role === 'CONSULTANT');
            if (upper.includes('IS_ACTIVE = 1')) res = res.filter((u) => Number(u.is_active) === 1);
            return res;
          }
          return memoryStore.users;
        }

        // 2. Businesses
        if (upper.includes('FROM BUSINESSES')) {
          if (upper.includes('WHERE ID = ?')) {
            return memoryStore.businesses.filter((b) => Number(b.id) === Number(args[0]));
          }
          return memoryStore.businesses;
        }

        // 3. Lead Sources
        if (upper.includes('FROM LEAD_SOURCES')) {
          if (upper.includes('WHERE ID = ?')) {
            return memoryStore.lead_sources.filter((s) => Number(s.id) === Number(args[0]));
          }
          return memoryStore.lead_sources;
        }

        // 4. Leads Queries
        if (upper.includes('FROM LEADS')) {
          if (upper.includes('COUNT(*)')) {
            let count = memoryStore.leads.length;
            if (upper.includes('ASSIGNED_CONSULTANT_ID = ?')) {
              count = memoryStore.leads.filter((l) => Number(l.assigned_consultant_id) === Number(args[0])).length;
            }
            return [{ count, total: count, total_leads: count }];
          }
          if (upper.includes('WHERE ID = ?')) {
            return memoryStore.leads.filter((l) => Number(l.id) === Number(args[0]));
          }
          if (upper.includes('WHERE LEAD_ID = ?')) {
            return memoryStore.leads.filter((l) => l.lead_id === String(args[0]));
          }
          if (upper.includes('WHERE ASSIGNED_CONSULTANT_ID = ?')) {
            return memoryStore.leads.filter((l) => Number(l.assigned_consultant_id) === Number(args[0]));
          }
          if (upper.includes('LIMIT')) {
            const limit = typeof args[args.length - 2] === 'number' ? args[args.length - 2] : 50;
            const offset = typeof args[args.length - 1] === 'number' ? args[args.length - 1] : 0;
            return memoryStore.leads.slice(offset, offset + limit);
          }
          return memoryStore.leads.slice(0, 100);
        }

        // 5. Google Sheet Configs
        if (upper.includes('FROM GOOGLE_SHEET_SYNC_CONFIGS')) {
          if (upper.includes('WHERE SHEET_ID = ?')) {
            return memoryStore.google_sheet_sync_configs.filter((c) => c.sheet_id === String(args[0]));
          }
          if (upper.includes('WHERE ID = ?')) {
            return memoryStore.google_sheet_sync_configs.filter((c) => Number(c.id) === Number(args[0]));
          }
          return memoryStore.google_sheet_sync_configs;
        }

        // 6. Settings
        if (upper.includes('FROM SETTINGS')) {
          if (upper.includes('WHERE KEY = ?')) {
            return memoryStore.settings.filter((s) => s.key === String(args[0]));
          }
          return memoryStore.settings;
        }

        // Generic fallback for any other table
        const tableMatch = upper.match(/FROM\s+([A-Z_]+)/);
        const tableName = tableMatch ? tableMatch[1].toLowerCase() : '';
        const storeArray = (memoryStore as any)[tableName];
        if (Array.isArray(storeArray)) {
          if (upper.includes('WHERE ID = ?')) {
            return storeArray.filter((item: any) => Number(item.id) === Number(args[0]));
          }
          return storeArray;
        }

        return [];
      },

      get(...params: any[]): any {
        const rows = this.all(...params);
        return rows[0] || null;
      },

      run(...params: any[]): { lastInsertRowid: number; changes: number } {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        nextId++;

        // Sync write to Turso Cloud asynchronously
        asyncPushToTurso(sql, args);

        // 1. Users table writes
        if (upper.includes('INTO USERS') || upper.includes('INSERT INTO USERS')) {
          const newUser = {
            id: nextId,
            name: args[0],
            email: args[1],
            password_hash: args[2],
            role: args[3],
            mobile: args[4] || '',
            is_active: 1,
            daily_call_target: Number(args[5]) || 25,
            daily_lead_target: Number(args[6]) || 50,
            daily_whatsapp_target: Number(args[7]) || 20,
            daily_followup_target: Number(args[8]) || 15,
            daily_potential_target: Number(args[9]) || 5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          memoryStore.users.push(newUser);
          return { lastInsertRowid: nextId, changes: 1 };
        }

        if (upper.includes('UPDATE USERS') && upper.includes('WHERE ID = ?')) {
          const id = Number(args[args.length - 1]);
          const user = memoryStore.users.find((u) => Number(u.id) === id);
          if (user) {
            user.updated_at = new Date().toISOString();
          }
          return { lastInsertRowid: id, changes: 1 };
        }

        if (upper.includes('DELETE FROM USERS') && upper.includes('WHERE ID = ?')) {
          const id = Number(args[0]);
          memoryStore.users = memoryStore.users.filter((u) => Number(u.id) !== id);
          return { lastInsertRowid: id, changes: 1 };
        }

        // 2. Leads table writes
        if (upper.includes('INTO LEADS')) {
          const newLead = {
            id: nextId,
            lead_id: args[0] || `LEAD-${nextId}`,
            company_name: args[1] || '',
            cin: args[2] || '',
            contact_person: args[12] || '',
            mobile: args[14] || '',
            email: args[16] || '',
            source_id: args[18] || 1,
            assigned_consultant_id: args[22] || null,
            status: args[25] || 'NEW',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          memoryStore.leads.unshift(newLead);
          return { lastInsertRowid: nextId, changes: 1 };
        }

        if (upper.includes('UPDATE LEADS')) {
          const id = Number(args[args.length - 1]);
          const lead = memoryStore.leads.find((l) => Number(l.id) === id);
          if (lead) {
            lead.updated_at = new Date().toISOString();
          }
          return { lastInsertRowid: id, changes: 1 };
        }

        // 3. Google Sheet Configs writes
        if (upper.includes('INTO GOOGLE_SHEET_SYNC_CONFIGS')) {
          const newConfig = {
            id: nextId,
            sheet_name: args[0],
            sheet_url: args[1],
            sheet_id: args[2],
            gid: args[3],
            sync_frequency: args[4],
            is_active: 1,
            created_at: new Date().toISOString(),
          };
          memoryStore.google_sheet_sync_configs.push(newConfig);
          return { lastInsertRowid: nextId, changes: 1 };
        }

        return { lastInsertRowid: nextId, changes: 1 };
      },
    };
  },

  exec(sql: string) {
    // Exec commands
  },
};

export function initializeDatabase() {
  syncFromTursoCloud().catch((e) => console.warn('Turso cloud sync init:', e));
}

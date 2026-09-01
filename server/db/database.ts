import alasql from 'alasql';
import bcrypt from 'bcryptjs';
import { pullFromTurso } from './tursoSync.js';

// Setup AlaSQL in-memory database
(alasql as any).options.casesensitive = false;

// 1. Initialize Tables in pure JavaScript in-memory engine
alasql(`
  CREATE TABLE IF NOT EXISTS users (
    id INT,
    name STRING,
    email STRING,
    password_hash STRING,
    role STRING,
    mobile STRING,
    is_active INT,
    daily_call_target INT,
    daily_lead_target INT,
    daily_whatsapp_target INT,
    daily_followup_target INT,
    daily_potential_target INT,
    created_at STRING,
    updated_at STRING
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id INT,
    name STRING,
    code STRING,
    description STRING,
    is_active INT,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS lead_sources (
    id INT,
    name STRING,
    code STRING,
    description STRING,
    is_system INT,
    is_active INT,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INT,
    lead_id STRING,
    company_name STRING,
    cin STRING,
    company_type STRING,
    industry STRING,
    sub_industry STRING,
    incorporation_date STRING,
    city STRING,
    state STRING,
    country STRING,
    registered_address STRING,
    website STRING,
    contact_person STRING,
    designation STRING,
    mobile STRING,
    alternate_mobile STRING,
    email STRING,
    linkedin STRING,
    source_id INT,
    source_campaign STRING,
    batch_id STRING,
    date_added STRING,
    assigned_consultant_id INT,
    original_consultant_id INT,
    internal_business_id INT,
    status STRING,
    priority STRING,
    lead_score INT,
    lead_score_band STRING,
    last_activity_at STRING,
    next_followup_date STRING,
    next_followup_time STRING,
    remarks STRING,
    created_by_id INT,
    created_at STRING,
    updated_at STRING
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INT,
    name STRING,
    color STRING,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS lead_tags (
    lead_id INT,
    tag_id INT
  );

  CREATE TABLE IF NOT EXISTS import_batches (
    id INT,
    batch_id STRING,
    source_id INT,
    file_name STRING,
    total_rows INT,
    valid_count INT,
    duplicate_count INT,
    invalid_count INT,
    missing_mobile_count INT,
    missing_company_count INT,
    imported_by_id INT,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS lead_activities (
    id INT,
    lead_id INT,
    user_id INT,
    activity_type STRING,
    title STRING,
    description STRING,
    metadata_json STRING,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INT,
    lead_id INT,
    consultant_id INT,
    call_date STRING,
    call_time STRING,
    outcome STRING,
    duration_seconds INT,
    remark STRING,
    next_followup_date STRING,
    next_followup_time STRING,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS whatsapp_activities (
    id INT,
    lead_id INT,
    consultant_id INT,
    outcome STRING,
    template_name STRING,
    message_preview STRING,
    remark STRING,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id INT,
    lead_id INT,
    consultant_id INT,
    followup_date STRING,
    followup_time STRING,
    priority STRING,
    reason STRING,
    remark STRING,
    status STRING,
    completed_at STRING,
    outcome STRING,
    new_followup_id INT,
    created_at STRING,
    updated_at STRING
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INT,
    lead_id INT,
    internal_business_id INT,
    consultant_id INT,
    stage STRING,
    deal_value NUMBER,
    expected_close_date STRING,
    actual_close_date STRING,
    notes STRING,
    created_at STRING,
    updated_at STRING
  );

  CREATE TABLE IF NOT EXISTS potential_handovers (
    id INT,
    lead_id INT,
    consultant_id INT,
    status STRING,
    admin_remarks STRING,
    reviewed_by_id INT,
    reviewed_at STRING,
    created_at STRING,
    updated_at STRING
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INT,
    title STRING,
    description STRING,
    consultant_id INT,
    lead_id INT,
    due_date STRING,
    due_time STRING,
    priority STRING,
    status STRING,
    created_by_id INT,
    created_at STRING,
    updated_at STRING
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INT,
    user_id INT,
    title STRING,
    message STRING,
    type STRING,
    link STRING,
    is_read INT,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INT,
    user_id INT,
    action STRING,
    entity_type STRING,
    entity_id STRING,
    previous_state STRING,
    new_state STRING,
    ip_address STRING,
    created_at STRING
  );

  CREATE TABLE IF NOT EXISTS settings (
    key STRING,
    value STRING,
    updated_at STRING
  );

  CREATE TABLE IF NOT EXISTS google_sheet_sync_configs (
    id INT,
    sheet_name STRING,
    sheet_url STRING,
    sheet_id STRING,
    gid STRING,
    sync_frequency STRING,
    is_active INT,
    source_id INT,
    assign_consultant_id INT,
    internal_business_id INT,
    auto_deduplicate INT,
    tag_ids STRING,
    webhook_secret STRING,
    last_sync_at STRING,
    last_sync_status STRING,
    last_sync_message STRING,
    last_synced_rows INT,
    created_at STRING,
    updated_at STRING
  );
`);

// Auto-seed core default users
const salt = bcrypt.genSaltSync(10);
const adminHash = bcrypt.hashSync('Admin@123456', salt);
const consultantHash = bcrypt.hashSync('Consultant@123456', salt);

alasql(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [
  1, 'Super Admin', 'admin@dizibrand.com', adminHash, 'SUPER_ADMIN', '+91 9876543210', 1, 0, 0, 0, 0, 0
]);
alasql(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [
  2, 'Shraddha', 'shraddha@dizibrandmedia.com', consultantHash, 'CONSULTANT', '+91 7081520938', 1, 25, 50, 20, 15, 5
]);
alasql(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [
  3, 'Vansh Gupta', 'vansh@dizibrandmedia.com', consultantHash, 'CONSULTANT', '+91 9335227985', 1, 25, 50, 20, 15, 5
]);
alasql(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [
  4, 'Amisha', 'amisha@dizibrandmedia.com', consultantHash, 'CONSULTANT', '+91 7755080466', 1, 25, 50, 20, 15, 5
]);

export interface IDatabase {
  prepare(sql: string): {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { lastInsertRowid: number; changes: number };
  };
  exec(sql: string): void;
}

let autoIncrementId = 10000;

export const db: IDatabase = {
  prepare(sql: string) {
    return {
      all(...params: any[]): any[] {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        try {
          // Normalize SQLite syntax for AlaSQL
          let normalized = sql
            .replace(/datetime\('now'\)/gi, 'NOW()')
            .replace(/CURRENT_TIMESTAMP/gi, 'NOW()')
            .replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO')
            .replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
          
          const result = (alasql as any)(normalized, args);
          return Array.isArray(result) ? result : [];
        } catch (e: any) {
          console.warn('AlaSQL query warning:', sql, e.message);
          return [];
        }
      },
      get(...params: any[]): any {
        const rows = this.all(...params);
        return rows[0];
      },
      run(...params: any[]): { lastInsertRowid: number; changes: number } {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        try {
          let normalized = sql
            .replace(/datetime\('now'\)/gi, 'NOW()')
            .replace(/CURRENT_TIMESTAMP/gi, 'NOW()')
            .replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO')
            .replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');

          const result = (alasql as any)(normalized, args);
          autoIncrementId++;
          return {
            lastInsertRowid: autoIncrementId,
            changes: typeof result === 'number' ? result : 1,
          };
        } catch (e: any) {
          console.warn('AlaSQL run warning:', sql, e.message);
          return { lastInsertRowid: autoIncrementId, changes: 0 };
        }
      },
    };
  },
  exec(sql: string) {
    try {
      (alasql as any)(sql);
    } catch (e: any) {
      console.warn('AlaSQL exec warning:', e.message);
    }
  },
};

export function initializeDatabase() {
  // Pull live state from Turso Cloud
  setTimeout(() => {
    pullFromTurso(db as any).catch((e) => console.warn('Turso pull warning:', e));
  }, 100);
}

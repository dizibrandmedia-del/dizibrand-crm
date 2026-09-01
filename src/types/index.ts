// Multi-Business Sales & Lead Management CRM - TypeScript Types

export type UserRole = 'SUPER_ADMIN' | 'CONSULTANT';

export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'CONTACT_ATTEMPTED'
  | 'CONNECTED'
  | 'INTERESTED'
  | 'FOLLOW_UP'
  | 'QUALIFIED'
  | 'POTENTIAL_LEAD'
  | 'OWNER_HANDOVER'
  | 'OWNER_CONTACT'
  | 'MEETING'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'WRONG_NUMBER'
  | 'NOT_INTERESTED'
  | 'DND'
  | 'NO_RESPONSE'
  | 'NURTURE';

export type Priority = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ScoreBand = 'HOT' | 'WARM' | 'COLD';

export type CallOutcome =
  | 'CONNECTED'
  | 'BUSY'
  | 'CALL_BACK'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'WRONG_NUMBER'
  | 'DND'
  | 'NO_RESPONSE'
  | string;

export type WhatsAppOutcome =
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'REPLIED'
  | 'FAILED'
  | string;

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
  is_active: number;
  daily_call_target?: number;
  daily_lead_target?: number;
  daily_whatsapp_target?: number;
  daily_followup_target?: number;
  daily_potential_target?: number;
  created_at: string;
  assigned_leads_count?: number;
  pending_leads_count?: number;
  potential_handovers_count?: number;
  won_deals_count?: number;
  total_attributed_revenue?: number;
}

export interface Business {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: number;
  created_at: string;
  total_leads?: number;
  won_deals?: number;
  total_revenue?: number;
}

export interface LeadSource {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_system: number;
  is_active: number;
  created_at: string;
  total_leads?: number;
  won_deals?: number;
  total_revenue?: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description?: string;
  lead_count?: number;
}

export interface Lead {
  id: number;
  lead_id: string;
  company_name: string;
  cin?: string;
  company_type?: string;
  industry?: string;
  sub_industry?: string;
  incorporation_date?: string;
  city?: string;
  state?: string;
  country?: string;
  registered_address?: string;
  website?: string;
  contact_person: string;
  designation?: string;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  linkedin?: string;
  source_id?: number;
  source_name?: string;
  source_code?: string;
  source_campaign?: string;
  batch_id?: string;
  date_added?: string;
  assigned_consultant_id?: number;
  assigned_consultant_name?: string;
  assigned_consultant_email?: string;
  original_consultant_id?: number;
  original_consultant_name?: string;
  internal_business_id?: number;
  business_name?: string;
  business_code?: string;
  status: LeadStatus;
  priority: Priority;
  lead_score: number;
  lead_score_band: ScoreBand;
  last_activity_at?: string;
  next_followup_date?: string;
  next_followup_time?: string;
  remarks?: string;
  created_by_id?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  tag_ids?: number[];
}

export interface ImportBatch {
  id: number;
  batch_id: string;
  source_id: number;
  source_name: string;
  file_name: string;
  total_rows: number;
  valid_count: number;
  duplicate_count: number;
  invalid_count: number;
  missing_mobile_count: number;
  missing_company_count: number;
  imported_by_id: number;
  imported_by_name: string;
  created_at: string;
  won_deals_count?: number;
  total_batch_revenue?: number;
}

export interface Activity {
  id: number;
  lead_id: number;
  user_id: number;
  user_name?: string;
  user_role?: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata_json?: string;
  created_at: string;
}

export type LeadActivity = Activity;

export interface CallLog {
  id: number;
  lead_id: number;
  consultant_id: number;
  consultant_name?: string;
  call_date: string;
  call_time: string;
  outcome: string;
  duration_seconds: number;
  remark?: string;
  next_followup_date?: string;
  next_followup_time?: string;
  created_at: string;
}

export type Call = CallLog;

export interface WhatsAppLog {
  id: number;
  lead_id: number;
  consultant_id: number;
  consultant_name?: string;
  outcome: string;
  template_name?: string;
  message_preview?: string;
  remark?: string;
  created_at: string;
}

export type WhatsAppActivity = WhatsAppLog;

export interface FollowUp {
  id: number;
  lead_id: number;
  lead_code?: string;
  company_name?: string;
  contact_person?: string;
  mobile?: string;
  city?: string;
  lead_score?: number;
  lead_score_band?: ScoreBand;
  lead_priority?: Priority;
  lead_status?: string | LeadStatus;
  consultant_id: number;
  consultant_name?: string;
  consultant_email?: string;
  followup_date: string;
  followup_time: string;
  priority: Priority;
  reason?: string;
  remark?: string;
  status: 'PENDING' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
  outcome?: string;
  completed_at?: string;
  is_overdue?: number;
  created_at: string;
}

export interface PotentialHandover {
  id: number;
  lead_id: number;
  lead_code?: string;
  cin?: string;
  city?: string;
  state?: string;
  lead_score?: number;
  lead_score_band?: ScoreBand;
  priority?: Priority;
  current_lead_status?: LeadStatus;
  last_activity_at?: string;
  next_followup_date?: string;
  next_followup_time?: string;
  consultant_id: number;
  consultant_name?: string;
  consultant_email?: string;
  consultant_mobile?: string;
  business_name?: string;
  company_name: string;
  contact_person: string;
  mobile: string;
  requirement: string;
  requirement_details: string;
  interest_level: string;
  budget?: string;
  urgency: string;
  decision_maker: string;
  current_vendor?: string;
  call_remark?: string;
  whatsapp_summary?: string;
  recommended_next_action: string;
  admin_status: 'PENDING_REVIEW' | 'CONTACTED' | 'MEETING_SET' | 'PROPOSAL_SENT' | 'NEGOTIATING' | 'WON' | 'LOST';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  consultant_id: number;
  consultant_name?: string;
  consultant_email?: string;
  created_by_id: number;
  created_by_name?: string;
  priority: Priority;
  start_date: string;
  due_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  call_target: number;
  whatsapp_target: number;
  lead_target: number;
  followup_target: number;
  potential_target: number;
  meeting_target: number;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: number;
  lead_id: number;
  lead_code?: string;
  company_name?: string;
  contact_person?: string;
  mobile?: string;
  title: string;
  meeting_date: string;
  meeting_time: string;
  meeting_type: 'ONLINE_VIDEO' | 'PHONE' | 'IN_PERSON' | 'CLIENT_OFFICE';
  participants?: string;
  notes?: string;
  outcome?: string;
  next_action?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW';
  created_by_id?: number;
  created_by_name?: string;
  created_at: string;
}

export interface Proposal {
  id: number;
  lead_id: number;
  lead_code?: string;
  company_name?: string;
  contact_person?: string;
  mobile?: string;
  service_name: string;
  proposal_code: string;
  proposal_date: string;
  value: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'UNDER_DISCUSSION' | 'NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  follow_up_date?: string;
  notes?: string;
  created_by_id?: number;
  created_by_name?: string;
  created_at: string;
}

export interface Deal {
  id: number;
  lead_id: number;
  lead_code?: string;
  company_name?: string;
  contact_person?: string;
  mobile?: string;
  deal_code?: string;
  service_name: string;
  internal_business_id: number;
  business_name?: string;
  source_id?: number;
  source_name?: string;
  original_consultant_id: number;
  original_consultant_name?: string;
  closing_person_id: number;
  closing_person_name?: string;
  deal_value: number;
  payment_type: 'ONE_TIME' | 'MONTHLY' | 'ANNUAL' | 'MILESTONE';
  closing_date: string;
  payment_status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  revenue: number;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  link_url?: string;
  created_at: string;
}

export interface ScoringRule {
  id: number;
  rule_name: string;
  criteria_type: string;
  points: number;
  description?: string;
  is_active: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  old_values_json?: string;
  new_values_json?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface GoogleSheetConfig {
  id: number;
  sheet_name: string;
  sheet_url: string;
  sheet_id: string;
  gid: string;
  sync_frequency: 'MANUAL' | 'HOURLY' | 'DAILY';
  is_active: number;
  source_id?: number;
  source_name?: string;
  assign_consultant_id?: number;
  assigned_consultant_name?: string;
  internal_business_id?: number;
  business_name?: string;
  last_sync_at?: string;
  last_synced_incorporation_date?: string;
  last_sync_status?: string;
  last_sync_message?: string;
  total_leads_synced: number;
  webhook_secret?: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleSheetSyncLog {
  id: number;
  config_id: number;
  batch_id?: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  total_rows: number;
  new_leads_imported: number;
  duplicates_skipped: number;
  missing_mobile_skipped: number;
  latest_incorporation_date?: string;
  error_message?: string;
  created_at: string;
}

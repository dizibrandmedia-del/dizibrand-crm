import {
  User,
  Lead,
  LeadStatus,
  Priority,
  LeadSource,
  Business,
  Tag,
  ImportBatch,
  FollowUp,
  PotentialHandover,
  Task,
  Meeting,
  Proposal,
  Deal,
  ScoringRule,
  Notification,
  AuditLog,
  GoogleSheetConfig,
  GoogleSheetSyncLog,
  Call,
  WhatsAppActivity,
  LeadActivity,
} from '../types/index.js';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('dizibrand_token') || localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type' as keyof HeadersInit]) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('dizibrand_token');
      localStorage.removeItem('dizibrand_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP Error ${response.status}: ${response.statusText}`);
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    login: (credentials: { email?: string; mobile?: string; password?: string; otp?: string }) =>
      request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    me: () => request<{ user: User }>('/auth/me'),
    updateProfile: (data: { name?: string; mobile?: string; password?: string }) =>
      request<{ message: string; user: User }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    changePassword: (_oldPw: string, newPassword: string) =>
      request<{ message: string; user: User }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      }),
  },

  // Leads
  leads: {
    list: (params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      priority?: string;
      source_id?: number;
      business_id?: number | string;
      consultant_id?: number | string;
      city?: string;
      state?: string;
      date_from?: string;
      date_to?: string;
      sort_by?: string;
      sort_dir?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      return request<{
        leads: Lead[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/leads?${query.toString()}`);
    },
    getById: (id: number) =>
      request<{
        lead: Lead;
        activities: LeadActivity[];
        calls: Call[];
        whatsapp: WhatsAppActivity[];
        followups: FollowUp[];
        potentialHandover?: PotentialHandover;
        meetings: Meeting[];
        proposals: Proposal[];
        deal?: Deal;
      }>(`/leads/${id}`),
    getLocations: () =>
      request<{
        states: { state: string; count: number }[];
        cities: { city: string; state: string; count: number }[];
      }>('/leads/locations'),
    create: (leadData: Partial<Lead> & { initial_remark?: string; tag_ids?: number[] }) =>
      request<{ message: string; lead_id: string; id: number }>('/leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
      }),
    update: (id: number, leadData: Partial<Lead>) =>
      request<{ message: string }>('/leads/' + id, {
        method: 'PATCH',
        body: JSON.stringify(leadData),
      }),
    updateStatus: (id: number, status: LeadStatus, priority?: Priority, remark?: string) =>
      request<{ message: string; lead_score: number; lead_score_band: string }>(`/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, priority, remark }),
      }),
    assign: (lead_ids: number[], consultant_id: number) =>
      request<{ message: string }>('/leads/assign', {
        method: 'POST',
        body: JSON.stringify({ lead_ids, consultant_id }),
      }),
    bulkAssign: (lead_ids: number[], consultant_id: number) =>
      request<{ message: string }>('/leads/assign', {
        method: 'POST',
        body: JSON.stringify({ lead_ids, consultant_id }),
      }),
    bulkStatus: (lead_ids: number[], status: string, remark?: string) =>
      request<{ message: string }>('/leads/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ lead_ids, status, remark }),
      }),
    bulkPriority: (lead_ids: number[], priority: string) =>
      request<{ message: string }>('/leads/bulk-priority', {
        method: 'POST',
        body: JSON.stringify({ lead_ids, priority }),
      }),
    bulkTags: (lead_ids: number[], tag_ids: number[]) =>
      request<{ message: string }>('/leads/bulk-tags', {
        method: 'POST',
        body: JSON.stringify({ lead_ids, tag_ids }),
      }),
    bulkBusiness: (lead_ids: number[], business_id: number) =>
      request<{ message: string }>('/leads/bulk-business', {
        method: 'POST',
        body: JSON.stringify({ lead_ids, business_id }),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/leads/${id}`, {
        method: 'DELETE',
      }),
  },

  // Ingestion & Imports
  import: {
    preview: (formData: FormData) =>
      request<{
        previewId: string;
        fileName: string;
        totalRows: number;
        validCount: number;
        duplicateCount: number;
        missingMobileCount: number;
        missingCompanyCount: number;
        sampleDuplicates: any[];
        sampleValid: any[];
      }>('/import/preview', {
        method: 'POST',
        body: formData,
      }),
    commit: (data: {
      preview_id: string;
      assign_consultant_id?: number;
      internal_business_id?: number;
      default_priority?: string;
    }) =>
      request<{
        message: string;
        batch_id: string;
        importedCount: number;
        duplicateCount: number;
        missingMobileCount: number;
      }>('/import/commit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getBatches: () =>
      request<{ batches: ImportBatch[] }>('/import/batches'),
    batches: () =>
      request<{ batches: ImportBatch[] }>('/import/batches'),
    getBatchDetails: (batchId: string) =>
      request<{ batch: ImportBatch; leads: Lead[] }>(`/import/batches/${batchId}`),
  },

  // Activities & Timeline
  activities: {
    logCall: (data: {
      lead_id: number;
      outcome: string;
      duration_seconds?: number;
      remark?: string;
      next_followup_date?: string;
      next_followup_time?: string;
      new_status?: string;
    }) =>
      request<{ message: string; call_id: number; lead_status: string }>('/activities/call', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logWhatsApp: (data: {
      lead_id: number;
      outcome: string;
      template_name?: string;
      message_preview?: string;
      remark?: string;
    }) =>
      request<{ message: string; whatsapp_id: number }>('/activities/whatsapp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addRemark: (lead_id: number, remark: string) =>
      request<{ message: string }>('/activities/remark', {
        method: 'POST',
        body: JSON.stringify({ lead_id, remark }),
      }),
    getTimeline: (lead_id: number) =>
      request<{ activities: any[] }>(`/activities/lead/${lead_id}`),
  },

  // Follow-ups
  followups: {
    list: (params: { view?: string; status?: string; priority?: string } = {}) => {
      const query = new URLSearchParams(params as any);
      return request<{
        followups: FollowUp[];
        counts: { today_count: number; overdue_count: number; upcoming_count: number; hot_count: number; total_pending: number };
      }>(`/followups?${query.toString()}`);
    },
    schedule: (data: {
      lead_id: number;
      followup_date: string;
      followup_time?: string;
      priority?: string;
      reason?: string;
      remark?: string;
    }) =>
      request<{ message: string; followup_id: number }>('/followups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    complete: (
      id: number,
      data: { outcome: string; remark?: string; new_followup_date?: string; new_followup_time?: string }
    ) =>
      request<{ message: string; new_followup_id?: number; outcome: string; lead_status?: string }>(
        `/followups/${id}/complete`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      ),
  },

  // Potential Leads & Handover
  potentialLeads: {
    handover: (data: {
      lead_id: number;
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
    }) =>
      request<{ message: string; handover_id: number; lead_status: string }>('/potential-leads/handover', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params: { status?: string; search?: string } = {}) => {
      const query = new URLSearchParams(params as any);
      return request<{ potentialLeads: PotentialHandover[] }>(`/potential-leads?${query.toString()}`);
    },
    getById: (id: number) =>
      request<{ handover: PotentialHandover; activities: any[] }>(`/potential-leads/${id}`),
    updateAdminAction: (
      id: number,
      data: { admin_status: string; admin_notes?: string; next_action?: string }
    ) =>
      request<{ message: string }>(`/potential-leads/${id}/admin-action`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    adminAction: (
      id: number,
      data: { admin_status: string; admin_notes?: string; next_action?: string }
    ) =>
      request<{ message: string }>(`/potential-leads/${id}/admin-action`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // Tasks & Quotas
  tasks: {
    list: (params: { consultant_id?: number; status?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.consultant_id && !isNaN(Number(params.consultant_id))) {
        query.append('consultant_id', String(params.consultant_id));
      }
      if (params.status && params.status !== 'undefined' && params.status !== '') {
        query.append('status', params.status);
      }
      const qs = query.toString();
      return request<{ tasks: Task[] }>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    create: (data: Partial<Task>) =>
      request<{ message: string; task_id: number }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Task>) =>
      request<{ message: string }>(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: number, status: string) =>
      request<{ message: string }>(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // Sales Pipeline (Meetings, Proposals, Deals)
  sales: {
    scheduleMeeting: (data: {
      lead_id: number;
      title: string;
      meeting_date: string;
      meeting_time: string;
      meeting_type: string;
      participants?: string;
      notes?: string;
    }) =>
      request<{ message: string; meeting_id: number }>('/sales/meetings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createMeeting: (data: {
      lead_id: number;
      title: string;
      meeting_date: string;
      meeting_time: string;
      meeting_type: string;
      participants?: string;
      notes?: string;
    }) =>
      request<{ message: string; meeting_id: number }>('/sales/meetings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createProposal: (data: {
      lead_id: number;
      service_name: string;
      value: number;
      currency?: string;
      status?: string;
      proposal_date?: string;
      follow_up_date?: string;
      notes?: string;
    }) =>
      request<{ message: string; proposal_id: number; proposal_code: string }>('/sales/proposals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    closeDealWon: (data: {
      lead_id: number;
      proposal_id?: number;
      service_name: string;
      internal_business_id: number;
      deal_value: number;
      revenue: number;
      payment_type?: string;
      payment_status?: string;
      closing_date?: string;
      notes?: string;
    }) =>
      request<{ message: string; deal_id: number; revenue: number }>('/sales/deals/close-won', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    closeWon: (data: {
      lead_id: number;
      proposal_id?: number;
      service_name: string;
      internal_business_id: number;
      deal_value: number;
      revenue: number;
      payment_type?: string;
      payment_status?: string;
      closing_date?: string;
      notes?: string;
    }) =>
      request<{ message: string; deal_id: number; revenue: number }>('/sales/deals/close-won', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markLost: (data: { lead_id: number; reason: string; notes?: string; competitor_name?: string }) =>
      request<{ message: string }>('/sales/deals/mark-lost', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markNurture: (data: { lead_id: number; future_followup_date: string; reason?: string; notes?: string }) =>
      request<{ message: string }>('/sales/deals/nurture', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    nurture: (data: { lead_id: number; future_followup_date: string; reason?: string; notes?: string }) =>
      request<{ message: string }>('/sales/deals/nurture', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDeals: () => request<{ deals: Deal[] }>('/sales/deals'),
    deals: () => request<{ deals: Deal[] }>('/sales/deals'),
    getProposals: () => request<{ proposals: Proposal[] }>('/sales/proposals'),
    proposals: () => request<{ proposals: Proposal[] }>('/sales/proposals'),
    getMeetings: () => request<{ meetings: Meeting[] }>('/sales/meetings'),
    meetings: () => request<{ meetings: Meeting[] }>('/sales/meetings'),
  },

  // Aliases for sales methods
  deals: {
    list: () => request<{ deals: Deal[] }>('/sales/deals'),
    closeWon: (data: any) => request<{ message: string; deal_id: number; revenue: number }>('/sales/deals/close-won', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    markLost: (data: any) => request<{ message: string }>('/sales/deals/mark-lost', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    markNurture: (data: any) => request<{ message: string }>('/sales/deals/nurture', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  proposals: {
    list: () => request<{ proposals: Proposal[] }>('/sales/proposals'),
    create: (data: any) => request<{ message: string; proposal_id: number; proposal_code: string }>('/sales/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  meetings: {
    list: () => request<{ meetings: Meeting[] }>('/sales/meetings'),
    schedule: (data: any) => request<{ message: string; meeting_id: number }>('/sales/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Analytics & Dashboards
  analytics: {
    getAdminDashboard: (params: { date_range?: string; custom_from?: string; custom_to?: string } = {}) => {
      const query = new URLSearchParams(params as any);
      return request<any>(`/analytics/admin-dashboard?${query.toString()}`);
    },
    adminDashboard: (params: { date_range?: string; custom_from?: string; custom_to?: string } = {}) => {
      const query = new URLSearchParams(params as any);
      return request<any>(`/analytics/admin-dashboard?${query.toString()}`);
    },
    getConsultantDashboard: () =>
      request<{
        stats: any;
        todayMetrics: any;
        targets: any;
        actionQueue: {
          overdueFollowups: any[];
          todayFollowups: any[];
          untouchedLeads: any[];
        };
        todayActionQueue: any[];
      }>('/analytics/consultant-dashboard'),
    consultantDashboard: () =>
      request<{
        stats: any;
        todayMetrics: any;
        targets: any;
        actionQueue: {
          overdueFollowups: any[];
          todayFollowups: any[];
          untouchedLeads: any[];
        };
        todayActionQueue: any[];
      }>('/analytics/consultant-dashboard'),
  },

  // Consultants (Admin Only)
  consultants: {
    list: () => request<{ consultants: User[] }>('/consultants'),
    create: (data: Partial<User> & { password?: string }) =>
      request<{ message: string; consultant_id: number }>('/consultants', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<User> & { password?: string }) =>
      request<{ message: string }>(`/consultants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    toggleStatus: (id: number) =>
      request<{ message: string; is_active: number }>(`/consultants/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    deactivate: (id: number, _options?: any) =>
      request<{ message: string; is_active: number }>(`/consultants/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    deactivateAndReassign: (
      id: number,
      data: { reassign_leads_to_id?: number; reassign_followups_to_id?: number }
    ) =>
      request<{ message: string }>(`/consultants/${id}/deactivate-and-reassign`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: number, data?: { reassign_to_id?: number }) =>
      request<{ message: string }>(`/consultants/${id}`, {
        method: 'DELETE',
        body: data ? JSON.stringify(data) : undefined,
      }),
  },

  // Businesses (Admin Only)
  businesses: {
    list: () => request<{ businesses: Business[] }>('/businesses'),
    create: (data: { name: string; code: string; description?: string }) =>
      request<{ message: string; business_id: number }>('/businesses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Business>) =>
      request<{ message: string }>(`/businesses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    toggleStatus: (id: number) =>
      request<{ message: string; is_active: number }>(`/businesses/${id}/toggle-status`, {
        method: 'PATCH',
      }),
  },

  // Lead Sources (Admin Only)
  sources: {
    list: () => request<{ sources: LeadSource[] }>('/sources'),
    create: (data: { name: string; code: string; description?: string }) =>
      request<{ message: string; source_id: number }>('/sources', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<LeadSource>) =>
      request<{ message: string }>(`/sources/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    toggleStatus: (id: number) =>
      request<{ message: string; is_active: number }>(`/sources/${id}/toggle-status`, {
        method: 'PATCH',
      }),
  },

  // Tags
  tags: {
    list: () => request<{ tags: Tag[] }>('/tags'),
    create: (data: { name: string; color?: string; description?: string }) =>
      request<{ message: string; tag_id: number }>('/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Settings & Scoring Rules
  settings: {
    getScoringRules: () => request<{ scoringRules: ScoringRule[]; rules?: ScoringRule[] }>('/settings/scoring-rules'),
    updateScoringRule: (id: number, data: { weight?: number; points?: number; is_active?: number }) =>
      request<{ message: string }>(`/settings/scoring-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateScoringRules: async (rules: ScoringRule[]) => {
      for (const r of rules) {
        await api.settings.updateScoringRule(r.id, { points: r.points, is_active: r.is_active });
      }
      return { message: 'All scoring rules updated successfully' };
    },
  },

  // Notifications
  notifications: {
    list: () => request<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    markRead: (id: number) => request<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request<{ message: string }>('/notifications/mark-all-read', { method: 'POST' }),
  },

  // Audit Logs (Admin Only)
  auditLogs: {
    list: (params: { action?: string; user_id?: number; search?: string; limit?: number } = {}) => {
      const query = new URLSearchParams(params as any);
      return request<{ logs: AuditLog[] }>(`/audit-logs?${query.toString()}`);
    },
  },

  // Exports (Admin Only)
  exports: {
    downloadLeadsCSVUrl: (params: Record<string, any> = {}) => {
      const query = new URLSearchParams(params as any);
      return `/api/exports/leads/csv?${query.toString()}`;
    },
  },

  // Live Google Sheet Automated Sync (Admin Only)
  googleSheets: {
    listConfigs: () =>
      request<{ configs: GoogleSheetConfig[] }>('/integrations/google-sheets/configs'),
    createConfig: (data: {
      sheet_name?: string;
      sheet_url: string;
      sync_frequency?: 'MANUAL' | 'HOURLY' | 'DAILY';
      source_id?: number;
      assign_consultant_id?: number;
      internal_business_id?: number;
    }) =>
      request<{ message: string; config_id: number; sheet_id: string; gid: string }>(
        '/integrations/google-sheets/configs',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
    updateConfig: (id: number, data: Partial<GoogleSheetConfig>) =>
      request<{ message: string }>(`/integrations/google-sheets/configs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteConfig: (id: number) =>
      request<{ message: string }>(`/integrations/google-sheets/configs/${id}`, {
        method: 'DELETE',
      }),
    syncNow: (id: number) =>
      request<{ message: string; result: any }>(`/integrations/google-sheets/sync-now/${id}`, {
        method: 'POST',
      }),
    getLogs: (id: number) =>
      request<{ logs: GoogleSheetSyncLog[] }>(`/integrations/google-sheets/logs/${id}`),
    getAppsScriptCode: (id: number) =>
      request<{ webhookUrl: string; scriptCode: string }>(
        `/integrations/google-sheets/apps-script-code/${id}`
      ),
  },
};

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Code,
  ExternalLink,
  Trash2,
  Edit2,
  Copy,
  Check,
  Zap,
  Filter,
  Users,
  Building2,
  Layers,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { GoogleSheetConfig, GoogleSheetSyncLog, User, LeadSource, Business } from '../../types/index.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export default function GoogleSheetSyncPage() {
  const [configs, setConfigs] = useState<GoogleSheetConfig[]>([]);
  const [consultants, setConsultants] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState<any | null>(null);

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GoogleSheetConfig | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [selectedScriptConfig, setSelectedScriptConfig] = useState<{ id: number; name: string } | null>(null);
  const [scriptData, setScriptData] = useState<{ webhookUrl: string; scriptCode: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Logs modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedLogsConfig, setSelectedLogsConfig] = useState<{ id: number; name: string } | null>(null);
  const [logs, setLogs] = useState<GoogleSheetSyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sheet_name: '',
    sheet_url: '',
    sync_frequency: 'DAILY' as 'MANUAL' | 'HOURLY' | 'DAILY',
    source_id: 1,
    assign_consultant_id: '',
    internal_business_id: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [confRes, consRes, srcRes, bizRes]: any[] = await Promise.all([
        api.googleSheets.listConfigs().catch(() => ({ configs: [] })),
        api.consultants.list().catch(() => ({ consultants: [] })),
        api.sources.list().catch(() => ({ sources: [] })),
        api.businesses.list().catch(() => ({ businesses: [] })),
      ]);
      setConfigs(Array.isArray(confRes) ? confRes : (confRes?.configs || []));
      setConsultants(Array.isArray(consRes) ? consRes : (consRes?.consultants || consRes?.users || []));
      setSources(Array.isArray(srcRes) ? srcRes : (srcRes?.sources || []));
      setBusinesses(Array.isArray(bizRes) ? bizRes : (bizRes?.businesses || []));
    } catch (err: any) {
      console.error('Failed to load Google Sheets configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingConfig(null);
    setFormData({
      sheet_name: 'MCA Live Daily Ingest Sheet',
      sheet_url: 'https://docs.google.com/spreadsheets/d/1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs/edit?gid=758135810#gid=758135810',
      sync_frequency: 'DAILY',
      source_id: 1,
      assign_consultant_id: '',
      internal_business_id: '',
    });
    setShowConfigModal(true);
  };

  const handleOpenEditModal = (config: GoogleSheetConfig) => {
    setEditingConfig(config);
    setFormData({
      sheet_name: config.sheet_name,
      sheet_url: config.sheet_url,
      sync_frequency: config.sync_frequency,
      source_id: config.source_id || 1,
      assign_consultant_id: config.assign_consultant_id ? String(config.assign_consultant_id) : '',
      internal_business_id: config.internal_business_id ? String(config.internal_business_id) : '',
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConfig) {
        await api.googleSheets.updateConfig(editingConfig.id, {
          sheet_name: formData.sheet_name,
          sheet_url: formData.sheet_url,
          sync_frequency: formData.sync_frequency,
          source_id: Number(formData.source_id) || 1,
          assign_consultant_id: formData.assign_consultant_id ? Number(formData.assign_consultant_id) : undefined,
          internal_business_id: formData.internal_business_id ? Number(formData.internal_business_id) : undefined,
        });
      } else {
        await api.googleSheets.createConfig({
          sheet_name: formData.sheet_name,
          sheet_url: formData.sheet_url,
          sync_frequency: formData.sync_frequency,
          source_id: Number(formData.source_id) || 1,
          assign_consultant_id: formData.assign_consultant_id ? Number(formData.assign_consultant_id) : undefined,
          internal_business_id: formData.internal_business_id ? Number(formData.internal_business_id) : undefined,
        });
      }
      setShowConfigModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save configuration');
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm('Are you sure you want to remove this Google Sheet sync configuration?')) return;
    try {
      await api.googleSheets.deleteConfig(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete configuration');
    }
  };

  const handleSyncNow = async (id: number) => {
    try {
      setSyncingId(id);
      setSyncResult(null);
      const res = await api.googleSheets.syncNow(id);
      setSyncResult(res.result);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenScript = async (config: GoogleSheetConfig) => {
    try {
      setSelectedScriptConfig({ id: config.id, name: config.sheet_name });
      setScriptData(null);
      setShowScriptModal(true);
      const res = await api.googleSheets.getAppsScriptCode(config.id);
      setScriptData(res);
    } catch (err: any) {
      alert(err.message || 'Failed to load script code');
    }
  };

  const handleOpenLogs = async (config: GoogleSheetConfig) => {
    try {
      setSelectedLogsConfig({ id: config.id, name: config.sheet_name });
      setShowLogsModal(true);
      setLoadingLogs(true);
      const res = await api.googleSheets.getLogs(config.id);
      setLogs(res.logs || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyToClipboard = (text: string, type: 'script' | 'webhook') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Live Google Sheets Auto-Sync Engine
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
              LIVE DAILY SYNC
            </span>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Continuously ingest newly incorporated companies on a daily basis filtered by <code className="text-emerald-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded">dateOfIncorporation</code> with automatic deduplication, lead scoring, and instant consultant allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-900/30 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Connect Google Sheet
          </button>
        </div>
      </div>

      {/* Sync Notification Banner if Sync Just Completed */}
      {syncResult && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-4 flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-200">
                Live Google Sheet Ingestion Successful! (Batch: {syncResult.batchId})
              </h4>
              <p className="text-xs text-emerald-300/80 mt-1">
                Ingested <strong className="text-white font-bold">{syncResult.importedCount}</strong> new leads •{' '}
                <strong className="text-white font-bold">{syncResult.duplicateCount}</strong> duplicate CIN/mobiles skipped •{' '}
                Latest Incorporation Date: <strong className="text-white font-mono">{syncResult.latestIncorporationDate || 'N/A'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setSyncResult(null)}
            className="text-xs text-emerald-400 hover:text-white px-2 py-1 bg-emerald-900/40 rounded hover:bg-emerald-800/60"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Config Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">No Google Sheets Connected Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2 mb-6">
            Connect your live MCA Google Sheet to automatically ingest new company incorporations daily with duplicate checks.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add First Google Sheet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configs.map((config) => {
            const isSyncing = syncingId === config.id;
            return (
              <div
                key={config.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {config.sync_frequency} SYNC
                      </span>
                      {config.last_sync_status === 'SUCCESS' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          HEALTHY
                        </span>
                      )}
                      {config.last_sync_status === 'FAILED' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          NEEDS ATTENTION
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(config)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title="Edit Config"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                        title="Delete Config"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & URL */}
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    {config.sheet_name}
                  </h3>
                  <a
                    href={config.sheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 truncate mb-4 group"
                  >
                    <ExternalLink className="w-3 h-3 group-hover:scale-110 transition shrink-0" />
                    <span className="truncate">{config.sheet_url}</span>
                  </a>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                        Latest Inc. Date Synced
                      </span>
                      <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {config.last_synced_incorporation_date || 'Not Synced Yet'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                        Total Ingested Leads
                      </span>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        {config.total_leads_synced.toLocaleString()} Leads
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                        Last Sync Time
                      </span>
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {config.last_sync_at ? new Date(config.last_sync_at).toLocaleString() : 'Never'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                        Auto-Assign Consultant
                      </span>
                      <div className="text-xs text-slate-300 flex items-center gap-1.5 truncate">
                        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{config.assigned_consultant_name || 'Unassigned (Pool)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Message */}
                  {config.last_sync_message && (
                    <div className="text-xs text-slate-400 bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-800 mb-4 line-clamp-2">
                      <strong className="text-slate-300">Status:</strong> {config.last_sync_message}
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenScript(config)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
                      title="Google Apps Script Setup"
                    >
                      <Code className="w-3.5 h-3.5 text-indigo-400" />
                      Apps Script / Webhook
                    </button>
                    <button
                      onClick={() => handleOpenLogs(config)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Logs
                    </button>
                  </div>

                  <button
                    onClick={() => handleSyncNow(config.id)}
                    disabled={isSyncing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          How Live Daily Incorporation Date Sync Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mb-2">
              1
            </div>
            <strong className="text-white block mb-1">Date of Incorporation Mapping</strong>
            The CRM engine automatically recognizes <code className="text-emerald-400 font-mono">dateOfIncorporation</code>, <code className="text-emerald-400 font-mono">Date of Incorporation</code>, <code className="text-emerald-400 font-mono">INCORPORATION_DATE</code>, and parses dates accurately across all standard date formats.
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mb-2">
              2
            </div>
            <strong className="text-white block mb-1">Intelligent Deduplication</strong>
            Before creating any lead, the engine verifies the CIN, Director Mobile, Alternate Mobile, Email, and Company Name against the CRM database to skip duplicates.
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center mb-2">
              3
            </div>
            <strong className="text-white block mb-1">Daily Automated Sync</strong>
            The backend executes an automated cron job every 24 hours (or hourly if selected). You can also click <strong>"Sync Now"</strong> anytime for instant live ingestion.
          </div>
        </div>
      </div>

      {/* Add / Edit Config Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={editingConfig ? 'Edit Google Sheet Config' : 'Connect New Google Sheet'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Configuration Name *
            </label>
            <input
              type="text"
              required
              value={formData.sheet_name}
              onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. MCA Daily Ingest Master Sheet"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Google Sheet URL *
            </label>
            <input
              type="url"
              required
              value={formData.sheet_url}
              onChange={(e) => setFormData({ ...formData, sheet_url: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              placeholder="https://docs.google.com/spreadsheets/d/1yOn7yaK-8vzjvJBLdes2h5ANgXkxWQ1wu9TEgV-4mVs/..."
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Supports both public sheet links and private sheets connected via Google Apps Script.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Sync Frequency
              </label>
              <select
                value={formData.sync_frequency}
                onChange={(e: any) => setFormData({ ...formData, sync_frequency: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="DAILY">Daily (Recommended)</option>
                <option value="HOURLY">Hourly</option>
                <option value="MANUAL">Manual On-Demand Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Lead Source Mapping
              </label>
              <select
                value={formData.source_id}
                onChange={(e) => setFormData({ ...formData, source_id: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Auto-Assign Consultant
              </label>
              <select
                value={formData.assign_consultant_id}
                onChange={(e) => setFormData({ ...formData, assign_consultant_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Leave Unassigned (Pool)</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Internal Business Vertical
              </label>
              <select
                value={formData.internal_business_id}
                onChange={(e) => setFormData({ ...formData, internal_business_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">No Default Business</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition"
            >
              {editingConfig ? 'Save Changes' : 'Connect & Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Google Apps Script Modal */}
      <Modal
        isOpen={showScriptModal}
        onClose={() => setShowScriptModal(false)}
        title={`Google Apps Script Webhook Setup: ${selectedScriptConfig?.name}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            If your Google Sheet is private or you want real-time push whenever new rows are added, install this lightweight Google Apps Script in your spreadsheet.
          </p>

          {/* Webhook URL */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Your Webhook Endpoint URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={scriptData?.webhookUrl || ''}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400"
              />
              <button
                onClick={() => scriptData?.webhookUrl && copyToClipboard(scriptData.webhookUrl, 'webhook')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs flex items-center gap-1.5 transition shrink-0"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedWebhook ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Script Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Google Apps Script Code
              </label>
              <button
                onClick={() => scriptData?.scriptCode && copyToClipboard(scriptData.scriptCode, 'script')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedScript ? 'Code Copied!' : 'Copy Script Code'}
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 max-h-72 overflow-y-auto leading-relaxed">
              {scriptData?.scriptCode || '// Loading script...'}
            </pre>
          </div>

          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3.5 text-xs text-indigo-200">
            <strong className="block text-white mb-1">Quick 1-Minute Setup Instructions:</strong>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
              <li>Open your Google Sheet and click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Delete all existing code, paste the script above, and click <strong>Save</strong>.</li>
              <li>Click <strong>Run &gt; sendAllRowsToCRM</strong> once to grant permission and test.</li>
              <li>To run daily automatically: Click the clock icon (<strong>Triggers</strong>) on the left sidebar &gt; <strong>Add Trigger</strong> &gt; Choose <strong>Time-driven &gt; Day timer</strong>.</li>
            </ol>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowScriptModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Sync Logs Modal */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title={`Sync Logs History: ${selectedLogsConfig?.name}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {loadingLogs ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No sync logs recorded yet for this Google Sheet.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-850 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="font-mono text-slate-300 font-bold">{log.batch_id || 'N/A'}</span>
                      <span className="text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-400">
                      Imported: <strong className="text-emerald-400">{log.new_leads_imported}</strong> • Duplicates
                      Skipped: <strong className="text-slate-300">{log.duplicates_skipped}</strong> • Latest DOI:{' '}
                      <strong className="text-slate-300 font-mono">{log.latest_incorporation_date || 'N/A'}</strong>
                    </div>
                    {log.error_message && (
                      <div className="text-rose-400 text-[11px] mt-1">{log.error_message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowLogsModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

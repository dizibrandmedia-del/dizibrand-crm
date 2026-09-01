import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ScoringRule } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import {
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Zap,
  PhoneCall,
  MessageCircle,
  Database,
  Building2,
  Lock,
  RefreshCw,
  Clock
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'scoring' | 'system' | 'outreach'>('scoring');

  // General System State Defaults
  const [currency, setCurrency] = useState('INR');
  const [workingHours, setWorkingHours] = useState('09:30 AM - 06:30 PM');
  const [autoDeduplicate, setAutoDeduplicate] = useState(true);
  const [waCountryCode, setWaCountryCode] = useState('+91');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.settings.getScoringRules();
      const rawRules = (res && (res.scoringRules || res.rules)) || [];
      const normalized: ScoringRule[] = rawRules.map((r: any) => ({
        id: r.id,
        rule_name: r.criterion_name || r.rule_name || r.criterion_key || 'Scoring Criterion',
        criteria_type: r.category || r.criteria_type || 'GENERAL',
        points: r.weight !== undefined ? r.weight : r.points !== undefined ? r.points : 15,
        description: r.description || `${r.category || 'General'} algorithmic weight factor`,
        is_active: r.is_active !== undefined ? r.is_active : 1,
        created_at: r.created_at || '',
      }));
      setScoringRules(normalized);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleScoreChange = (id: number, newPoints: number) => {
    setScoringRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, points: newPoints } : r))
    );
  };

  const handleToggleActive = (id: number) => {
    setScoringRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: r.is_active === 1 ? 0 : 1 } : r))
    );
  };

  const handleSaveRules = async () => {
    setIsSaving(true);
    try {
      await api.settings.updateScoringRules(scoringRules);
      toast.success('Lead scoring parameters updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update scoring rules');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            System & Lead Scoring Engine Settings
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure algorithmic weightages, deduplication policies, calling & WhatsApp outreach rules
          </p>
        </div>

        <button
          onClick={handleSaveRules}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isSaving ? 'Saving Settings...' : 'Save All Changes'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('scoring')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'scoring'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Lead Scoring Rules (PRD Section 13)
        </button>
        <button
          onClick={() => setActiveTab('outreach')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'outreach'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Calling & WhatsApp Protocols
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'system'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          General & Deduplication
        </button>
      </div>

      {activeTab === 'scoring' && (
        <div className="space-y-6">
          {/* Score Bands Guide Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-rose-500/30 text-center shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">🔥 Hot Band</span>
              <span className="text-lg font-black text-white block mt-0.5">75 – 100 pts</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Instant same-day call required</p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-amber-500/30 text-center shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">☀️ Warm Band</span>
              <span className="text-lg font-black text-white block mt-0.5">50 – 74 pts</span>
              <p className="text-[10px] text-slate-400 mt-0.5">High follow-up priority</p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-sky-500/30 text-center shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">❄️ Cold Band</span>
              <span className="text-lg font-black text-white block mt-0.5">25 – 49 pts</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Standard outreach queue</p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700 text-center shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">🗑️ Junk Band</span>
              <span className="text-lg font-black text-white block mt-0.5">0 – 24 pts</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Unreachable / Disqualified</p>
            </div>
          </div>

          {/* Scoring Rules Editor List */}
          {isLoading ? (
            <LoadingSpinner text="Fetching scoring criteria..." />
          ) : (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Dynamic Scoring Criteria & Point Weights</h3>
                  <p className="text-xs text-slate-400">Adjust the points added to each lead when these qualification criteria are met.</p>
                </div>
                <button
                  onClick={fetchSettings}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Refresh Rules"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {scoringRules.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No scoring rules configured in database.</p>
                ) : (
                  scoringRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{rule.rule_name}</span>
                          <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/40 font-semibold uppercase">
                            {rule.criteria_type}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{rule.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">Points:</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={rule.points}
                            onChange={(e) => handleScoreChange(rule.id, Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-bold text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(rule.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                            rule.is_active === 1
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {rule.is_active === 1 ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'outreach' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              Direct Calling & 1-Tap WhatsApp Protocol Rules
            </h3>
            <p className="text-xs text-slate-400 mt-1">Configure outreach defaults for consultants.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Default WhatsApp Country Code
              </label>
              <input
                type="text"
                value={waCountryCode}
                onChange={(e) => setWaCountryCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Prepended automatically to Indian 10-digit mobile numbers (+91).</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Working Calling Window
              </label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">Standard business hours for consultant call logging.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              General System & Deduplication Policy
            </h3>
            <p className="text-xs text-slate-400 mt-1">Security, Currency, and Deduplication configurations.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Default Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Applied to proposals, deals, and revenue attribution.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Automated Deduplication Engine
              </label>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setAutoDeduplicate(!autoDeduplicate)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    autoDeduplicate
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {autoDeduplicate ? 'Deduplication ACTIVE (CIN + Mobile + Email)' : 'Deduplication OFF'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Protects database against duplicate ingestion on Excel/Google Sheet imports.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

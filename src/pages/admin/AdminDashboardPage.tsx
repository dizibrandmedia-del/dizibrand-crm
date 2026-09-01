import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { CallModal } from '../../components/leads/CallModal';
import { WhatsAppModal } from '../../components/leads/WhatsAppModal';
import { FollowupModal } from '../../components/leads/FollowupModal';
import { PotentialHandoverModal } from '../../components/leads/PotentialHandoverModal';
import { Lead } from '../../types';
import {
  Users, PhoneCall, MessageCircle, CheckCircle2, Sparkles,
  Calendar, Award, DollarSign, TrendingUp, AlertTriangle,
  ArrowUpRight, Clock, Target, Layers, Building2, UploadCloud,
  FileText, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [activeModalLead, setActiveModalLead] = useState<Lead | null>(null);
  const [modalType, setModalType] = useState<'call' | 'whatsapp' | 'followup' | 'handover' | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await api.analytics.adminDashboard({
        date_range: dateRange,
        custom_from: customFrom || undefined,
        custom_to: customTo || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const kpis = data?.kpis || {};
  const attention = data?.attentionRequired || {};
  const funnel = data?.funnel || {};
  const sourcePerformance = data?.sourcePerformance || [];
  const businessPerformance = data?.businessPerformance || [];
  const consultantProductivity = data?.consultantProductivity || [];

  const funnelData = [
    { stage: 'New', count: funnel.new_count || 0, color: '#3b82f6' },
    { stage: 'Assigned', count: funnel.assigned_count || 0, color: '#6366f1' },
    { stage: 'Connected', count: funnel.connected_count || 0, color: '#06b6d4' },
    { stage: 'Interested', count: funnel.interested_count || 0, color: '#10b981' },
    { stage: 'Qualified', count: funnel.qualified_count || 0, color: '#14b8a6' },
    { stage: 'Potential', count: funnel.handover_count || 0, color: '#f59e0b' },
    { stage: 'Meeting', count: funnel.meeting_count || 0, color: '#0284c7' },
    { stage: 'Proposal', count: funnel.proposal_count || 0, color: '#7c3aed' },
    { stage: 'Won', count: funnel.won_count || 0, color: '#059669' },
  ];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Top Header & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            Executive Command Center
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-Business Sales Pipeline, MCA Batch Performance, Consultant Targets & Revenue Attribution
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                dateRange === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Grid (PRD Section 24) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Leads"
          value={kpis.total_leads || 0}
          icon={<Users className="w-5 h-5" />}
          subtitle={`${kpis.assigned_leads || 0} assigned • ${kpis.unassigned_leads || 0} unassigned`}
          colorTheme="indigo"
        />

        <StatCard
          title="Calls & Connected"
          value={kpis.total_calls || 0}
          icon={<PhoneCall className="w-5 h-5" />}
          subtitle={`${kpis.connected_calls || 0} connected calls`}
          colorTheme="emerald"
        />

        <StatCard
          title="WhatsApp Sent"
          value={kpis.total_whatsapp || 0}
          icon={<MessageCircle className="w-5 h-5" />}
          subtitle="Outreach touches"
          colorTheme="sky"
        />

        <StatCard
          title="Potential Handovers"
          value={kpis.potential_leads || 0}
          icon={<Sparkles className="w-5 h-5" />}
          subtitle="High-intent opportunities"
          colorTheme="amber"
        />

        <StatCard
          title="Meetings & Proposals"
          value={kpis.total_meetings || 0}
          icon={<Calendar className="w-5 h-5" />}
          subtitle={`${kpis.total_proposals || 0} active proposals`}
          colorTheme="purple"
        />

        <StatCard
          title="Closed Won Revenue"
          value={`₹${((kpis.total_revenue || 0) / 100000).toFixed(2)}L`}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle={`${kpis.won_deals || 0} won deals`}
          colorTheme="emerald"
        />
      </div>

      {/* ATTENTION REQUIRED SECTION (PRD Section 24) */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Attention Required
            </h2>
          </div>
          <span className="text-xs text-slate-400">Critical items requiring management action</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          {/* Overdue Follow-ups */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Overdue Follow-ups ({attention.overdueFollowups?.length || 0})
              </span>
              <Link to="/admin/followups" className="text-[11px] text-indigo-400 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {(!attention.overdueFollowups || attention.overdueFollowups.length === 0) ? (
                <p className="text-slate-500 py-2">No overdue follow-ups! Clean queue.</p>
              ) : (
                attention.overdueFollowups.slice(0, 3).map((f: any) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedLeadId(f.lead_id)}
                    className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800/80 cursor-pointer border border-rose-900/30 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 truncate">{f.company_name}</span>
                      <span className="text-[10px] text-rose-400 font-mono font-bold">{f.followup_date}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Consultant: {f.consultant_name}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hot Unclosed Leads */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Hot Pipeline Leads ({attention.hotLeads?.length || 0})
              </span>
              <Link to="/admin/leads?priority=HOT" className="text-[11px] text-indigo-400 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {(!attention.hotLeads || attention.hotLeads.length === 0) ? (
                <p className="text-slate-500 py-2">No hot leads pending.</p>
              ) : (
                attention.hotLeads.slice(0, 3).map((l: any) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLeadId(l.id)}
                    className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800/80 cursor-pointer border border-amber-900/30 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 truncate">{l.company_name}</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                        Score {l.lead_score}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{l.contact_person} • {l.city || 'India'}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Untouched Fresh Leads */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Untouched Leads ({attention.untouchedLeads?.length || 0})
              </span>
              <Link to="/admin/leads?status=NEW" className="text-[11px] text-indigo-400 hover:underline">Assign</Link>
            </div>
            <div className="space-y-2">
              {(!attention.untouchedLeads || attention.untouchedLeads.length === 0) ? (
                <p className="text-slate-500 py-2">All leads have been worked!</p>
              ) : (
                attention.untouchedLeads.slice(0, 3).map((l: any) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLeadId(l.id)}
                    className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800/80 cursor-pointer border border-indigo-900/30 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 truncate">{l.company_name}</span>
                      <span className="text-[10px] text-slate-400">{l.source_name || 'Import'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{l.contact_person} • {l.mobile}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Lead Conversion Funnel & Internal Business Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel Chart */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Full Sales Conversion Funnel</h3>
              <p className="text-xs text-slate-400">Lead Stage progression from Ingestion to Won Deal</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Won: {funnel.won_count || 0}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="stage" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Internal Business Verticals Performance (STRICTLY ADMIN ONLY - PRD Section 2) */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Internal Business Vertical ROI (Admin Only)
              </h3>
              <p className="text-xs text-slate-400">Dizibrand, Strategic HR, Fyntrust, No Brokerage</p>
            </div>
            <Link to="/admin/businesses" className="text-xs text-indigo-400 hover:underline">Manage</Link>
          </div>

          <div className="space-y-3">
            {businessPerformance.map((b: any) => (
              <div key={b.business_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white text-sm block">{b.business_name}</span>
                  <span className="text-slate-400 text-[11px]">
                    {b.total_leads} leads • {b.qualified_leads} qualified • {b.won_deals} closed deals
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-emerald-400 text-sm block">
                    ₹{(b.total_revenue || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Revenue</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consultant Productivity & Target vs Actual Leaderboard (PRD Section 26) */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Business Consultant Productivity Leaderboard
            </h3>
            <p className="text-xs text-slate-400">Comparing Daily Targets vs Actual Calling, WhatsApp, Handovers & Revenue</p>
          </div>
          <Link to="/admin/team" className="text-xs text-indigo-400 hover:underline">Manage Team</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Consultant</th>
                <th className="py-2.5 px-3">Today Calls (Target vs Actual)</th>
                <th className="py-2.5 px-3">Connected</th>
                <th className="py-2.5 px-3">WhatsApp</th>
                <th className="py-2.5 px-3">Follow-ups Today</th>
                <th className="py-2.5 px-3">Potential Handovers</th>
                <th className="py-2.5 px-3 text-right">Attributed Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {consultantProductivity.map((c: any) => {
                const target = c.daily_call_target || 20;
                const actual = c.today_calls || 0;
                const percentage = Math.min(Math.round((actual / target) * 100), 100);

                return (
                  <tr key={c.consultant_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{c.consultant_name}</span>
                      <span className="text-[10px] text-slate-400">{c.assigned_leads} total leads in queue</span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-200">{actual}/{target}</span>
                        <span className="text-[10px] text-slate-400">({percentage}%)</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-semibold text-cyan-400">{c.today_connected}</td>
                    <td className="py-3 px-3 font-semibold text-teal-400">{c.today_whatsapp}</td>
                    <td className="py-3 px-3 font-semibold text-purple-400">{c.today_followups}</td>
                    <td className="py-3 px-3 font-bold text-amber-400">{c.total_potential_handovers}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      ₹{(c.attributed_revenue || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Source ROI & Performance */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Lead Source ROI & Conversion Performance
            </h3>
            <p className="text-xs text-slate-400">MCA Database, Google Ads, LinkedIn, Meta, Website, Referrals</p>
          </div>
          <Link to="/admin/sources" className="text-xs text-indigo-400 hover:underline">Manage Sources</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {sourcePerformance.map((s: any) => (
            <div key={s.source_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="font-bold text-white block truncate">{s.source_name}</span>
              <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
                <p>Leads: <span className="text-slate-200 font-bold">{s.total_leads}</span></p>
                <p>Won Deals: <span className="text-emerald-400 font-bold">{s.won_deals}</span></p>
                <p className="font-mono font-bold text-emerald-300 mt-1">₹{(s.total_revenue || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Lead Detail Modal */}
      <LeadDetailModal
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        leadId={selectedLeadId}
        onCall={(l) => {
          setActiveModalLead(l);
          setModalType('call');
        }}
        onWhatsApp={(l) => {
          setActiveModalLead(l);
          setModalType('whatsapp');
        }}
        onFollowup={(l) => {
          setActiveModalLead(l);
          setModalType('followup');
        }}
        onPotentialHandover={(l) => {
          setActiveModalLead(l);
          setModalType('handover');
        }}
        onStatusUpdated={fetchDashboardData}
        isSuperAdmin={true}
      />

      {/* Action Modals */}
      <CallModal
        isOpen={modalType === 'call'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchDashboardData}
      />

      <WhatsAppModal
        isOpen={modalType === 'whatsapp'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchDashboardData}
      />

      <FollowupModal
        isOpen={modalType === 'followup'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchDashboardData}
      />

      <PotentialHandoverModal
        isOpen={modalType === 'handover'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};

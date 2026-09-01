import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Lead } from '../../types';
import { PriorityBadge, ScoreBadge, StatusBadge } from '../../components/common/Badge';
import { LeadCard } from '../../components/leads/LeadCard';
import { CallModal } from '../../components/leads/CallModal';
import { WhatsAppModal } from '../../components/leads/WhatsAppModal';
import { FollowupModal } from '../../components/leads/FollowupModal';
import { PotentialHandoverModal } from '../../components/leads/PotentialHandoverModal';
import { CompleteFollowupModal } from '../../components/leads/CompleteFollowupModal';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Phone, MessageCircle, Calendar, Sparkles, Clock,
  AlertTriangle, Target, CheckCircle2, Flame, User, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ConsultantDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [activeModalLead, setActiveModalLead] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedFollowup, setSelectedFollowup] = useState<any>(null);
  const [modalType, setModalType] = useState<'call' | 'whatsapp' | 'followup' | 'handover' | 'complete_followup' | null>(null);

  const fetchConsultantDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.analytics.consultantDashboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load consultant dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultantDashboard();
  }, []);

  if (isLoading || !data) {
    return <LoadingSpinner text="Loading your personal workspace & daily calling queue..." />;
  }

  const targets = data.targets || {};
  const metrics = data.todayMetrics || {};
  const actionQueue = data.actionQueue || {};

  const callTarget = targets.daily_call_target || 20;
  const callsDone = metrics.today_calls || 0;
  const callPercentage = Math.min(Math.round((callsDone / callTarget) * 100), 100);

  const waTarget = targets.daily_whatsapp_target || 20;
  const waDone = metrics.today_whatsapp || 0;
  const waPercentage = Math.min(Math.round((waDone / waTarget) * 100), 100);

  const leadTarget = targets.daily_lead_target || 50;
  const leadsWorked = metrics.today_leads_worked || 0;
  const leadPercentage = Math.min(Math.round((leadsWorked / leadTarget) * 100), 100);

  return (
    <div className="space-y-5 pb-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-900/50 shadow-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Consultant Workspace
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-0.5">
              Hello, {user?.name || 'Consultant'} 👋
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Let's hit today's outreach targets and qualify new potential leads!
            </p>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block">Queue Pipeline</span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {metrics.total_assigned_leads || 0} Assigned
            </span>
          </div>
        </div>

        {/* Daily Target Progress Rings / Bars (PRD Section 28) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-800/80 text-center">
          {/* Calls Target */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Calls Today
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono mt-0.5 block">
              {callsDone} / {callTarget}
            </span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${callPercentage}%` }} />
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">{callPercentage}% reached</span>
          </div>

          {/* WhatsApp Target */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              WhatsApp
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-teal-400 font-mono mt-0.5 block">
              {waDone} / {waTarget}
            </span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: `${waPercentage}%` }} />
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">{waPercentage}% reached</span>
          </div>

          {/* Leads Worked */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Leads Worked
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-indigo-400 font-mono mt-0.5 block">
              {leadsWorked} / {leadTarget}
            </span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${leadPercentage}%` }} />
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">{leadPercentage}% reached</span>
          </div>
        </div>
      </div>

      {/* Overdue Follow-ups Alert Banner (PRD Section 28) */}
      {actionQueue.overdueFollowups?.length > 0 && (
        <div className="bg-rose-500/10 border-2 border-rose-500/40 p-4 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span>OVERDUE FOLLOW-UPS ({actionQueue.overdueFollowups.length})</span>
            </div>
            <Link to="/consultant/followups?tab=overdue" className="text-xs text-rose-300 font-bold hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actionQueue.overdueFollowups.slice(0, 4).map((f: any) => (
              <div
                key={f.id}
                className="p-3 bg-slate-900 rounded-xl border border-rose-900/50 flex items-center justify-between text-xs text-white"
              >
                <div>
                  <span className="font-bold block truncate max-w-[160px]">{f.company_name}</span>
                  <span className="text-[10px] text-rose-400 font-mono font-bold">Due: {f.followup_date} at {f.followup_time}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedFollowup(f);
                    setModalType('complete_followup');
                  }}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg transition active:scale-95"
                >
                  Action Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Scheduled Follow-ups */}
      <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Today's Scheduled Follow-ups ({actionQueue.todayFollowups?.length || 0})
            </h2>
          </div>
          <Link to="/consultant/followups" className="text-xs text-indigo-400 hover:underline">
            Follow-up Queue
          </Link>
        </div>

        {(!actionQueue.todayFollowups || actionQueue.todayFollowups.length === 0) ? (
          <p className="text-xs text-slate-500 py-3 text-center">No more follow-ups scheduled for today. Great job!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionQueue.todayFollowups.map((f: any) => (
              <div key={f.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block truncate max-w-[180px]">{f.company_name}</span>
                  <span className="text-slate-400 text-[11px]">{f.contact_person} • <span className="font-mono text-indigo-300">{f.mobile}</span></span>
                  <span className="text-[10px] text-indigo-400 font-mono block mt-0.5">Time: {f.followup_time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setActiveModalLead({
                        id: f.lead_id,
                        lead_id: f.lead_code || '',
                        company_name: f.company_name,
                        contact_person: f.contact_person,
                        mobile: f.mobile,
                        status: 'FOLLOW_UP',
                        priority: f.priority,
                        lead_score: 70,
                        lead_score_band: 'HOT',
                        country: 'India',
                        created_at: '',
                        updated_at: '',
                      });
                      setModalType('call');
                    }}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg active:scale-95"
                    title="Direct Call"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFollowup(f);
                      setModalType('complete_followup');
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-[11px]"
                  >
                    Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Untouched & Hot Assigned Leads Queue (PRD Section 28) */}
      <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Fresh & Hot Leads To Contact First
            </h2>
          </div>
          <Link to="/consultant/leads" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
            All Assigned Leads <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(!actionQueue.untouchedLeads || actionQueue.untouchedLeads.length === 0) ? (
          <p className="text-xs text-slate-500 py-4 text-center">No untouched leads in your queue.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actionQueue.untouchedLeads.slice(0, 6).map((l: Lead) => (
              <LeadCard
                key={l.id}
                lead={l}
                onCall={(lead) => {
                  setActiveModalLead(lead);
                  setModalType('call');
                }}
                onWhatsApp={(lead) => {
                  setActiveModalLead(lead);
                  setModalType('whatsapp');
                }}
                onFollowup={(lead) => {
                  setActiveModalLead(lead);
                  setModalType('followup');
                }}
                onPotentialHandover={(lead) => {
                  setActiveModalLead(lead);
                  setModalType('handover');
                }}
                onViewDetails={(lead) => setSelectedLeadId(lead.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared Modals */}
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
        onStatusUpdated={fetchConsultantDashboard}
        isSuperAdmin={false}
      />

      <CallModal
        isOpen={modalType === 'call'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchConsultantDashboard}
      />

      <WhatsAppModal
        isOpen={modalType === 'whatsapp'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchConsultantDashboard}
      />

      <FollowupModal
        isOpen={modalType === 'followup'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchConsultantDashboard}
      />

      <PotentialHandoverModal
        isOpen={modalType === 'handover'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchConsultantDashboard}
      />

      <CompleteFollowupModal
        isOpen={modalType === 'complete_followup'}
        onClose={() => setModalType(null)}
        followup={selectedFollowup}
        onSuccess={fetchConsultantDashboard}
      />
    </div>
  );
};

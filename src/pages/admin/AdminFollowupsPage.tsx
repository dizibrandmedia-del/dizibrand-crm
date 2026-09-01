import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { FollowUp, Lead, LeadStatus } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { CompleteFollowupModal } from '../../components/leads/CompleteFollowupModal';
import { CallModal } from '../../components/leads/CallModal';
import { WhatsAppModal } from '../../components/leads/WhatsAppModal';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import {
  Calendar, Clock, CheckCircle2, Phone, MessageCircle,
  AlertTriangle, Filter, Flame, Eye
} from 'lucide-react';

export const AdminFollowupsPage: React.FC = () => {
  const [view, setView] = useState<'today' | 'overdue' | 'upcoming' | 'hot' | 'all'>('today');
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [counts, setCounts] = useState({ today_count: 0, overdue_count: 0, upcoming_count: 0, hot_count: 0, total_pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [modalType, setModalType] = useState<'complete' | 'call' | 'whatsapp' | null>(null);

  const fetchFollowups = async () => {
    setIsLoading(true);
    try {
      const res = await api.followups.list({ view });
      setFollowups(res.followups);
      setCounts(res.counts);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch follow-ups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, [view]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Central Follow-ups Queue
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Organization-wide follow-up management with automated overdue tracking and status progression
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setView('today')}
            className={`px-3 py-1.5 rounded-lg transition ${
              view === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Today ({counts.today_count})
          </button>

          <button
            onClick={() => setView('overdue')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              view === 'overdue' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue ({counts.overdue_count})
          </button>

          <button
            onClick={() => setView('upcoming')}
            className={`px-3 py-1.5 rounded-lg transition ${
              view === 'upcoming' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming ({counts.upcoming_count})
          </button>

          <button
            onClick={() => setView('hot')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              view === 'hot' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Hot ({counts.hot_count})
          </button>

          <button
            onClick={() => setView('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              view === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Pending ({counts.total_pending})
          </button>
        </div>
      </div>

      {/* Main List Table */}
      {isLoading ? (
        <LoadingSpinner text="Fetching follow-ups queue..." />
      ) : followups.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-indigo-500" />}
          title={`No ${view.toUpperCase()} Follow-ups Found`}
          description="Your queue for this category is currently empty."
        />
      ) : (
        <div className="space-y-3">
          {followups.map((f) => {
            const isOverdue = f.is_overdue === 1;

            return (
              <div
                key={f.id}
                className={`bg-slate-900/90 rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md ${
                  isOverdue ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800'
                }`}
              >
                {/* Left: Info */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{f.lead_code}</span>
                    <PriorityBadge priority={f.priority} />
                    {f.lead_status && <StatusBadge status={f.lead_status} />}
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => setSelectedLeadId(f.lead_id)}
                    className="text-base font-bold text-white hover:text-indigo-400 cursor-pointer"
                  >
                    {f.company_name}
                  </h3>

                  <p className="text-xs text-slate-300">
                    Contact: <strong className="text-white">{f.contact_person}</strong> • <span className="font-mono font-bold text-indigo-300">{f.mobile}</span>
                  </p>

                  <p className="text-xs text-slate-400">
                    Reason: <span className="text-slate-200 font-medium">{f.reason || 'Follow-up Call'}</span>
                    {f.remark && <span className="text-slate-400 italic"> — "{f.remark}"</span>}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>Assigned Consultant: <strong className="text-slate-200">{f.consultant_name}</strong></span>
                    <span>•</span>
                    <span className={`font-mono font-bold ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                      Due: {f.followup_date} at {f.followup_time}
                    </span>
                  </div>
                </div>

                {/* Right: Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                  <button
                    onClick={() => {
                      setActiveLead({
                        id: f.lead_id,
                        lead_id: f.lead_code || '',
                        company_name: f.company_name || '',
                        contact_person: f.contact_person || '',
                        mobile: f.mobile || '',
                        status: (f.lead_status as LeadStatus) || 'FOLLOW_UP',
                        priority: f.priority,
                        lead_score: f.lead_score || 60,
                        lead_score_band: 'WARM',
                        country: 'India',
                        created_at: f.created_at,
                        updated_at: f.created_at,
                      });
                      setModalType('call');
                    }}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                    title="Direct Call"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    Call
                  </button>

                  <button
                    onClick={() => {
                      setActiveLead({
                        id: f.lead_id,
                        lead_id: f.lead_code || '',
                        company_name: f.company_name || '',
                        contact_person: f.contact_person || '',
                        mobile: f.mobile || '',
                        status: (f.lead_status as LeadStatus) || 'FOLLOW_UP',
                        priority: f.priority,
                        lead_score: f.lead_score || 60,
                        lead_score_band: 'WARM',
                        country: 'India',
                        created_at: f.created_at,
                        updated_at: f.created_at,
                      });
                      setModalType('whatsapp');
                    }}
                    className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                    title="Direct WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      setSelectedFollowup(f);
                      setModalType('complete');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Complete / Reschedule
                  </button>

                  <button
                    onClick={() => setSelectedLeadId(f.lead_id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="View Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CompleteFollowupModal
        isOpen={modalType === 'complete'}
        onClose={() => setModalType(null)}
        followup={selectedFollowup}
        onSuccess={fetchFollowups}
      />

      <CallModal
        isOpen={modalType === 'call'}
        onClose={() => setModalType(null)}
        lead={activeLead}
        onSuccess={fetchFollowups}
      />

      <WhatsAppModal
        isOpen={modalType === 'whatsapp'}
        onClose={() => setModalType(null)}
        lead={activeLead}
        onSuccess={fetchFollowups}
      />

      <LeadDetailModal
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        leadId={selectedLeadId}
        onCall={(l) => {
          setActiveLead(l);
          setModalType('call');
        }}
        onWhatsApp={(l) => {
          setActiveLead(l);
          setModalType('whatsapp');
        }}
        onFollowup={() => {}}
        onPotentialHandover={() => {}}
        onStatusUpdated={fetchFollowups}
        isSuperAdmin={true}
      />
    </div>
  );
};

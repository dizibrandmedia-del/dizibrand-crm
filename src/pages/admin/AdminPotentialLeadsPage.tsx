import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { PotentialHandover, Business, User, Lead } from '../../types';
import { StatusBadge, PriorityBadge, ScoreBadge } from '../../components/common/Badge';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { CallModal } from '../../components/leads/CallModal';
import { WhatsAppModal } from '../../components/leads/WhatsAppModal';
import { MeetingModal } from '../../components/sales/MeetingModal';
import { ProposalModal } from '../../components/sales/ProposalModal';
import { CloseDealModal } from '../../components/sales/CloseDealModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import {
  Sparkles, Phone, MessageCircle, Calendar, Award,
  CheckCircle2, ArrowRight, UserCheck, Eye, Clock, Building
} from 'lucide-react';

export const AdminPotentialLeadsPage: React.FC = () => {
  const [potentialLeads, setPotentialLeads] = useState<PotentialHandover[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [consultants, setConsultants] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [activeHandover, setActiveHandover] = useState<PotentialHandover | null>(null);
  const [modalType, setModalType] = useState<'call' | 'whatsapp' | 'meeting' | 'proposal' | 'deal' | 'takeover' | null>(null);

  // Takeover form state
  const [takeoverStatus, setTakeoverStatus] = useState('CONTACTED');
  const [takeoverNotes, setTakeoverNotes] = useState('');
  const [isUpdatingTakeover, setIsUpdatingTakeover] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pRes, bRes, cRes] = await Promise.all([
        api.potentialLeads.list({
          status: statusFilter || undefined,
          search: search.trim() || undefined,
        }),
        api.businesses.list(),
        api.consultants.list(),
      ]);
      setPotentialLeads(pRes.potentialLeads);
      setBusinesses(bRes.businesses);
      setConsultants(cRes.consultants);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load potential leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, search]);

  const handleOpenTakeover = (handover: PotentialHandover) => {
    setActiveHandover(handover);
    setTakeoverStatus(handover.admin_status || 'CONTACTED');
    setTakeoverNotes(handover.admin_notes || '');
    setModalType('takeover');
  };

  const handleSaveTakeover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHandover) return;

    setIsUpdatingTakeover(true);
    try {
      await api.potentialLeads.adminAction(activeHandover.id, {
        admin_status: takeoverStatus,
        admin_notes: takeoverNotes.trim() || undefined,
      });

      toast.success('Potential lead takeover status updated!');
      setModalType(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update takeover status');
    } finally {
      setIsUpdatingTakeover(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 p-5 rounded-2xl border border-amber-800/40 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500 rounded-xl text-slate-950 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Potential Leads & Closing Takeover Queue
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {potentialLeads.length} Opportunities
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              High-intent opportunities handed over by Business Consultants for Super Admin executive closing & proposal negotiation.
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Handover Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="CONTACTED">Owner Contacted</option>
            <option value="MEETING_SET">Meeting Scheduled</option>
            <option value="PROPOSAL_SENT">Proposal Sent</option>
            <option value="NEGOTIATING">In Negotiation</option>
            <option value="WON">Closed Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <LoadingSpinner text="Loading potential opportunities queue..." />
      ) : potentialLeads.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8 text-amber-500" />}
          title="No Potential Leads Pending Review"
          description="When Business Consultants qualify an opportunity and click 'Send as Potential Lead', they immediately appear here for closing takeover."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {potentialLeads.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl hover:border-amber-500/40 transition-all space-y-4"
            >
              {/* Card Top: Company, Status, Badges */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400">{p.lead_code}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Handover: {p.admin_status}
                    </span>
                    <StatusBadge status={p.current_lead_status || 'OWNER_HANDOVER'} />
                  </div>
                  <h3
                    onClick={() => setSelectedLeadId(p.lead_id)}
                    className="text-base sm:text-lg font-black text-white hover:text-amber-400 cursor-pointer mt-1"
                  >
                    {p.company_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Contact: <strong className="text-slate-200">{p.contact_person}</strong> • Mobile: <strong className="text-indigo-300 font-mono">{p.mobile}</strong> • City: {p.city || 'India'}
                  </p>
                </div>

                {/* Attribution & Consultant Tag */}
                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-xs">
                  <span className="text-slate-400 text-[11px]">Submitted by:</span>
                  <span className="font-bold text-indigo-300">{p.consultant_name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Requirement & Details Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                    Core Requirement & Budget
                  </span>
                  <p className="text-sm font-extrabold text-white">{p.requirement}</p>
                  <p className="text-slate-300 leading-relaxed">{p.requirement_details}</p>
                  <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      Budget: <strong className="text-emerald-400">{p.budget || 'Not Disclosed'}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      Urgency: <strong className="text-amber-400">{p.urgency}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      Authority: <strong className="text-indigo-300">{p.decision_maker}</strong>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                      Consultant Notes & Recommended Step
                    </span>
                    {p.call_remark && (
                      <p className="text-slate-300 mt-1 italic text-[11px]">
                        Call: "{p.call_remark}"
                      </p>
                    )}
                    {p.whatsapp_summary && (
                      <p className="text-slate-400 mt-0.5 italic text-[11px]">
                        WhatsApp: "{p.whatsapp_summary}"
                      </p>
                    )}
                    <div className="mt-2 p-2 bg-indigo-950/40 rounded-lg border border-indigo-900/40">
                      <span className="text-[10px] font-bold text-indigo-300 block uppercase">Recommended Next Action:</span>
                      <p className="text-white font-semibold text-xs mt-0.5">{p.recommended_next_action}</p>
                    </div>
                  </div>

                  {p.admin_notes && (
                    <p className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-900/30">
                      Admin Notes: {p.admin_notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Super Admin Takeover Action Toolbar (PRD Section 19) */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveLead({
                        id: p.lead_id,
                        lead_id: p.lead_code || '',
                        company_name: p.company_name,
                        contact_person: p.contact_person,
                        mobile: p.mobile,
                        status: p.current_lead_status || 'OWNER_HANDOVER',
                        priority: p.priority || 'HOT',
                        lead_score: p.lead_score || 85,
                        lead_score_band: p.lead_score_band || 'HOT',
                        country: 'India',
                        created_at: p.created_at,
                        updated_at: p.updated_at,
                      });
                      setModalType('call');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    Call Client
                  </button>

                  <button
                    onClick={() => {
                      setActiveLead({
                        id: p.lead_id,
                        lead_id: p.lead_code || '',
                        company_name: p.company_name,
                        contact_person: p.contact_person,
                        mobile: p.mobile,
                        status: p.current_lead_status || 'OWNER_HANDOVER',
                        priority: p.priority || 'HOT',
                        lead_score: p.lead_score || 85,
                        lead_score_band: p.lead_score_band || 'HOT',
                        country: 'India',
                        created_at: p.created_at,
                        updated_at: p.updated_at,
                      });
                      setModalType('whatsapp');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      setActiveHandover(p);
                      setModalType('meeting');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Schedule Meeting
                  </button>

                  <button
                    onClick={() => {
                      setActiveHandover(p);
                      setModalType('proposal');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-sm transition"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Send Proposal
                  </button>

                  <button
                    onClick={() => {
                      setActiveHandover(p);
                      setModalType('deal');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Close Deal Won
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenTakeover(p)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
                  >
                    Update Takeover Status
                  </button>

                  <button
                    onClick={() => setSelectedLeadId(p.lead_id)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                    title="View Full Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Takeover Status Update Modal */}
      {modalType === 'takeover' && activeHandover && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-3">Update Handover Stage</h3>
            <form onSubmit={handleSaveTakeover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Handover Stage</label>
                <select
                  value={takeoverStatus}
                  onChange={(e) => setTakeoverStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                >
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="CONTACTED">Contacted by Super Admin</option>
                  <option value="MEETING_SET">Meeting Scheduled</option>
                  <option value="PROPOSAL_SENT">Proposal Submitted</option>
                  <option value="NEGOTIATING">Under Negotiation</option>
                  <option value="WON">Closed Won Deal</option>
                  <option value="LOST">Lost / Unqualified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Executive Notes</label>
                <textarea
                  value={takeoverNotes}
                  onChange={(e) => setTakeoverNotes(e.target.value)}
                  rows={3}
                  placeholder="Feedback on client discussion, terms agreed, next milestone..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-xs bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTakeover}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl"
                >
                  {isUpdatingTakeover ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Modals */}
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
        onStatusUpdated={fetchData}
        isSuperAdmin={true}
      />

      <CallModal
        isOpen={modalType === 'call'}
        onClose={() => setModalType(null)}
        lead={activeLead}
        onSuccess={fetchData}
      />

      <WhatsAppModal
        isOpen={modalType === 'whatsapp'}
        onClose={() => setModalType(null)}
        lead={activeLead}
        onSuccess={fetchData}
      />

      {activeHandover && (
        <MeetingModal
          isOpen={modalType === 'meeting'}
          onClose={() => setModalType(null)}
          leadId={activeHandover.lead_id}
          companyName={activeHandover.company_name}
          onSuccess={fetchData}
        />
      )}

      {activeHandover && (
        <ProposalModal
          isOpen={modalType === 'proposal'}
          onClose={() => setModalType(null)}
          leadId={activeHandover.lead_id}
          companyName={activeHandover.company_name}
          onSuccess={fetchData}
        />
      )}

      {activeHandover && (
        <CloseDealModal
          isOpen={modalType === 'deal'}
          onClose={() => setModalType(null)}
          leadId={activeHandover.lead_id}
          companyName={activeHandover.company_name}
          businesses={businesses}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Lead, Call, WhatsAppActivity, FollowUp, PotentialHandover, Meeting, Proposal, Deal, LeadActivity } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge, PriorityBadge, ScoreBadge } from '../common/Badge';
import { api } from '../../api/client';
import { toast } from 'sonner';
import {
  Phone, MessageCircle, Calendar, Sparkles, Plus, Clock, MapPin,
  Globe, Mail, User, Building, FileText, CheckCircle2, History,
  TrendingUp, ExternalLink, ShieldCheck, UserX
} from 'lucide-react';
import { ReassignWarningModal } from './ReassignWarningModal';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number | null;
  onCall: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onFollowup: (lead: Lead) => void;
  onPotentialHandover: (lead: Lead) => void;
  onStatusUpdated?: () => void;
  isSuperAdmin?: boolean;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  leadId,
  onCall,
  onWhatsApp,
  onFollowup,
  onPotentialHandover,
  onStatusUpdated,
  isSuperAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'calls' | 'whatsapp' | 'followups' | 'handover' | 'sales' | 'details'>('timeline');
  const [leadData, setLeadData] = useState<{
    lead: Lead;
    activities: LeadActivity[];
    calls: Call[];
    whatsapp: WhatsAppActivity[];
    followups: FollowUp[];
    potentialHandover?: PotentialHandover;
    meetings: Meeting[];
    proposals: Proposal[];
    deal?: Deal;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [isAddingRemark, setIsAddingRemark] = useState(false);
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);

  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setIsLoading(true);
    try {
      const data = await api.leads.getById(leadId);
      setLeadData(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch lead details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) {
      fetchLeadDetails();
    } else {
      setLeadData(null);
    }
  }, [isOpen, leadId]);

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemark.trim() || !leadId) return;

    setIsAddingRemark(true);
    try {
      await api.activities.addRemark(leadId, newRemark.trim());
      setNewRemark('');
      toast.success('Remark added to timeline!');
      fetchLeadDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add remark');
    } finally {
      setIsAddingRemark(false);
    }
  };

  if (!isOpen || !leadId) return null;

  const lead = leadData?.lead;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      {isLoading || !lead ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-xs text-slate-500 font-medium">Loading Lead Profile & Timeline...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400">{lead.lead_id}</span>
                  {lead.batch_id && (
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {lead.batch_id}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">{lead.company_name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                  <span>{lead.contact_person} {lead.designation ? `(${lead.designation})` : ''}</span>
                  <span>•</span>
                  <span className="font-mono font-bold text-indigo-300">{lead.mobile}</span>
                  {lead.city && (
                    <>
                      <span>•</span>
                      <span>{lead.city}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PriorityBadge priority={lead.priority} />
                <ScoreBadge score={lead.lead_score} band={lead.lead_score_band} />
                <StatusBadge status={lead.status} />
              </div>
            </div>

            {/* CTA Action Buttons Bar */}
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => onCall(lead)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
                CALL
              </button>

              <button
                type="button"
                onClick={() => onWhatsApp(lead)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs shadow-md transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WHATSAPP
              </button>

              <button
                type="button"
                onClick={() => onFollowup(lead)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-md transition"
              >
                <Calendar className="w-3.5 h-3.5" />
                FOLLOW-UP
              </button>

              {lead.status !== 'OWNER_HANDOVER' && lead.status !== 'WON' && (
                <button
                  type="button"
                  onClick={() => onPotentialHandover(lead)}
                  className="col-span-2 sm:col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  SEND AS POTENTIAL LEAD
                </button>
              )}
            </div>
          </div>

          {/* Quick Remark Form */}
          <form onSubmit={handleAddRemark} className="flex gap-2">
            <input
              type="text"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              placeholder="Type a quick remark to append to timeline..."
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isAddingRemark || !newRemark.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
            >
              Add Remark
            </button>
          </form>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
            {[
              { key: 'timeline', label: `Timeline (${leadData.activities.length})`, icon: History },
              { key: 'calls', label: `Calls (${leadData.calls.length})`, icon: Phone },
              { key: 'whatsapp', label: `WhatsApp (${leadData.whatsapp.length})`, icon: MessageCircle },
              { key: 'followups', label: `Follow-ups (${leadData.followups.length})`, icon: Calendar },
              { key: 'details', label: 'Company & Contact Info', icon: Building },
              ...(leadData.potentialHandover ? [{ key: 'handover', label: '🔥 Potential Handover', icon: Sparkles }] : []),
              ...(isSuperAdmin ? [{ key: 'sales', label: `Deals & Revenue`, icon: TrendingUp }] : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="py-2">
            {/* 1. Interactive Activity Timeline */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                {leadData.activities.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No timeline activity recorded yet.</p>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 my-2">
                    {leadData.activities.map((act) => (
                      <div key={act.id} className="relative group">
                        <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 hover:bg-slate-100/60 transition">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900">{act.title}</span>
                            <span className="text-slate-400 font-mono">
                              {new Date(act.created_at).toLocaleString()}
                            </span>
                          </div>
                          {act.description && (
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">{act.description}</p>
                          )}
                          {act.user_name && (
                            <span className="mt-1.5 inline-block text-[10px] font-semibold text-indigo-600">
                              By: {act.user_name} ({act.user_role})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Call Logs */}
            {activeTab === 'calls' && (
              <div className="space-y-2">
                {leadData.calls.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No calls logged yet.</p>
                ) : (
                  leadData.calls.map((call) => (
                    <div key={call.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{call.outcome}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
                        </div>
                        {call.remark && <p className="mt-1 text-slate-700">{call.remark}</p>}
                        <span className="text-[10px] text-indigo-600 block mt-1">Logged by: {call.consultant_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{call.call_date} {call.call_time}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. WhatsApp Logs */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-2">
                {leadData.whatsapp.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No WhatsApp activities recorded.</p>
                ) : (
                  leadData.whatsapp.map((wa) => (
                    <div key={wa.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal-800">{wa.template_name || 'Message Sent'}</span>
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold text-[10px]">{wa.outcome}</span>
                      </div>
                      {wa.message_preview && (
                        <p className="mt-1 text-slate-600 italic bg-white p-2 rounded border border-slate-100">{wa.message_preview}</p>
                      )}
                      {wa.remark && <p className="mt-1 text-slate-700 font-medium">Note: {wa.remark}</p>}
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>By: {wa.consultant_name}</span>
                        <span>{new Date(wa.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. Follow-ups History */}
            {activeTab === 'followups' && (
              <div className="space-y-2">
                {leadData.followups.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No follow-ups scheduled.</p>
                ) : (
                  leadData.followups.map((f) => (
                    <div key={f.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{f.reason || 'Follow-up Call'}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          f.status === 'RESCHEDULED' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {f.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">Due: <span className="font-bold font-mono">{f.followup_date} {f.followup_time}</span></p>
                      {f.remark && <p className="mt-0.5 text-slate-700">{f.remark}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 5. Company & Contact Details */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1">
                    Company Registration
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CIN</span>
                      <span className="font-bold font-mono">{lead.cin || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Company Type</span>
                      <span className="font-medium">{lead.company_type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Industry</span>
                      <span className="font-medium">{lead.industry || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Incorporation Date</span>
                      <span className="font-medium">{lead.incorporation_date || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Registered Address</span>
                      <span className="font-medium">{lead.registered_address || 'N/A'}</span>
                    </div>
                    {lead.website && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">Website</span>
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                          {lead.website} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1">
                    Contact & CRM Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Contact Person</span>
                      <span className="font-bold">{lead.contact_person}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Designation</span>
                      <span className="font-medium">{lead.designation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Primary Mobile</span>
                      <span className="font-bold font-mono text-indigo-600">{lead.mobile}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Alternate Mobile</span>
                      <span className="font-mono">{lead.alternate_mobile || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Email Address</span>
                      <span className="font-medium">{lead.email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lead Source</span>
                      <span className="font-semibold">{lead.source_name || 'N/A'}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px]">Assigned Consultant</span>
                        {isSuperAdmin && lead.assigned_consultant_id && (
                          <button
                            type="button"
                            onClick={() => setIsUnassignModalOpen(true)}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5 cursor-pointer"
                            title="Unassign this lead from consultant"
                          >
                            <UserX className="w-2.5 h-2.5" />
                            Unassign
                          </button>
                        )}
                      </div>
                      <span className="font-semibold">{lead.assigned_consultant_name || 'Unassigned'}</span>
                    </div>
                    {isSuperAdmin && (
                      <div className="col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 block text-[10px]">Internal Business Vertical</span>
                          {lead.internal_business_id && (
                            <button
                              type="button"
                              onClick={() => setIsUnassignModalOpen(true)}
                              className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5 cursor-pointer"
                              title="Unassign this lead from business category"
                            >
                              <UserX className="w-2.5 h-2.5" />
                              Unassign
                            </button>
                          )}
                        </div>
                        {lead.business_name ? (
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-0.5">
                            {lead.business_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned (Inbound Pool)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Potential Handover Details (if submitted) */}
            {activeTab === 'handover' && leadData.potentialHandover && (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-extrabold text-amber-900 text-sm">🔥 Potential Handover Details</span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-600 text-white font-bold text-[10px]">
                    {leadData.potentialHandover.admin_status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">Requirement</span>
                    <p className="font-bold text-slate-900">{leadData.potentialHandover.requirement}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">Budget & Urgency</span>
                    <p className="font-medium text-slate-800">{leadData.potentialHandover.budget || 'Not specified'} • {leadData.potentialHandover.urgency}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 font-bold block text-[10px]">Requirement Details</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-amber-200/80">{leadData.potentialHandover.requirement_details}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">Decision Maker</span>
                    <p className="font-medium text-slate-800">{leadData.potentialHandover.decision_maker}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">Current Vendor</span>
                    <p className="font-medium text-slate-800">{leadData.potentialHandover.current_vendor || 'None'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 font-bold block text-[10px]">Recommended Next Step</span>
                    <p className="font-bold text-indigo-900 bg-indigo-50 p-2 rounded border border-indigo-100">{leadData.potentialHandover.recommended_next_action}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Super Admin Deals & Revenue Information */}
            {activeTab === 'sales' && isSuperAdmin && (
              <div className="space-y-3 text-xs">
                {leadData.deal ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-900 text-sm">🎉 Closed Won Deal</span>
                      <span className="text-emerald-700 font-mono font-bold">{leadData.deal.closing_date}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Service</span>
                        <span className="font-bold text-slate-900">{leadData.deal.service_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Deal Value</span>
                        <span className="font-bold text-emerald-700 text-sm">₹{leadData.deal.deal_value?.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Business Vertical</span>
                        <span className="font-bold text-indigo-700">{leadData.deal.business_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Original Consultant Attribution</span>
                        <span className="font-semibold text-slate-800">{leadData.deal.original_consultant_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Closing Person</span>
                        <span className="font-semibold text-slate-800">{leadData.deal.closing_person_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Payment Status</span>
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{leadData.deal.payment_status}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-slate-500">No deal closed for this lead yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>

      {isSuperAdmin && lead && (
        <ReassignWarningModal
          isOpen={isUnassignModalOpen}
          onClose={() => setIsUnassignModalOpen(false)}
          assignedLeads={[{
            id: lead.id,
            company_name: lead.company_name,
            contact_person: lead.contact_person,
            business_name: lead.business_name,
            consultant_name: lead.assigned_consultant_name,
          }]}
          targetLabel={`Lead "${lead.company_name}"`}
          onUnassignSuccess={() => {
            fetchLeadDetails();
            onStatusUpdated?.();
          }}
        />
      )}
    </>
  );
};

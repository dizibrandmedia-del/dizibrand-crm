import React from 'react';
import { Lead } from '../../types';
import { StatusBadge, PriorityBadge, ScoreBadge } from '../common/Badge';
import { Phone, MessageCircle, Calendar, Sparkles, Eye, MoreHorizontal, Building2 } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onCall: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onFollowup: (lead: Lead) => void;
  onPotentialHandover: (lead: Lead) => void;
  onViewDetails: (lead: Lead) => void;
  isSuperAdmin?: boolean;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onCall,
  onWhatsApp,
  onFollowup,
  onPotentialHandover,
  onViewDetails,
  isSuperAdmin = false,
}) => {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm transition-colors">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <th className="p-3.5 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-indigo-500"
              />
            </th>
            <th className="py-3.5 px-3">Lead ID & Company</th>
            <th className="py-3.5 px-3">Contact Person</th>
            <th className="py-3.5 px-3">Status</th>
            <th className="py-3.5 px-3">Priority / Score</th>
            <th className="py-3.5 px-3">Follow-up</th>
            {isSuperAdmin && <th className="py-3.5 px-3">Assigned To</th>}
            {isSuperAdmin && <th className="py-3.5 px-3">Business</th>}
            <th className="py-3.5 px-3 text-right">Quick Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
          {leads.map((lead) => {
            const isSelected = selectedIds.includes(lead.id);
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = lead.next_followup_date && lead.next_followup_date < todayStr && !['WON', 'LOST'].includes(lead.status);

            return (
              <tr
                key={lead.id}
                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                  isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/40' : ''
                } ${isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''}`}
              >
                <td className="p-3.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(lead.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </td>

                {/* Company & ID */}
                <td className="py-3.5 px-3">
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">{lead.lead_id}</span>
                  <span
                    onClick={() => onViewDetails(lead)}
                    className="font-bold text-slate-900 dark:text-white hover:text-[#ed1a3b] dark:hover:text-[#ed1a3b] cursor-pointer block text-xs truncate max-w-[200px]"
                  >
                    {lead.company_name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {lead.city && lead.state ? `${lead.city}, ${lead.state}` : (lead.city || lead.state || 'India')}
                    </span>
                    {lead.source_name && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>{lead.source_name}</span>
                      </>
                    )}
                  </div>
                </td>

                {/* Contact */}
                <td className="py-3.5 px-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[140px]">{lead.contact_person}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">{lead.mobile}</span>
                  {lead.email && <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate max-w-[140px]">{lead.email}</span>}
                </td>

                {/* Status */}
                <td className="py-3.5 px-3">
                  <StatusBadge status={lead.status} />
                </td>

                {/* Priority / Score */}
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={lead.priority} />
                    <ScoreBadge score={lead.lead_score} band={lead.lead_score_band} />
                  </div>
                </td>

                {/* Follow-up */}
                <td className="py-3.5 px-3">
                  {lead.next_followup_date ? (
                    <div className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                      <span className="block">{lead.next_followup_date}</span>
                      <span className="text-[10px] opacity-75">{lead.next_followup_time || ''}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px]">—</span>
                  )}
                </td>

                {/* Assigned To (Admin Only) */}
                {isSuperAdmin && (
                  <td className="py-3.5 px-3">
                    {lead.assigned_consultant_name ? (
                      <span className="font-medium text-slate-800 dark:text-slate-200">{lead.assigned_consultant_name}</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 rounded text-[10px] font-semibold">
                        Unassigned
                      </span>
                    )}
                  </td>
                )}

                {/* Internal Business (Super Admin Only) */}
                {isSuperAdmin && (
                  <td className="py-3.5 px-3">
                    {(() => {
                      const bizName = lead.business_name || (lead as any).internal_business_name;
                      if (!bizName) {
                        return (
                          <span className="text-slate-400 text-[10px] font-medium italic bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200 inline-block">
                            Unassigned
                          </span>
                        );
                      }
                      const lower = bizName.toLowerCase();
                      const style = lower.includes('dizi')
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : lower.includes('strat') || lower.includes('hr')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : lower.includes('fyn')
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] inline-flex items-center gap-1 border shadow-2xs ${style}`}>
                          <Building2 className="w-3 h-3 shrink-0" />
                          {bizName}
                        </span>
                      );
                    })()}
                  </td>
                )}

                {/* Actions */}
                <td className="py-3.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCall(lead);
                      }}
                      title="Direct Call"
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition shadow-2xs cursor-pointer active:scale-90"
                    >
                      <Phone className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onWhatsApp(lead);
                      }}
                      title="Direct WhatsApp"
                      className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white transition shadow-2xs cursor-pointer active:scale-90"
                    >
                      <MessageCircle className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFollowup(lead);
                      }}
                      title="Schedule Follow-up"
                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition shadow-2xs cursor-pointer active:scale-90"
                    >
                      <Calendar className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                    {lead.status !== 'OWNER_HANDOVER' && lead.status !== 'WON' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPotentialHandover(lead);
                        }}
                        title="Send as Potential Lead"
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition shadow-2xs cursor-pointer active:scale-90"
                      >
                        <Sparkles className="w-3.5 h-3.5 pointer-events-none" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(lead);
                      }}
                      title="View Lead Details"
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition shadow-2xs cursor-pointer active:scale-90"
                    >
                      <Eye className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

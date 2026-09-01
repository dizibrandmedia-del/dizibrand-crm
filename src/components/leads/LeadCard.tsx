import React from 'react';
import { Lead } from '../../types';
import { StatusBadge, PriorityBadge, ScoreBadge } from '../common/Badge';
import { Phone, MessageCircle, Calendar, Sparkles, Eye, MapPin, Building, User } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onCall: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onFollowup: (lead: Lead) => void;
  onPotentialHandover: (lead: Lead) => void;
  onViewDetails: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onCall,
  onWhatsApp,
  onFollowup,
  onPotentialHandover,
  onViewDetails,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = lead.next_followup_date && lead.next_followup_date < todayStr && !['WON', 'LOST'].includes(lead.status);
  const isToday = lead.next_followup_date === todayStr;

  return (
    <div className={`relative bg-white rounded-2xl p-4 shadow-sm border transition-all duration-200 hover:shadow-md ${
      isOverdue ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
    }`}>
      {/* Top Header: ID, Badges */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[11px] font-mono font-bold text-slate-400 block">{lead.lead_id}</span>
          <h3
            onClick={() => onViewDetails(lead)}
            className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-1 mt-0.5"
          >
            {lead.company_name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <PriorityBadge priority={lead.priority} />
          <ScoreBadge score={lead.lead_score} band={lead.lead_score_band} />
        </div>
      </div>

      {/* Contact & Location Info */}
      <div className="mt-2.5 space-y-1 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="font-semibold text-slate-800 truncate">{lead.contact_person}</span>
          {lead.designation && <span className="text-slate-400 text-[11px]">({lead.designation})</span>}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{lead.city || 'India'}</span>
          </div>
          {lead.source_name && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
              {lead.source_name}
            </span>
          )}
        </div>
      </div>

      {/* Follow-up / Status Banner */}
      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100">
        <StatusBadge status={lead.status} />

        {lead.next_followup_date && (
          <div className={`flex items-center gap-1 text-[11px] font-semibold ${
            isOverdue ? 'text-rose-600' : isToday ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{isToday ? 'Today' : lead.next_followup_date} {lead.next_followup_time || ''}</span>
          </div>
        )}
      </div>

      {/* Primary 1-Tap Action Buttons (Mobile-first CTA Bar) */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onCall(lead)}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition"
        >
          <Phone className="w-3.5 h-3.5 fill-current" />
          CALL
        </button>

        <button
          type="button"
          onClick={() => onWhatsApp(lead)}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-sm shadow-teal-600/20 transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WHATSAPP
        </button>
      </div>

      {/* Secondary Quick Action Row */}
      <div className="mt-2 flex items-center justify-between gap-2 pt-1 text-[11px]">
        <button
          type="button"
          onClick={() => onFollowup(lead)}
          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 py-1"
        >
          <Calendar className="w-3 h-3" />
          Follow-up
        </button>

        {lead.status !== 'OWNER_HANDOVER' && lead.status !== 'WON' && (
          <button
            type="button"
            onClick={() => onPotentialHandover(lead)}
            className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 py-1"
          >
            <Sparkles className="w-3 h-3" />
            Handover
          </button>
        )}

        <button
          type="button"
          onClick={() => onViewDetails(lead)}
          className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 py-1"
        >
          <Eye className="w-3 h-3" />
          Details
        </button>
      </div>
    </div>
  );
};

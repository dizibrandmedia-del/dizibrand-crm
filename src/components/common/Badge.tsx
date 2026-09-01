import React from 'react';
import { LeadStatus, Priority, ScoreBand } from '../../types';

export const StatusBadge: React.FC<{ status: LeadStatus | string; className?: string }> = ({ status, className = '' }) => {
  const styles: Record<string, string> = {
    NEW: 'bg-blue-50 text-blue-700 border-blue-200',
    ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    CONTACT_ATTEMPTED: 'bg-amber-50 text-amber-700 border-amber-200',
    CONNECTED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    INTERESTED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    FOLLOW_UP: 'bg-purple-50 text-purple-700 border-purple-200',
    QUALIFIED: 'bg-teal-50 text-teal-700 border-teal-200 font-semibold',
    POTENTIAL_LEAD: 'bg-orange-50 text-orange-700 border-orange-200 font-bold',
    OWNER_HANDOVER: 'bg-amber-500 text-white border-amber-600 font-bold shadow-sm',
    OWNER_CONTACT: 'bg-indigo-600 text-white border-indigo-700 font-bold',
    MEETING: 'bg-sky-600 text-white border-sky-700 font-semibold',
    PROPOSAL: 'bg-violet-600 text-white border-violet-700 font-semibold',
    NEGOTIATION: 'bg-pink-600 text-white border-pink-700 font-semibold',
    WON: 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-sm',
    LOST: 'bg-slate-100 text-slate-600 border-slate-300',
    WRONG_NUMBER: 'bg-rose-50 text-rose-600 border-rose-200',
    NOT_INTERESTED: 'bg-slate-100 text-slate-600 border-slate-200',
    DND: 'bg-red-50 text-red-700 border-red-200',
    NO_RESPONSE: 'bg-slate-50 text-slate-600 border-slate-200',
    NURTURE: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  };

  const currentStyle = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border tracking-wide uppercase ${currentStyle} ${className}`}>
      {label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority | string; className?: string }> = ({ priority, className = '' }) => {
  if (priority === 'HOT') {
    return (
      <span className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
        HOT
      </span>
    );
  }
  if (priority === 'HIGH') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        HIGH
      </span>
    );
  }
  if (priority === 'MEDIUM') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}>
        MEDIUM
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
      LOW
    </span>
  );
};

export const ScoreBadge: React.FC<{ score: number; band?: ScoreBand | string }> = ({ score, band }) => {
  let color = 'bg-slate-100 text-slate-700 border-slate-200';
  if (score >= 80) color = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
  else if (score >= 50) color = 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
  else color = 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${color}`}>
      <span className="font-semibold">{score}</span>
      <span className="text-[10px] uppercase opacity-75 font-normal">({band || (score >= 80 ? 'HOT' : score >= 50 ? 'WARM' : 'COLD')})</span>
    </span>
  );
};

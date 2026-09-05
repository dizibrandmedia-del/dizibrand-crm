import React from 'react';
import { LeadStatus, Priority, ScoreBand } from '../../types';

interface StatusConfig {
  pill: string;
  dot: string;
  pulse?: boolean;
}

const statusMap: Record<string, StatusConfig> = {
  // Won / Success (Stitch #10B981)
  WON: { pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  INTERESTED: { pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  
  // Qualified / Info (Stitch #3B82F6)
  QUALIFIED: { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/25', dot: 'bg-blue-400' },
  CONNECTED: { pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25', dot: 'bg-cyan-400' },
  ASSIGNED: { pill: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25', dot: 'bg-indigo-400' },

  // New Lead (Stitch #8B5CF6)
  NEW: { pill: 'bg-purple-500/10 text-purple-400 border-purple-500/25', dot: 'bg-purple-400', pulse: true },

  // Review / Mid-Funnel (Stitch #F59E0B)
  POTENTIAL_LEAD: { pill: 'bg-amber-500/10 text-amber-400 border-amber-500/25', dot: 'bg-amber-400' },
  OWNER_HANDOVER: { pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400', pulse: true },
  OWNER_CONTACT: { pill: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', dot: 'bg-indigo-400' },
  FOLLOW_UP: { pill: 'bg-violet-500/10 text-violet-400 border-violet-500/25', dot: 'bg-violet-400' },
  CONTACT_ATTEMPTED: { pill: 'bg-amber-500/10 text-amber-300 border-amber-500/20', dot: 'bg-amber-400' },
  MEETING: { pill: 'bg-sky-500/10 text-sky-400 border-sky-500/25', dot: 'bg-sky-400' },
  PROPOSAL: { pill: 'bg-purple-500/10 text-purple-300 border-purple-500/25', dot: 'bg-purple-400' },
  NEGOTIATION: { pill: 'bg-pink-500/10 text-pink-400 border-pink-500/25', dot: 'bg-pink-400' },
  NURTURE: { pill: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25', dot: 'bg-yellow-400' },

  // Risk / Lost (Stitch #F43F5E)
  LOST: { pill: 'bg-slate-800/80 text-slate-400 border-slate-700/60', dot: 'bg-slate-500' },
  WRONG_NUMBER: { pill: 'bg-rose-500/10 text-rose-400 border-rose-500/25', dot: 'bg-rose-400' },
  NOT_INTERESTED: { pill: 'bg-slate-800/80 text-slate-400 border-slate-700/60', dot: 'bg-slate-500' },
  DND: { pill: 'bg-rose-500/10 text-rose-400 border-rose-500/25', dot: 'bg-rose-400' },
  NO_RESPONSE: { pill: 'bg-slate-800/80 text-slate-400 border-slate-700/60', dot: 'bg-slate-500' },
};

export const StatusBadge: React.FC<{ status: LeadStatus | string; className?: string }> = ({ status, className = '' }) => {
  const config = statusMap[status] || { pill: 'bg-slate-800/70 text-slate-400 border-slate-700/50', dot: 'bg-slate-500' };
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border tracking-wide uppercase ${config.pill} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority | string; className?: string }> = ({ priority, className = '' }) => {
  if (priority === 'HOT') {
    return (
      <span className={`relative inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        HOT
      </span>
    );
  }
  if (priority === 'HIGH') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        HIGH
      </span>
    );
  }
  if (priority === 'MEDIUM') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
        MEDIUM
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
      LOW
    </span>
  );
};

export const ScoreBadge: React.FC<{ score: number; band?: ScoreBand | string }> = ({ score, band }) => {
  let color = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  let dotColor = 'bg-slate-400';
  if (score >= 80) {
    color = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold';
    dotColor = 'bg-emerald-400';
  } else if (score >= 50) {
    color = 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold';
    dotColor = 'bg-amber-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="font-mono font-semibold">{score}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-75 font-normal">
        ({band || (score >= 80 ? 'HOT' : score >= 50 ? 'WARM' : 'COLD')})
      </span>
    </span>
  );
};

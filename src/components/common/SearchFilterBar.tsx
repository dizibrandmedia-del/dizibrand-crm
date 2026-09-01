import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter?: string;
  onStatusChange?: (val: string) => void;
  priorityFilter?: string;
  onPriorityChange?: (val: string) => void;
  sourceFilter?: string;
  onSourceChange?: (val: string) => void;
  sourcesList?: { id: number; name: string }[];
  onReset?: () => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  sourceFilter,
  onSourceChange,
  sourcesList = [],
  onReset,
  placeholder = 'Search by company, CIN, contact, mobile, or city...',
  children,
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {onStatusChange && (
          <select
            value={statusFilter || ''}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="CONTACT_ATTEMPTED">Contact Attempted</option>
            <option value="CONNECTED">Connected</option>
            <option value="INTERESTED">Interested</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="OWNER_HANDOVER">Owner Handover</option>
            <option value="MEETING">Meeting</option>
            <option value="PROPOSAL">Proposal</option>
            <option value="NEGOTIATION">Negotiation</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
            <option value="NURTURE">Nurture</option>
          </select>
        )}

        {onPriorityChange && (
          <select
            value={priorityFilter || ''}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="HOT">🔥 Hot</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        )}

        {onSourceChange && sourcesList.length > 0 && (
          <select
            value={sourceFilter || ''}
            onChange={(e) => onSourceChange(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Sources</option>
            {sourcesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {children}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title="Reset Filters"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

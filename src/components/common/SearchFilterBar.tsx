import React, { useState, useRef } from 'react';
import { Search, Filter, RotateCcw, MapPin, Calendar, X } from 'lucide-react';

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
  stateFilter?: string;
  onStateChange?: (val: string) => void;
  statesList?: { state: string; count?: number }[];
  cityFilter?: string;
  onCityChange?: (val: string) => void;
  citiesList?: { city: string; state?: string; count?: number }[];
  assignedDateFilter?: string;
  onAssignedDateChange?: (val: string) => void;
  dateFilter?: string;
  onDateChange?: (val: string) => void;
  dateFilterLabel?: 'Lead Entry Date' | 'Lead Assign Date' | string;
  onReset?: () => void;
  placeholder?: string;
  children?: React.ReactNode;
  isDark?: boolean;
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
  stateFilter,
  onStateChange,
  statesList = [],
  cityFilter,
  onCityChange,
  citiesList = [],
  assignedDateFilter,
  onAssignedDateChange,
  dateFilter,
  onDateChange,
  dateFilterLabel = 'Lead Assign Date',
  onReset,
  placeholder = 'Search by company, CIN, contact, mobile, or city...',
  children,
  isDark = false,
}) => {
  // Unify date filter prop
  const activeDateValue = dateFilter ?? assignedDateFilter ?? '';
  const handleDateChange = onDateChange ?? onAssignedDateChange;
  const isEntryDate = dateFilterLabel.toLowerCase().includes('entry') || dateFilterLabel.toLowerCase().includes('created');

  // Filter cities by state if state is selected
  const availableCities = React.useMemo(() => {
    if (!stateFilter) return citiesList;
    return citiesList.filter(
      (c) => c.state?.toLowerCase() === stateFilter.toLowerCase()
    );
  }, [stateFilter, citiesList]);

  const containerClasses = isDark
    ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  const inputClasses = isDark
    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-indigo-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-indigo-500';

  const selectClasses = isDark
    ? 'bg-slate-950 border-slate-700 text-slate-200 focus:ring-indigo-500'
    : 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-indigo-500';

  const activeSelectClasses = isDark
    ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300 font-semibold ring-1 ring-indigo-500/30'
    : 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold ring-1 ring-indigo-200';

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border transition flex flex-col gap-3 ${containerClasses}`}>
      {/* Search Input Row */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-10 pr-4 py-2 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 transition font-medium ${inputClasses}`}
          />
        </div>

        {/* Filter Controls Row / Wrap */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          {onStatusChange && (
            <select
              value={statusFilter || ''}
              onChange={(e) => onStatusChange(e.target.value)}
              className={`px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition ${
                statusFilter ? activeSelectClasses : selectClasses
              }`}
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

          {/* Priority Filter */}
          {onPriorityChange && (
            <select
              value={priorityFilter || ''}
              onChange={(e) => onPriorityChange(e.target.value)}
              className={`px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition ${
                priorityFilter ? activeSelectClasses : selectClasses
              }`}
            >
              <option value="">All Priorities</option>
              <option value="HOT">🔥 Hot</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          )}

          {/* Source Filter */}
          {onSourceChange && sourcesList.length > 0 && (
            <select
              value={sourceFilter || ''}
              onChange={(e) => onSourceChange(e.target.value)}
              className={`px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition ${
                sourceFilter ? activeSelectClasses : selectClasses
              }`}
            >
              <option value="">All Sources</option>
              {sourcesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {/* State Filter */}
          {onStateChange && (
            <select
              value={stateFilter || ''}
              onChange={(e) => {
                const val = e.target.value;
                onStateChange(val);
                if (onCityChange && cityFilter && val) {
                  const matches = citiesList.some(
                    (c) => c.state?.toLowerCase() === val.toLowerCase() && c.city.toLowerCase() === cityFilter.toLowerCase()
                  );
                  if (!matches) onCityChange('');
                }
              }}
              className={`px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition ${
                stateFilter ? activeSelectClasses : selectClasses
              }`}
            >
              <option value="">{statesList.length > 0 ? `All States (${statesList.length})` : 'All States'}</option>
              {statesList.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} {s.count !== undefined ? `(${s.count})` : ''}
                </option>
              ))}
            </select>
          )}

          {/* City Filter */}
          {onCityChange && (
            <select
              value={cityFilter || ''}
              onChange={(e) => onCityChange(e.target.value)}
              className={`px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition ${
                cityFilter ? activeSelectClasses : selectClasses
              }`}
            >
              <option value="">
                {stateFilter ? `All Cities in ${stateFilter}` : (citiesList.length > 0 ? `All Cities (${citiesList.length})` : 'All Cities')}
              </option>
              {availableCities.map((c) => (
                <option key={`${c.state || ''}-${c.city}`} value={c.city}>
                  {c.city} {c.count !== undefined ? `(${c.count})` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Date Filter (Direct calendar popup on click, NO presets) */}
          {handleDateChange && (
            <div className="relative inline-flex items-center">
              <button
                type="button"
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border rounded-xl cursor-pointer transition select-none ${
                  activeDateValue ? activeSelectClasses : selectClasses
                }`}
                title={isEntryDate ? 'Click to open calendar for Lead Entry Date' : 'Click to open calendar for Lead Assigned Date'}
              >
                <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeDateValue ? 'text-indigo-600' : (isDark ? 'text-slate-400' : 'text-slate-500')}`} />
                <span className="font-semibold whitespace-nowrap">
                  {activeDateValue
                    ? `${isEntryDate ? 'Entry' : 'Assigned'}: ${new Date(activeDateValue + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : (isEntryDate ? 'All Entry Dates' : 'All Assigned Dates')}
                </span>
                {activeDateValue ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDateChange('');
                    }}
                    className="relative z-10 p-0.5 rounded-md hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 text-indigo-500 dark:text-indigo-300 transition"
                    title="Clear Date"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 opacity-70 ml-0.5">📅</span>
                )}
              </button>

              <input
                type="date"
                value={activeDateValue || ''}
                onChange={(e) => handleDateChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto w-full h-full"
                title={isEntryDate ? 'Select Entry Date' : 'Select Assigned Date'}
              />
            </div>
          )}

          {children}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset Filters"
              className={`p-2 rounded-xl transition ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


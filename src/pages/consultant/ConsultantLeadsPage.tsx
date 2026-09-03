import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Lead, LeadSource, Tag } from '../../types';
import { LeadCard } from '../../components/leads/LeadCard';
import { LeadTable } from '../../components/leads/LeadTable';
import { SearchFilterBar } from '../../components/common/SearchFilterBar';
import { CreateLeadModal } from '../../components/leads/CreateLeadModal';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { CallModal } from '../../components/leads/CallModal';
import { WhatsAppModal } from '../../components/leads/WhatsAppModal';
import { FollowupModal } from '../../components/leads/FollowupModal';
import { PotentialHandoverModal } from '../../components/leads/PotentialHandoverModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import { Users, Plus, LayoutGrid, List, Filter } from 'lucide-react';

export const ConsultantLeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [locations, setLocations] = useState<{
    states: { state: string; count?: number }[];
    cities: { city: string; state?: string; count?: number }[];
  }>({ states: [], cities: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [assignedDateFilter, setAssignedDateFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [activeModalLead, setActiveModalLead] = useState<Lead | null>(null);
  const [modalType, setModalType] = useState<'call' | 'whatsapp' | 'followup' | 'handover' | null>(null);

  const fetchAux = async () => {
    try {
      const [sRes, tRes, bRes, locRes]: any[] = await Promise.all([
        api.sources.list().catch(() => ({ sources: [] })),
        api.tags.list().catch(() => ({ tags: [] })),
        api.businesses.list().catch(() => ({ businesses: [] })),
        api.leads.getLocations().catch(() => ({ states: [], cities: [] })),
      ]);
      setSources(sRes.sources || []);
      setTags(tRes.tags || []);
      setBusinesses(Array.isArray(bRes) ? bRes : (bRes?.businesses || []));
      if (locRes && Array.isArray(locRes.states)) {
        setLocations(locRes);
      }
    } catch (err) {
      console.error('Failed to load auxiliary filter data:', err);
    }
  };

  const fetchLeads = async (page = pagination.page) => {
    setIsLoading(true);
    try {
      const res = await api.leads.list({
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        source_id: sourceFilter ? Number(sourceFilter) : undefined,
        business_id: businessFilter ? Number(businessFilter) : undefined,
        state: stateFilter || undefined,
        city: cityFilter || undefined,
        assigned_date: assignedDateFilter || undefined,
      });

      setLeads(res.leads);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch your assigned leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStateChange = (selectedState: string) => {
    setStateFilter(selectedState);
    if (selectedState && cityFilter) {
      const cityMatches = locations.cities.some(
        (c) => c.state?.toLowerCase() === selectedState.toLowerCase() && c.city.toLowerCase() === cityFilter.toLowerCase()
      );
      if (!cityMatches) setCityFilter('');
    }
  };

  useEffect(() => {
    fetchAux();
  }, []);

  useEffect(() => {
    fetchLeads(1);
  }, [search, statusFilter, priorityFilter, sourceFilter, businessFilter, stateFilter, cityFilter, assignedDateFilter]);

  return (
    <div className="space-y-4 pb-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            My Assigned Leads
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {pagination.total} leads in your active pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        sourcesList={sources}
        stateFilter={stateFilter}
        onStateChange={handleStateChange}
        statesList={locations.states}
        cityFilter={cityFilter}
        onCityChange={setCityFilter}
        citiesList={locations.cities}
        dateFilterLabel="Lead Assign Date"
        assignedDateFilter={assignedDateFilter}
        onAssignedDateChange={setAssignedDateFilter}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
          setPriorityFilter('');
          setSourceFilter('');
          setBusinessFilter('');
          setStateFilter('');
          setCityFilter('');
          setAssignedDateFilter('');
        }}
        isDark={true}
      >
        {/* Business Filter */}
        {businesses.length > 0 && (
          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 cursor-pointer"
          >
            <option value="">All Businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </SearchFilterBar>

      {/* Active Filter Chips Bar */}
      {(stateFilter || cityFilter || assignedDateFilter || businessFilter) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-indigo-950/40 border border-indigo-900/60 rounded-xl text-xs text-indigo-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-indigo-400">Active Filters:</span>
            {stateFilter && (
              <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-700/50 rounded-md font-semibold text-indigo-200">
                State: {stateFilter}
              </span>
            )}
            {cityFilter && (
              <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-700/50 rounded-md font-semibold text-indigo-200">
                City: {cityFilter}
              </span>
            )}
            {assignedDateFilter && (
              <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-700/50 rounded-md font-semibold text-indigo-200">
                Assigned: {assignedDateFilter}
              </span>
            )}
            {businessFilter && (
              <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-700/50 rounded-md font-semibold text-indigo-200">
                Business: {businesses.find((b) => String(b.id) === String(businessFilter))?.name || businessFilter}
              </span>
            )}
            <span className="text-slate-400 font-mono text-[11px]">({pagination.total} leads)</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setStateFilter('');
              setCityFilter('');
              setAssignedDateFilter('');
              setBusinessFilter('');
            }}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-200 hover:underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Leads Content */}
      {isLoading ? (
        <LoadingSpinner text="Fetching your leads..." />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-indigo-500" />}
          title="No Leads Found in Your Queue"
          description="Try changing your search terms or filters."
        />
      ) : viewMode === 'table' ? (
        <div className="space-y-4">
          <LeadTable
            leads={leads}
            selectedIds={[]}
            onToggleSelect={() => {}}
            onSelectAll={() => {}}
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
            onViewDetails={(l) => setSelectedLeadId(l.id)}
            isSuperAdmin={false}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
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
                onViewDetails={(l) => setSelectedLeadId(l.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs text-slate-400">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLeads(pagination.page - 1)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLeads(pagination.page + 1)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        consultants={[]}
        businesses={businesses}
        sources={sources}
        tags={tags}
        onSuccess={() => fetchLeads(1)}
        isSuperAdmin={false}
      />

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
        onStatusUpdated={fetchLeads}
        isSuperAdmin={false}
      />

      <CallModal
        isOpen={modalType === 'call'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchLeads}
      />

      <WhatsAppModal
        isOpen={modalType === 'whatsapp'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchLeads}
      />

      <FollowupModal
        isOpen={modalType === 'followup'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchLeads}
      />

      <PotentialHandoverModal
        isOpen={modalType === 'handover'}
        onClose={() => setModalType(null)}
        lead={activeModalLead}
        onSuccess={fetchLeads}
      />
    </div>
  );
};

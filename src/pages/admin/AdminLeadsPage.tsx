import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { Lead, User, Business, LeadSource, Tag } from '../../types';
import { LeadTable } from '../../components/leads/LeadTable';
import { SearchFilterBar } from '../../components/common/SearchFilterBar';
import { BulkActionModal } from '../../components/leads/BulkActionModal';
import { CreateLeadModal } from '../../components/leads/CreateLeadModal';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { CallModal } from '../../components/leads/CallModal';
import { WhatsAppModal } from '../../components/leads/WhatsAppModal';
import { FollowupModal } from '../../components/leads/FollowupModal';
import { PotentialHandoverModal } from '../../components/leads/PotentialHandoverModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import { Users, Plus, Download, UploadCloud, CheckSquare, Sparkles, Filter, Building2, MapPin, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const AdminLeadsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [unassignedFilter, setUnassignedFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // Dropdown auxiliary data
  const [consultants, setConsultants] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [locations, setLocations] = useState<{
    states: { state: string; count: number }[];
    cities: { city: string; state: string; count: number }[];
  }>({ states: [], cities: [] });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeModalLead, setActiveModalLead] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [modalType, setModalType] = useState<'call' | 'whatsapp' | 'followup' | 'handover' | 'detail' | null>(null);

  const fetchAuxData = async () => {
    try {
      const [cRes, bRes, sRes, tRes, locRes]: any[] = await Promise.all([
        api.consultants.list().catch(() => ({ consultants: [] })),
        api.businesses.list().catch(() => ({ businesses: [] })),
        api.sources.list().catch(() => ({ sources: [] })),
        api.tags.list().catch(() => ({ tags: [] })),
        api.leads.getLocations().catch(() => ({ states: [], cities: [] })),
      ]);
      setConsultants(Array.isArray(cRes) ? cRes : (cRes?.consultants || cRes?.users || []));
      setBusinesses(Array.isArray(bRes) ? bRes : (bRes?.businesses || []));
      setSources(Array.isArray(sRes) ? sRes : (sRes?.sources || []));
      setTags(Array.isArray(tRes) ? tRes : (tRes?.tags || []));
      if (locRes && Array.isArray(locRes.states)) {
        setLocations(locRes);
      }
    } catch (err) {
      console.error('Failed to load auxiliary data:', err);
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
        consultant_id: consultantFilter === 'unassigned' ? 'unassigned' : (consultantFilter ? Number(consultantFilter) : undefined),
        business_id: businessFilter === 'unassigned' ? 'unassigned' : (businessFilter ? Number(businessFilter) : undefined),
        state: stateFilter || undefined,
        city: cityFilter || undefined,
      });

      setLeads(res.leads);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchLeads(1);
  }, [search, statusFilter, priorityFilter, sourceFilter, consultantFilter, businessFilter, unassignedFilter, stateFilter, cityFilter]);

  const handleStateChange = (selectedState: string) => {
    setStateFilter(selectedState);
    if (selectedState && cityFilter) {
      const cityMatches = locations.cities.some(
        (c) => c.state?.toLowerCase() === selectedState.toLowerCase() && c.city.toLowerCase() === cityFilter.toLowerCase()
      );
      if (!cityMatches) setCityFilter('');
    }
  };

  const filteredCities = useMemo(() => {
    if (!stateFilter) return locations.cities;
    return locations.cities.filter((c) => c.state?.toLowerCase() === stateFilter.toLowerCase());
  }, [stateFilter, locations.cities]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(priorityFilter ? { priority: priorityFilter } : {}),
      ...(sourceFilter ? { source_id: sourceFilter } : {}),
      ...(consultantFilter ? { assigned_consultant_id: consultantFilter } : {}),
      ...(businessFilter ? { internal_business_id: businessFilter } : {}),
      ...(stateFilter ? { state: stateFilter } : {}),
      ...(cityFilter ? { city: cityFilter } : {}),
    });
    window.location.href = `/api/exports/leads/csv?${params.toString()}`;
    toast.success('Lead database export initiated!');
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setSourceFilter('');
    setConsultantFilter('');
    setBusinessFilter('');
    setUnassignedFilter('');
    setStateFilter('');
    setCityFilter('');
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Central Lead Database
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Total {pagination.total} leads • MCA imports, Meta Ads, LinkedIn, and Inbound Sources
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              <CheckSquare className="w-4 h-4" />
              Bulk Action ({selectedIds.length})
            </button>
          )}

          <button
            onClick={handleExportCSV}
            title="Export CSV (Super Admin Only)"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <Link
            to="/admin/import"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Import MCA
          </Link>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Quick Allocation Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { setBusinessFilter(''); setConsultantFilter(''); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            !businessFilter && !consultantFilter
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Inbound Pool ({pagination.total || '775'})
        </button>
        <button
          type="button"
          onClick={() => { setBusinessFilter('1'); setConsultantFilter(''); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            businessFilter === '1'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          Dizibrand Media
        </button>
        <button
          type="button"
          onClick={() => { setBusinessFilter('unassigned'); setConsultantFilter(''); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            businessFilter === 'unassigned'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-amber-500" />
          Unmapped in Pool
        </button>
        <button
          type="button"
          onClick={() => { setConsultantFilter('unassigned'); setBusinessFilter(''); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            consultantFilter === 'unassigned'
              ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Pending Consultant Allocation
        </button>
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
        onReset={handleResetFilters}
      >
        {/* State Filter */}
        <select
          value={stateFilter}
          onChange={(e) => handleStateChange(e.target.value)}
          className={`px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer ${
            stateFilter
              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-1 ring-indigo-200'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <option value="">All States ({locations.states.length})</option>
          {locations.states.map((s) => (
            <option key={s.state} value={s.state}>
              {s.state} ({s.count})
            </option>
          ))}
        </select>

        {/* City Filter */}
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className={`px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer ${
            cityFilter
              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-1 ring-indigo-200'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <option value="">{stateFilter ? `All Cities in ${stateFilter}` : `All Cities (${locations.cities.length})`}</option>
          {filteredCities.map((c) => (
            <option key={`${c.state}-${c.city}`} value={c.city}>
              {c.city} ({c.count})
            </option>
          ))}
        </select>

        {/* Admin specific filters */}
        <select
          value={consultantFilter}
          onChange={(e) => setConsultantFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer"
        >
          <option value="">All Consultants</option>
          <option value="unassigned">Unassigned (Pending Consultant)</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer"
        >
          <option value="">All Businesses / Verticals</option>
          <option value="unassigned">Unmapped in Pool</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </SearchFilterBar>

      {/* Active Geo Filter Banner */}
      {(stateFilter || cityFilter) && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-indigo-50/90 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 shadow-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Geo Filter Active:</strong>{' '}
              {stateFilter && <span className="px-2 py-0.5 bg-indigo-100/80 rounded-md font-semibold text-indigo-950">{stateFilter}</span>}
              {stateFilter && cityFilter && <span className="text-indigo-400 font-bold mx-1">›</span>}
              {cityFilter && <span className="px-2 py-0.5 bg-indigo-100/80 rounded-md font-semibold text-indigo-950">{cityFilter}</span>}
              <span className="text-slate-500 ml-2">({pagination.total} matching leads found)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setStateFilter(''); setCityFilter(''); }}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-950 hover:bg-indigo-100 px-2 py-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear Geo Filter
          </button>
        </div>
      )}

      {/* Main Table View */}
      {isLoading ? (
        <LoadingSpinner text="Querying and filtering leads database..." />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-indigo-600" />}
          title="No Leads Found"
          description="No leads match your current search and filter criteria. You can import new records or clear filters."
          action={
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
            >
              Clear All Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <LeadTable
            leads={leads}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
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
            isSuperAdmin={true}
          />

          {/* Pagination Bar */}
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs text-slate-400">
            <span>
              Showing {leads.length} of {pagination.total} leads (Page {pagination.page} of {pagination.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLeads(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition font-medium"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLeads(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <BulkActionModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedIds={selectedIds}
        consultants={consultants}
        businesses={businesses}
        tags={tags}
        onSuccess={() => {
          setSelectedIds([]);
          fetchLeads();
        }}
        isSuperAdmin={true}
      />

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        consultants={consultants}
        businesses={businesses}
        sources={sources}
        tags={tags}
        onSuccess={() => fetchLeads(1)}
        isSuperAdmin={true}
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
        isSuperAdmin={true}
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

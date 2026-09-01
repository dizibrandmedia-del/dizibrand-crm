import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Deal, Proposal, Meeting, Business } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import {
  DollarSign, Award, Calendar, FileText, TrendingUp,
  Building, CheckCircle2, UserCheck, Sparkles, Filter
} from 'lucide-react';

export const AdminSalesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deals' | 'proposals' | 'meetings'>('deals');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dRes, pRes, mRes, bRes] = await Promise.all([
        api.sales.deals(),
        api.sales.proposals(),
        api.sales.meetings(),
        api.businesses.list(),
      ]);
      setDeals(dRes.deals);
      setProposals(pRes.proposals);
      setMeetings(mRes.meetings);
      setBusinesses(bRes.businesses);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch sales pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalWonRevenue = deals.reduce((acc, d) => acc + (d.revenue || d.deal_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Executive Sales, Deals & Revenue Attribution
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Total Won Revenue: <strong className="text-emerald-400 font-mono text-sm">₹{totalWonRevenue.toLocaleString('en-IN')}</strong> • Permanent Consultant & Lead Source Attribution
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('deals')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'deals' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            Won Deals ({deals.length})
          </button>

          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'proposals' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Proposals ({proposals.length})
          </button>

          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'meetings' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Meetings ({meetings.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Fetching commercial pipeline & deal records..." />
      ) : (
        <div>
          {/* 1. Deals Tab */}
          {activeTab === 'deals' && (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Closed Won Contracts with Revenue Attribution
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {deals.length} Closed Deals
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-950/40">
                      <th className="py-3 px-4">Deal ID & Client</th>
                      <th className="py-3 px-4">Service & Vertical</th>
                      <th className="py-3 px-4">Lead Source</th>
                      <th className="py-3 px-4">Attributed Consultant</th>
                      <th className="py-3 px-4">Deal Value</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Closing Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {deals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">No closed won deals recorded yet.</td>
                      </tr>
                    ) : (
                      deals.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono text-[10px] font-bold text-emerald-400 block">{d.deal_code}</span>
                            <span className="font-bold text-white block text-sm">{d.company_name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200 block">{d.service_name}</span>
                            <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded font-bold">
                              {d.business_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">{d.source_name}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-indigo-300 block">{d.original_consultant_name}</span>
                            <span className="text-[10px] text-slate-400">Closer: {d.closing_person_name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                            ₹{(d.revenue || d.deal_value || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.payment_status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' :
                              d.payment_status === 'PARTIALLY_PAID' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {d.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{d.closing_date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Proposals Tab */}
          {activeTab === 'proposals' && (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Commercial Proposals & Quotations
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-950/40">
                      <th className="py-3 px-4">Proposal Code & Client</th>
                      <th className="py-3 px-4">Service Scope</th>
                      <th className="py-3 px-4">Quoted Value</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Follow-up Due</th>
                      <th className="py-3 px-4">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {proposals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">No proposals created yet.</td>
                      </tr>
                    ) : (
                      proposals.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono text-[10px] font-bold text-indigo-400 block">{p.proposal_code}</span>
                            <span className="font-bold text-white block text-sm">{p.company_name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-medium">{p.service_name}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                            ₹{(p.value || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-400 font-bold">{p.follow_up_date || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Meetings Tab */}
          {activeTab === 'meetings' && (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  Scheduled Discovery & Closing Meetings
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-950/40">
                      <th className="py-3 px-4">Meeting Title & Client</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Participants</th>
                      <th className="py-3 px-4">Scheduled Date & Time</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {meetings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">No meetings scheduled yet.</td>
                      </tr>
                    ) : (
                      meetings.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{m.title}</span>
                            <span className="text-[11px] text-slate-400">{m.company_name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">{m.meeting_type}</td>
                          <td className="py-3 px-4 text-slate-400">{m.participants || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-400">{m.meeting_date} at {m.meeting_time}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

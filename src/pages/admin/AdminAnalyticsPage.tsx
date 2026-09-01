import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, BarChart3, DollarSign, Target, Layers,
  Building2, Users, ArrowUpRight
} from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState('this_month');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.analytics.adminDashboard({ date_range: dateRange });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#3b82f6'];

  if (isLoading || !data) {
    return <LoadingSpinner text="Computing deep-dive sales analytics and attribution models..." />;
  }

  const funnelData = [
    { name: 'New Ingested', count: data.funnel?.new_count || 0 },
    { name: 'Assigned', count: data.funnel?.assigned_count || 0 },
    { name: 'Connected Calls', count: data.funnel?.connected_count || 0 },
    { name: 'Interested', count: data.funnel?.interested_count || 0 },
    { name: 'Qualified', count: data.funnel?.qualified_count || 0 },
    { name: 'Potential Handover', count: data.funnel?.handover_count || 0 },
    { name: 'Meetings', count: data.funnel?.meeting_count || 0 },
    { name: 'Proposals', count: data.funnel?.proposal_count || 0 },
    { name: 'Won Deals', count: data.funnel?.won_count || 0 },
  ];

  const businessPieData = (data.businessPerformance || []).map((b: any) => ({
    name: b.business_name,
    value: b.total_revenue || 0,
  }));

  const sourceData = (data.sourcePerformance || []).map((s: any) => ({
    name: s.source_name,
    leads: s.total_leads || 0,
    deals: s.won_deals || 0,
    revenue: s.total_revenue || 0,
  }));

  const consultantData = (data.consultantProductivity || []).map((c: any) => ({
    name: c.consultant_name,
    calls: c.today_calls || 0,
    target: c.daily_call_target || 20,
    handovers: c.total_potential_handovers || 0,
    revenue: c.attributed_revenue || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Executive Analytics & Attribution Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-vertical conversion metrics, source attribution, and consultant productivity curves
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          {['today', 'this_week', 'this_month'].map((t) => (
            <button
              key={t}
              onClick={() => setDateRange(t)}
              className={`px-3 py-1.5 rounded-lg transition capitalize ${
                dateRange === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Funnel & Business Revenue Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full Pipeline Conversion Funnel */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Conversion Stage Distribution
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Won Ratio: {data.funnel?.won_count ? ((data.funnel.won_count / (data.funnel.new_count || 1)) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Business Vertical Revenue Share (Super Admin Only) */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Revenue Share by Business Vertical (Admin Only)
            </h3>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={businessPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {businessPieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Source ROI & Attributed Revenue */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          Lead Source Performance & Won Revenue Comparison
        </h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData} margin={{ top: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-15} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="leads" name="Total Ingested" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deals" name="Won Deals" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

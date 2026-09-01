import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AuditLog } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import { ShieldAlert, RefreshCw, Filter, Clock } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.auditLogs.list({
        action: actionFilter || undefined,
        limit: 100,
      });
      setLogs(res.logs);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            Security & System Audit Trails
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all mutating events: assignments, bulk imports, CSV exports, status changes, and deal closures.
          </p>
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
          >
            <option value="">All Action Types</option>
            <option value="IMPORT_BATCH_COMMITTED">MCA Import Batch</option>
            <option value="EXPORT_LEADS_CSV">CSV Database Export</option>
            <option value="DEAL_CLOSED_WON">Deal Closed Won</option>
            <option value="POTENTIAL_LEAD_HANDOVER">Potential Lead Handover</option>
            <option value="CONSULTANT_DEACTIVATED">Consultant Deactivated</option>
            <option value="BULK_ASSIGN_LEADS">Bulk Assignment</option>
          </select>

          <button onClick={fetchLogs} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Querying system security log records..." />
      ) : (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details & Payload</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">No audit events match criteria.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        {log.user_name || 'System'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs" title={log.details || ''}>
                        {log.details || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[10px]">
                        {log.ip_address || '127.0.0.1'}
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
  );
};

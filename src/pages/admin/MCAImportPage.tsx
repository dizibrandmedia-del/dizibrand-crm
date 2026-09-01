import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { User, Business, LeadSource } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  XCircle, ArrowRight, ShieldCheck, RefreshCw, Database, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MCAImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [sourceId, setSourceId] = useState('1'); // MCA default
  const [sourceCampaign, setSourceCampaign] = useState('MCA_Q3_INGESTION');
  const [consultants, setConsultants] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Preview & Processing state
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [assignConsultantId, setAssignConsultantId] = useState('');
  const [internalBusinessId, setInternalBusinessId] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [committedBatch, setCommittedBatch] = useState<any>(null);

  const fetchAuxData = async () => {
    try {
      const [cRes, bRes, sRes, batchRes] = await Promise.all([
        api.consultants.list(),
        api.businesses.list(),
        api.sources.list(),
        api.import.batches(),
      ]);
      setConsultants(cRes.consultants);
      setBusinesses(bRes.businesses);
      setSources(sRes.sources);
      setBatches(batchRes.batches);
    } catch (err) {
      console.error('Failed to load import setup data:', err);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setCommittedBatch(null);
    }
  };

  const handleRunPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_id', sourceId);
      if (sourceCampaign) formData.append('source_campaign', sourceCampaign);

      const preview = await api.import.preview(formData);
      setPreviewData(preview);
      toast.success(`Parsed ${preview.totalRows} rows! ${preview.validCount} valid records identified.`);
    } catch (err: any) {
      toast.error(err.message || 'Import preview failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData) return;

    setIsCommitting(true);
    try {
      const res = await api.import.commit({
        preview_id: previewData.previewId,
        assign_consultant_id: assignConsultantId ? Number(assignConsultantId) : null,
        internal_business_id: internalBusinessId ? Number(internalBusinessId) : null,
      });

      setCommittedBatch(res);
      setPreviewData(null);
      setFile(null);
      toast.success(`🎉 ${res.importedCount} leads successfully imported under batch ${res.batch_id}!`);
      fetchAuxData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to commit import batch');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/30">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              MCA Database & Excel / CSV Bulk Ingestion Engine
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              High-throughput duplicate check across CIN, Mobile, Email, and Company Name. Supports 200, 300, and 3,000+ records per batch.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification if just committed */}
      {committedBatch && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Batch Import Committed Successfully!</h3>
              <p className="text-xs text-emerald-300 mt-0.5">
                Batch ID: <span className="font-mono font-bold text-white">{committedBatch.batch_id}</span> • {committedBatch.importedCount} leads added to the database.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/leads')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            View Leads Database
          </button>
        </div>
      )}

      {/* Upload & Preview Step Form */}
      {!previewData && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <form onSubmit={handleRunPreview} className="space-y-5">
            {/* File Drag & Drop Zone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                1. Select Excel (.xlsx, .xls) or CSV File
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 rounded-2xl p-8 text-center transition cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileSpreadsheet className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB • Ready for preview</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-300">
                      Drag and drop your MCA or lead file here, or <span className="text-indigo-400 underline">browse</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Supports XLSX, XLS, and CSV (up to 25MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ingestion Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  2. Lead Source
                </label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white font-medium"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  3. Campaign / Batch Tag
                </label>
                <input
                  type="text"
                  value={sourceCampaign}
                  onChange={(e) => setSourceCampaign(e.target.value)}
                  placeholder="e.g. MCA_DELHI_NCR_Q3"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white font-semibold"
                />
              </div>
            </div>

            {/* Submit Preview */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading || !file}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-40"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running Duplicate Checks...
                  </>
                ) : (
                  <>
                    <span>Generate Import Preview</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Preview Breakdown (PRD Section 9) */}
      {previewData && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400">BATCH ID: {previewData.batchId}</span>
                <h2 className="text-lg font-black text-white mt-0.5">Import Preview & Duplicate Analysis</h2>
                <p className="text-xs text-slate-400">File: {previewData.fileName}</p>
              </div>
              <button
                onClick={() => setPreviewData(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-xl"
              >
                Re-upload File
              </button>
            </div>

            {/* Metrics Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Total Rows</span>
                <span className="text-xl font-extrabold text-white mt-1 block">{previewData.totalRows}</span>
              </div>

              <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/50">
                <span className="text-emerald-400 text-[10px] uppercase tracking-wider block font-bold">Valid Leads</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{previewData.validCount}</span>
              </div>

              <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-800/50">
                <span className="text-rose-400 text-[10px] uppercase tracking-wider block font-bold">Duplicates</span>
                <span className="text-xl font-extrabold text-rose-400 mt-1 block">{previewData.duplicateCount}</span>
              </div>

              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/50">
                <span className="text-amber-400 text-[10px] uppercase tracking-wider block font-bold">Missing Mobile</span>
                <span className="text-xl font-extrabold text-amber-400 mt-1 block">{previewData.missingMobileCount}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Invalid Rows</span>
                <span className="text-xl font-extrabold text-slate-400 mt-1 block">{previewData.invalidCount}</span>
              </div>
            </div>

            {/* Optional Bulk Assignment on Ingestion */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Assign All Valid Leads Directly to Consultant (Optional)
                </label>
                <select
                  value={assignConsultantId}
                  onChange={(e) => setAssignConsultantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Leave Unassigned in Master Pool</option>
                  {consultants.filter(c => c.is_active === 1).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Map Internal Business Vertical (Optional Admin Mapping)
                </label>
                <select
                  value={internalBusinessId}
                  onChange={(e) => setInternalBusinessId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Map Later</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sample Duplicate Breakdown (if any) */}
            {previewData.sampleDuplicates?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Detected Duplicates (Skipped from insertion):
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 bg-slate-950 rounded-xl border border-rose-900/30 text-xs">
                  {previewData.sampleDuplicates.map((d: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-900">
                      <span>Row #{d.row}: <strong className="text-slate-200">{d.companyName}</strong> ({d.mobile || d.cin})</span>
                      <span className="text-rose-400 font-mono text-[11px]">{d.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commit Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
              >
                Cancel & Upload Another File
              </button>

              <button
                type="button"
                onClick={handleCommitImport}
                disabled={isCommitting || previewData.validCount === 0}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-emerald-600/30 transition disabled:opacity-40 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isCommitting ? 'Committing to Database...' : `Commit ${previewData.validCount} Leads (Batch ${previewData.batchId})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Batches List & Analytics (PRD Section 9) */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Imported Batch History & Performance Tracking
            </h3>
            <p className="text-xs text-slate-400">Permanent Batch ID attribution measuring conversions and ROI by source batch</p>
          </div>
          <button onClick={fetchAuxData} className="p-1.5 text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Batch ID</th>
                <th className="py-2.5 px-3">Source & File</th>
                <th className="py-2.5 px-3">Total / Valid</th>
                <th className="py-2.5 px-3">Duplicates</th>
                <th className="py-2.5 px-3">Won Deals</th>
                <th className="py-2.5 px-3 text-right">Attributed Revenue</th>
                <th className="py-2.5 px-3">Import Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">No import batches on record.</td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-indigo-400 block">{b.batch_id}</span>
                      <span className="text-[10px] text-slate-400">{b.imported_by_name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{b.source_name}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[160px] block">{b.file_name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200">{b.valid_count} / {b.total_rows}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-rose-400">{b.duplicate_count}</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">{b.won_leads_count || 0}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      ₹{(b.batch_revenue || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

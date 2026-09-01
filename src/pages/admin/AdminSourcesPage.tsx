import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { LeadSource } from '../../types';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import { Layers, Plus, Tag, CheckCircle2 } from 'lucide-react';

export const AdminSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.sources.list();
      setSources(Array.isArray(res) ? res : (res?.sources || []));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast.error('Source Name and Code are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.sources.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      toast.success('Lead Source created successfully!');
      setIsAddModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      fetchSources();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Lead Source Configurations (PRD Section 1 & 6)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            MCA Database, Social Media, Google Ads, Meta, LinkedIn, WhatsApp, Referrals, and Inbound Channels
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Lead Source
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Fetching configurable lead sources..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sources.map((s) => (
            <div
              key={s.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-900/50">
                    {s.code}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-1.5">{s.name}</h3>
                {s.description && (
                  <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block pt-2 border-t border-slate-800">
                Created: {new Date(s.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Lead Source" maxWidth="max-w-md">
        <form onSubmit={handleCreateSource} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Source Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. YouTube Ads"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Source Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. YOUTUBE_ADS"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              {isSubmitting ? 'Creating...' : 'Create Source'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Business } from '../../types';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import { Building2, Plus, ShieldCheck, DollarSign, Layers } from 'lucide-react';

export const AdminBusinessesPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const res = await api.businesses.list();
      setBusinesses(res.businesses);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast.error('Business Name and Code are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.businesses.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      toast.success('Internal Business Vertical created!');
      setIsAddModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      fetchBusinesses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create business vertical');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Internal Business Verticals (Super Admin Only)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict isolation: Business Consultants NEVER see these business vertical names or mapping in their interface.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          Add Business Vertical
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Fetching business vertical entities..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/50">
                  {b.code}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded">
                  Active Vertical
                </span>
              </div>

              <h3 className="text-lg font-black text-white">{b.name}</h3>
              {b.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{b.description}</p>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Created: {new Date(b.created_at).toLocaleDateString()}</span>
                <span className="text-indigo-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Protected
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Internal Business Vertical" maxWidth="max-w-md">
        <form onSubmit={handleCreateBusiness} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Business Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dizibrand, Strategic HR, Fyntrust, No Brokerage"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Unique Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. DIZIBRAND, STRATEGIC_HR, FYNTRUST"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Scope of services for this vertical..."
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
              {isSubmitting ? 'Creating...' : 'Create Business'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  companyName: string;
  onSuccess: () => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  onClose,
  leadId,
  companyName,
  onSuccess,
}) => {
  const [serviceName, setServiceName] = useState('360 Degree Digital Growth & Branding Retainer');
  const [value, setValue] = useState('250000');
  const [currency, setCurrency] = useState('INR');
  const [status, setStatus] = useState('SENT');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !value) {
      toast.error('Service Name and Proposal Value are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.sales.createProposal({
        lead_id: leadId,
        service_name: serviceName.trim(),
        value: Number(value),
        currency,
        status: status as any,
        follow_up_date: followUpDate || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Proposal ${res.proposal_code} created successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create & Send Commercial Proposal" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Company</label>
          <input
            type="text"
            disabled
            value={companyName}
            className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Service / Solution Scope *</label>
          <input
            type="text"
            required
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Proposal Value (INR) *</label>
            <input
              type="number"
              required
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 250000"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent to Client</option>
              <option value="UNDER_DISCUSSION">Under Discussion</option>
              <option value="NEGOTIATION">Negotiation</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Follow-up Due Date</label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Proposal Notes / Terms</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Payment milestones, deliverables, special discount terms..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Submit Proposal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

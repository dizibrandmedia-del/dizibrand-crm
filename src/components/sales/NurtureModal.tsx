import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface NurtureModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  companyName: string;
  onSuccess: () => void;
}

export const NurtureModal: React.FC<NurtureModalProps> = ({
  isOpen,
  onClose,
  leadId,
  companyName,
  onSuccess,
}) => {
  const defaultFutureDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  const [futureDate, setFutureDate] = useState(defaultFutureDate);
  const [reason, setReason] = useState('Re-evaluate in Next Quarter (Q4)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!futureDate) {
      toast.error('Future follow-up date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.sales.nurture({
        lead_id: leadId,
        future_followup_date: futureDate,
        reason,
        notes: notes.trim() || undefined,
      });

      toast.success(`Lead moved to Nurture queue until ${futureDate}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to move lead to nurture');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🌱 Move Lead to Nurture Queue" maxWidth="max-w-md">
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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Future Re-engagement Date *
          </label>
          <input
            type="date"
            required
            value={futureDate}
            onChange={(e) => setFutureDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Nurture Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          >
            <option value="Re-evaluate in Next Quarter (Q4)">Re-evaluate in Next Quarter (Q4)</option>
            <option value="Waiting for New Funding Round">Waiting for New Funding Round</option>
            <option value="Contract with Existing Vendor Expires Soon">Contract with Existing Vendor Expires Soon</option>
            <option value="Product / Office Expansion Planned">Product / Office Expansion Planned</option>
            <option value="Seasonal Outreach">Seasonal Outreach</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Context for future consultant/outreach team..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Scheduling...' : 'Place in Nurture Queue'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

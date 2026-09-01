import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface MarkLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  companyName: string;
  onSuccess: () => void;
}

export const MarkLostModal: React.FC<MarkLostModalProps> = ({
  isOpen,
  onClose,
  leadId,
  companyName,
  onSuccess,
}) => {
  const [reason, setReason] = useState('NO_REQUIREMENT');
  const [competitorName, setCompetitorName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.sales.markLost({
        lead_id: leadId,
        reason,
        competitor_name: competitorName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success('Lead marked as Lost');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark lead as lost');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lostReasons = [
    { val: 'NO_REQUIREMENT', label: 'No Requirement Currently' },
    { val: 'PRICE', label: 'Pricing / High Quotation' },
    { val: 'EXISTING_VENDOR', label: 'Happy with Existing Vendor' },
    { val: 'COMPETITOR', label: 'Lost to Competitor Agency' },
    { val: 'BUDGET', label: 'No Approved Budget' },
    { val: 'TIMING', label: 'Bad Timing / Project Deferred' },
    { val: 'NOT_INTERESTED', label: 'Explicitly Not Interested' },
    { val: 'WRONG_CONTACT', label: 'Wrong Contact / Invalid Number' },
    { val: 'NO_RESPONSE', label: 'No Response after Multiple Attempts' },
    { val: 'OTHER', label: 'Other Reason' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Lead as Lost" maxWidth="max-w-md">
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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Lost Reason *</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
          >
            {lostReasons.map((r) => (
              <option key={r.val} value={r.val}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {['COMPETITOR', 'EXISTING_VENDOR'].includes(reason) && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Competitor / Vendor Name</label>
            <input
              type="text"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              placeholder="e.g. ABC Agency"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Reason Details & Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Feedback from client or why deal fell through..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Recording...' : 'Mark as Lost'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

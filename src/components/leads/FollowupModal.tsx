import React, { useState } from 'react';
import { Lead, Priority } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface FollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export const FollowupModal: React.FC<FollowupModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [followupDate, setFollowupDate] = useState(tomorrowStr);
  const [followupTime, setFollowupTime] = useState('11:00');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [reason, setReason] = useState('Discovery Follow-up');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupDate) {
      toast.error('Follow-up date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.followups.schedule({
        lead_id: lead.id,
        followup_date: followupDate,
        followup_time: followupTime,
        priority,
        reason,
        remark: remark.trim() || undefined,
      });

      toast.success(`Follow-up scheduled for ${followupDate} at ${followupTime}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Follow-up Call / Task" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lead Details */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <h4 className="text-xs font-bold text-slate-900">{lead.company_name}</h4>
          <p className="text-[11px] text-slate-500">{lead.contact_person} • {lead.mobile}</p>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={followupDate}
              onChange={(e) => setFollowupDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={followupTime}
              onChange={(e) => setFollowupTime(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['HOT', 'HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  priority === p
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Discovery Follow-up">Discovery Follow-up</option>
            <option value="Review Proposal Deck">Review Proposal Deck</option>
            <option value="Pricing Negotiation">Pricing Negotiation</option>
            <option value="Decision Maker Meeting">Decision Maker Meeting</option>
            <option value="Contract Signing">Contract Signing</option>
            <option value="General Check-in">General Check-in</option>
          </select>
        </div>

        {/* Remark */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Remark / Notes
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={2}
            placeholder="Context for next follow-up call..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit */}
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
            {isSubmitting ? 'Scheduling...' : 'Set Follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

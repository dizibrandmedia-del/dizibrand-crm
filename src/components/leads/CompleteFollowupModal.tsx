import React, { useState } from 'react';
import { FollowUp } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface CompleteFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: FollowUp | null;
  onSuccess: () => void;
}

export const CompleteFollowupModal: React.FC<CompleteFollowupModalProps> = ({
  isOpen,
  onClose,
  followup,
  onSuccess,
}) => {
  const [outcome, setOutcome] = useState('COMPLETED');
  const [remark, setRemark] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!followup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (outcome === 'RESCHEDULED' && !newDate) {
      toast.error('When rescheduling a follow-up, a new date is mandatory!');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.followups.complete(followup.id, {
        outcome,
        remark: remark.trim() || undefined,
        new_followup_date: outcome === 'RESCHEDULED' ? newDate : undefined,
        new_followup_time: outcome === 'RESCHEDULED' ? newTime : undefined,
      });

      toast.success(outcome === 'RESCHEDULED' ? 'Follow-up rescheduled!' : 'Follow-up completed successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const outcomeOptions = [
    { val: 'COMPLETED', label: '✅ Completed (Normal)' },
    { val: 'RESCHEDULED', label: '📅 Reschedule to New Date' },
    { val: 'INTERESTED', label: '🔥 Client is Interested' },
    { val: 'QUALIFIED', label: '🎯 Lead is Qualified' },
    { val: 'NOT_INTERESTED', label: '❌ Not Interested' },
    { val: 'NURTURE', label: '🌱 Move to Nurture Queue' },
    { val: 'LOST', label: '⛔ Mark as Lost' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete / Reschedule Follow-up" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <h4 className="text-xs font-bold text-slate-900">{followup.company_name}</h4>
          <p className="text-[11px] text-slate-500">
            {followup.contact_person} • {followup.reason || 'Follow-up'} • Due: {followup.followup_date} {followup.followup_time}
          </p>
        </div>

        {/* Outcome Choice */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Follow-up Result / Action <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-1.5">
            {outcomeOptions.map((opt) => (
              <label
                key={opt.val}
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                  outcome === opt.val
                    ? 'bg-indigo-50 border-indigo-600 font-bold text-indigo-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="followup_outcome"
                  value={opt.val}
                  checked={outcome === opt.val}
                  onChange={() => setOutcome(opt.val)}
                  className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mandatory New Date & Time if RESCHEDULED */}
        {outcome === 'RESCHEDULED' && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <span className="text-xs font-bold text-amber-900 block">
              ⚠️ New Date & Time Required for Rescheduling
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-amber-800 font-semibold mb-0.5">New Date *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-amber-800 font-semibold mb-0.5">New Time *</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Remark */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Follow-up Notes / Remarks
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={2}
            placeholder="Summary of what was discussed and agreed upon..."
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
            {isSubmitting ? 'Saving...' : 'Update Follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

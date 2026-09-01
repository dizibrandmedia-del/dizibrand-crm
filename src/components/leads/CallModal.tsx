import React, { useState } from 'react';
import { Lead, CallOutcome } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { Phone, PhoneCall, Clock, Calendar, CheckCircle2 } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [outcome, setOutcome] = useState<CallOutcome>('CONNECTED');
  const [durationMinutes, setDurationMinutes] = useState<number>(3);
  const [remark, setRemark] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleDeviceCall = () => {
    window.location.href = `tel:${lead.mobile}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.activities.logCall({
        lead_id: lead.id,
        outcome,
        duration_seconds: durationMinutes * 60,
        remark: remark.trim() || undefined,
        next_followup_date: nextFollowupDate || undefined,
        next_followup_time: nextFollowupTime || undefined,
      });

      toast.success(`Call logged as ${outcome}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log call');
    } finally {
      setIsSubmitting(false);
    }
  };

  const outcomes: { value: CallOutcome; label: string; color: string }[] = [
    { value: 'CONNECTED', label: 'Connected', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    { value: 'INTERESTED', label: 'Interested', color: 'bg-teal-50 text-teal-700 border-teal-300' },
    { value: 'QUALIFIED', label: 'Qualified', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
    { value: 'CALL_BACK', label: 'Call Back Required', color: 'bg-purple-50 text-purple-700 border-purple-300' },
    { value: 'NO_ANSWER', label: 'No Answer / Ringing', color: 'bg-amber-50 text-amber-700 border-amber-300' },
    { value: 'BUSY', label: 'Line Busy', color: 'bg-amber-50 text-amber-700 border-amber-300' },
    { value: 'SWITCHED_OFF', label: 'Switched Off / Unreachable', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'bg-rose-50 text-rose-700 border-rose-300' },
    { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'bg-rose-50 text-rose-700 border-rose-300' },
    { value: 'DND', label: 'DND (Do Not Disturb)', color: 'bg-red-50 text-red-800 border-red-300' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Direct Calling & Call Activity Log" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lead Details Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{lead.company_name}</h4>
            <p className="text-xs text-slate-600">
              {lead.contact_person} {lead.designation ? `(${lead.designation})` : ''} • <span className="font-mono font-bold text-slate-900">{lead.mobile}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeviceCall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
          >
            <Phone className="w-3.5 h-3.5 fill-current" />
            DIAL NOW
          </button>
        </div>

        {/* Outcome Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Call Outcome <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {outcomes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOutcome(opt.value)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition ${
                  outcome === opt.value
                    ? 'ring-2 ring-indigo-600 shadow-sm ' + opt.color
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Call Duration */}
        {['CONNECTED', 'INTERESTED', 'QUALIFIED', 'CALL_BACK', 'NOT_INTERESTED'].includes(outcome) && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Call Duration
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                    durationMinutes === mins
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Remark */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Call Remark / Discussion Points
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={2}
            placeholder="Key discussion points, requirement discussed, decision maker comments..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Next Follow-up Schedule Option */}
        <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Schedule Next Follow-up (Optional)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Date</label>
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Time</label>
              <input
                type="time"
                value={nextFollowupTime}
                onChange={(e) => setNextFollowupTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
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
            {isSubmitting ? 'Logging...' : 'Save Call Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

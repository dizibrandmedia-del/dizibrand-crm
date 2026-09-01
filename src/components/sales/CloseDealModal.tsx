import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { Business } from '../../types';
import { Award, CheckCircle2 } from 'lucide-react';

interface CloseDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  companyName: string;
  businesses: Business[];
  onSuccess: () => void;
}

export const CloseDealModal: React.FC<CloseDealModalProps> = ({
  isOpen,
  onClose,
  leadId,
  companyName,
  businesses,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [serviceName, setServiceName] = useState('Annual Marketing & Growth Retainer');
  const [internalBusinessId, setInternalBusinessId] = useState(businesses[0]?.id ? String(businesses[0].id) : '1');
  const [dealValue, setDealValue] = useState('300000');
  const [revenue, setRevenue] = useState('300000');
  const [paymentType, setPaymentType] = useState('ONE_TIME');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [closingDate, setClosingDate] = useState(todayStr);
  const [notes, setNotes] = useState('Contract signed, advance invoice cleared.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !internalBusinessId || !dealValue) {
      toast.error('Service Name, Business Vertical, and Deal Value are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.sales.closeWon({
        lead_id: leadId,
        service_name: serviceName.trim(),
        internal_business_id: Number(internalBusinessId),
        deal_value: Number(dealValue),
        revenue: Number(revenue || dealValue),
        payment_type: paymentType,
        payment_status: paymentStatus,
        closing_date: closingDate,
        notes: notes.trim() || undefined,
      });

      toast.success('🎉 Congratulations! Deal closed as WON and revenue attributed!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to close deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎉 Close Deal as WON (Revenue Attribution)" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2.5">
          <Award className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-bold block">Permanent Attribution Engine</span>
            Original Consultant and Lead Source will remain permanently attributed to this revenue even if leadership reassigned the account.
          </div>
        </div>

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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Service Delivered *</label>
          <input
            type="text"
            required
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Internal Business Vertical (Admin Only) *
          </label>
          <select
            required
            value={internalBusinessId}
            onChange={(e) => setInternalBusinessId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-indigo-900"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Deal Value (INR) *</label>
            <input
              type="number"
              required
              min="0"
              value={dealValue}
              onChange={(e) => {
                setDealValue(e.target.value);
                setRevenue(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Realized Revenue (INR)</label>
            <input
              type="number"
              required
              min="0"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ONE_TIME">One Time</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual Retainer</option>
              <option value="MILESTONE">Milestone</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-800"
            >
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Closing Date</label>
            <input
              type="date"
              required
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Closing Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            className="flex items-center gap-2 px-6 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Closing...' : 'Close Deal & Attribute Revenue'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

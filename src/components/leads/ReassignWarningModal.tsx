import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { AlertTriangle, UserX, Building2, ShieldAlert, ArrowRight } from 'lucide-react';

export interface AssignedLeadItem {
  id: number;
  company_name: string;
  contact_person?: string;
  business_name?: string;
  consultant_name?: string;
}

interface ReassignWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedLeads: AssignedLeadItem[];
  targetLabel?: string;
  onUnassignSuccess: () => void;
}

export const ReassignWarningModal: React.FC<ReassignWarningModalProps> = ({
  isOpen,
  onClose,
  assignedLeads,
  targetLabel,
  onUnassignSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unassignScope, setUnassignScope] = useState<'both' | 'consultant' | 'business'>('both');

  if (!isOpen || assignedLeads.length === 0) return null;

  const handleConfirmUnassign = async () => {
    setIsSubmitting(true);
    try {
      const leadIds = assignedLeads.map((l) => l.id);
      const unassign_consultant = unassignScope === 'both' || unassignScope === 'consultant';
      const unassign_business = unassignScope === 'both' || unassignScope === 'business';

      const res = await api.leads.unassign(leadIds, {
        unassign_consultant,
        unassign_business,
      });

      toast.success(res.message || 'Lead(s) unassigned successfully! Reassignment is now unlocked.');
      onUnassignSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unassign leads');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lead Already Assigned – Reassignment Locked" maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-3.5 shadow-sm">
          <div className="p-2 rounded-xl bg-amber-100/90 text-amber-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Reassignment Restricted
            </h4>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed font-normal">
              Direct reassignment is blocked without explicit unassignment. Before reassigning{' '}
              {targetLabel ? <span className="font-bold underline">{targetLabel}</span> : 'this lead'},{' '}
              you must first unassign it from the current business vertical and consultant.
            </p>
          </div>
        </div>

        {/* Assigned Leads Breakdown List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Assigned Record{assignedLeads.length > 1 ? 's' : ''} ({assignedLeads.length})
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Must be unassigned before reallocating
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/60">
            {assignedLeads.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{item.company_name}</span>
                  {item.contact_person && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {item.contact_person}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {item.business_name ? (
                    <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                      <Building2 className="w-3 h-3 text-indigo-500" />
                      <span>Business: <strong>{item.business_name}</strong></span>
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No business category</span>
                  )}

                  {item.consultant_name ? (
                    <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700">
                      <UserX className="w-3 h-3 text-teal-600" />
                      <span>Consultant: <strong>{item.consultant_name}</strong></span>
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No consultant</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope of Unassignment */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Select What To Unassign First
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'both', label: 'Unassign Both', desc: 'Business & Consultant' },
              { id: 'consultant', label: 'Consultant Only', desc: 'Keep Business' },
              { id: 'business', label: 'Business Only', desc: 'Keep Consultant' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setUnassignScope(opt.id as any)}
                className={`p-2.5 rounded-xl border text-left transition text-xs ${
                  unassignScope === opt.id
                    ? 'bg-amber-100/70 border-amber-500 text-amber-950 ring-1 ring-amber-500 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold block">{opt.label}</span>
                <span className="text-[10px] text-slate-500 block">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmUnassign}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <UserX className="w-3.5 h-3.5" />
            {isSubmitting ? 'Unassigning...' : 'Unassign Lead(s) Now'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

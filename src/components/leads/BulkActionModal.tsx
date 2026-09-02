import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { User, Business, Tag, Lead } from '../../types';
import { ReassignWarningModal, AssignedLeadItem } from './ReassignWarningModal';
import { UserX, Building2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  leads?: Lead[];
  consultants: User[];
  businesses: Business[];
  tags: Tag[];
  onSuccess: () => void;
  isSuperAdmin?: boolean;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  leads = [],
  consultants,
  businesses,
  tags,
  onSuccess,
  isSuperAdmin = false,
}) => {
  const [actionType, setActionType] = useState<'assign' | 'unassign' | 'status' | 'priority' | 'tags' | 'business'>('assign');
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ASSIGNED');
  const [selectedPriority, setSelectedPriority] = useState('HOT');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [unassignScope, setUnassignScope] = useState<'both' | 'consultant' | 'business'>('both');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Warning Modal State
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [conflictedLeads, setConflictedLeads] = useState<AssignedLeadItem[]>([]);
  const [pendingTargetLabel, setPendingTargetLabel] = useState('');

  const checkReassignmentConflict = (targetType: 'consultant' | 'business', targetId: number): AssignedLeadItem[] => {
    const selectedLeads = leads.filter((l) => selectedIds.includes(l.id));
    const conflicts: AssignedLeadItem[] = [];

    for (const lead of selectedLeads) {
      if (targetType === 'consultant') {
        if (lead.assigned_consultant_id && lead.assigned_consultant_id !== targetId) {
          conflicts.push({
            id: lead.id,
            company_name: lead.company_name,
            contact_person: lead.contact_person,
            business_name: lead.business_name,
            consultant_name: lead.assigned_consultant_name,
          });
        }
      } else if (targetType === 'business') {
        if (lead.internal_business_id && lead.internal_business_id !== targetId) {
          conflicts.push({
            id: lead.id,
            company_name: lead.company_name,
            contact_person: lead.contact_person,
            business_name: lead.business_name,
            consultant_name: lead.assigned_consultant_name,
          });
        }
      }
    }
    return conflicts;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    // 1. Guard check for Assign User
    if (actionType === 'assign' && selectedConsultant) {
      const cId = Number(selectedConsultant);
      const conflicts = checkReassignmentConflict('consultant', cId);
      if (conflicts.length > 0) {
        const cObj = consultants.find((c) => c.id === cId);
        setConflictedLeads(conflicts);
        setPendingTargetLabel(`to Consultant "${cObj?.name || 'New Consultant'}"`);
        setIsWarningOpen(true);
        return;
      }
    }

    // 2. Guard check for Map Business
    if (actionType === 'business' && selectedBusiness) {
      const bId = Number(selectedBusiness);
      const conflicts = checkReassignmentConflict('business', bId);
      if (conflicts.length > 0) {
        const bObj = businesses.find((b) => b.id === bId);
        setConflictedLeads(conflicts);
        setPendingTargetLabel(`to Business Category "${bObj?.name || 'New Business'}"`);
        setIsWarningOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (actionType === 'assign') {
        const cId = selectedConsultant ? Number(selectedConsultant) : null;
        await api.leads.bulkAssign(selectedIds, cId);
        toast.success(`Assigned ${selectedIds.length} leads successfully!`);
      } else if (actionType === 'unassign') {
        const unassign_consultant = unassignScope === 'both' || unassignScope === 'consultant';
        const unassign_business = unassignScope === 'both' || unassignScope === 'business';
        await api.leads.unassign(selectedIds, { unassign_consultant, unassign_business });
        toast.success(`Unassigned ${selectedIds.length} leads successfully!`);
      } else if (actionType === 'status') {
        await api.leads.bulkStatus(selectedIds, selectedStatus);
        toast.success(`Updated status for ${selectedIds.length} leads!`);
      } else if (actionType === 'priority') {
        await api.leads.bulkPriority(selectedIds, selectedPriority);
        toast.success(`Updated priority for ${selectedIds.length} leads!`);
      } else if (actionType === 'tags') {
        if (!selectedTagId) throw new Error('Please select a tag');
        await api.leads.bulkTags(selectedIds, [Number(selectedTagId)]);
        toast.success(`Added tag to ${selectedIds.length} leads!`);
      } else if (actionType === 'business') {
        if (!selectedBusiness) throw new Error('Please select a business vertical');
        await api.leads.bulkBusiness(selectedIds, Number(selectedBusiness));
        if (selectedConsultant) {
          await api.leads.bulkAssign(selectedIds, Number(selectedConsultant));
          toast.success(`Mapped ${selectedIds.length} leads to company & assigned consultant!`);
        } else {
          toast.success(`Mapped ${selectedIds.length} leads to internal business!`);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      // If backend returned REASSIGNMENT_LOCKED, display warning modal
      if (err.data?.error === 'REASSIGNMENT_LOCKED' && err.data?.assigned_leads) {
        setConflictedLeads(err.data.assigned_leads);
        setPendingTargetLabel('new assignment');
        setIsWarningOpen(true);
      } else {
        toast.error(err.message || 'Bulk action failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Bulk Action (${selectedIds.length} leads selected)`} maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Choose Bulk Operation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActionType('assign')}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                    actionType === 'assign'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Assign User
                </button>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActionType('business')}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                    actionType === 'business'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Map Business
                </button>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActionType('unassign')}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                    actionType === 'unassign'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Unassign Leads
                </button>
              )}

              <button
                type="button"
                onClick={() => setActionType('status')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                  actionType === 'status'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Change Status
              </button>

              <button
                type="button"
                onClick={() => setActionType('priority')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                  actionType === 'priority'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Set Priority
              </button>

              <button
                type="button"
                onClick={() => setActionType('tags')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                  actionType === 'tags'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Dynamic Parameter based on actionType */}
          {actionType === 'assign' && isSuperAdmin && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Select Business Consultant
              </label>
              <select
                value={selectedConsultant}
                onChange={(e) => setSelectedConsultant(e.target.value)}
                className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
              >
                <option value="" className="text-slate-900 font-medium">Select a consultant...</option>
                {consultants.filter((c) => Boolean(c.is_active)).map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-900 font-medium">
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Note: If any selected lead is already assigned to a consultant, you will be prompted to unassign it first.
              </p>
            </div>
          )}

          {actionType === 'business' && isSuperAdmin && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Select Company / Business Vertical <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
                  required
                >
                  <option value="" className="text-slate-900 font-medium">Select a Business Vertical...</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-900 font-medium">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-950 mb-1">
                  Step 2: Assign to Consultant (Optional)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Allocate directly to a consultant now, or leave in the company pool for subsequent assignment.
                </p>
                <select
                  value={selectedConsultant}
                  onChange={(e) => setSelectedConsultant(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
                >
                  <option value="" className="text-slate-900 font-medium">Leave in Company Pool (Unassigned to Consultant)</option>
                  {consultants.filter((c) => Boolean(c.is_active)).map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-900 font-medium">
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {actionType === 'unassign' && isSuperAdmin && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <UserX className="w-4 h-4 text-amber-700" />
                  Unassign Leads from Current Allocation
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                  Before reassigning leads to another business category or consultant, unassigning them restores them cleanly to the pool.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Scope of Unassignment
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'both', label: 'Unassign Both (Consultant & Business Category)', desc: 'Resets leads back to unassigned inbound pool.' },
                    { id: 'consultant', label: 'Unassign Consultant Only', desc: 'Frees consultant while keeping the business vertical mapping intact.' },
                    { id: 'business', label: 'Unassign Business Category Only', desc: 'Clears business vertical mapping while retaining consultant.' },
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
            </div>
          )}

          {actionType === 'status' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Target Lead Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
              >
                <option value="ASSIGNED" className="text-slate-900 font-medium">Assigned</option>
                <option value="CONTACT_ATTEMPTED" className="text-slate-900 font-medium">Contact Attempted</option>
                <option value="CONNECTED" className="text-slate-900 font-medium">Connected</option>
                <option value="INTERESTED" className="text-slate-900 font-medium">Interested</option>
                <option value="FOLLOW_UP" className="text-slate-900 font-medium">Follow Up</option>
                <option value="QUALIFIED" className="text-slate-900 font-medium">Qualified</option>
                <option value="NOT_INTERESTED" className="text-slate-900 font-medium">Not Interested</option>
                <option value="DND" className="text-slate-900 font-medium">DND</option>
                <option value="NURTURE" className="text-slate-900 font-medium">Nurture</option>
              </select>
            </div>
          )}

          {actionType === 'priority' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Target Priority Level
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
              >
                <option value="HOT" className="text-slate-900 font-medium">🔥 Hot</option>
                <option value="HIGH" className="text-slate-900 font-medium">High</option>
                <option value="MEDIUM" className="text-slate-900 font-medium">Medium</option>
                <option value="LOW" className="text-slate-900 font-medium">Low</option>
              </select>
            </div>
          )}

          {actionType === 'tags' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Select Tag to Apply
              </label>
              <select
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
              >
                <option value="" className="text-slate-900 font-medium">Select a Tag...</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-900 font-medium">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition disabled:opacity-50 ${
                actionType === 'unassign'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting
                ? 'Processing...'
                : actionType === 'unassign'
                ? 'Confirm Unassignment'
                : 'Apply Action'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pop-up Warning Modal for Already-Assigned Leads */}
      <ReassignWarningModal
        isOpen={isWarningOpen}
        onClose={() => setIsWarningOpen(false)}
        assignedLeads={conflictedLeads}
        targetLabel={pendingTargetLabel}
        onUnassignSuccess={() => {
          setIsWarningOpen(false);
          onSuccess();
        }}
      />
    </>
  );
};

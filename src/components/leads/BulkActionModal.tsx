import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { User, Business, Tag } from '../../types';

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
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
  consultants,
  businesses,
  tags,
  onSuccess,
  isSuperAdmin = false,
}) => {
  const [actionType, setActionType] = useState<'assign' | 'status' | 'priority' | 'tags' | 'business'>('assign');
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ASSIGNED');
  const [selectedPriority, setSelectedPriority] = useState('HOT');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      if (actionType === 'assign') {
        const cId = selectedConsultant ? Number(selectedConsultant) : null;
        await api.leads.bulkAssign(selectedIds, cId);
        toast.success(`Assigned ${selectedIds.length} leads successfully!`);
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
        toast.success(`Mapped ${selectedIds.length} leads to internal business!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Assign User
              </button>
            )}

            <button
              type="button"
              onClick={() => setActionType('status')}
              className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                actionType === 'status'
                  ? 'bg-indigo-600 text-white border-indigo-600'
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
                  ? 'bg-indigo-600 text-white border-indigo-600'
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
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Add Tag
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActionType('business')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                  actionType === 'business'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Map Business
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Parameter based on actionType */}
        {actionType === 'assign' && isSuperAdmin && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Select Business Consultant
            </label>
            <select
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Unassign / Leave Unassigned</option>
              {consultants.filter(c => c.is_active === 1).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {actionType === 'status' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Target Lead Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ASSIGNED">Assigned</option>
              <option value="CONTACT_ATTEMPTED">Contact Attempted</option>
              <option value="CONNECTED">Connected</option>
              <option value="INTERESTED">Interested</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="DND">DND</option>
              <option value="NURTURE">Nurture</option>
            </select>
          </div>
        )}

        {actionType === 'priority' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Target Priority Level
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="HOT">🔥 Hot</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        )}

        {actionType === 'tags' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Select Tag to Apply
            </label>
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Select a Tag...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {actionType === 'business' && isSuperAdmin && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Select Internal Business Vertical (Admin Only)
            </label>
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Select a Business Vertical...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
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
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Applying...' : `Apply to ${selectedIds.length} Leads`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

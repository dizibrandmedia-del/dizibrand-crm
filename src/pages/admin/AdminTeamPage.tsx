import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { User } from '../../types';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import {
  Users, UserPlus, ShieldAlert, CheckCircle2,
  XCircle, ArrowRightLeft, Target, Phone, Mail, Edit, Trash2, Power, UserCheck, Key, Lock
} from 'lucide-react';

export const AdminTeamPage: React.FC = () => {
  const [consultants, setConsultants] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<User | null>(null);

  // Add / Edit Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isActiveStatus, setIsActiveStatus] = useState<number>(1);
  const [callTarget, setCallTarget] = useState(30);
  const [whatsappTarget, setWhatsappTarget] = useState(25);
  const [leadTarget, setLeadTarget] = useState(60);
  const [followupTarget, setFollowupTarget] = useState(15);
  const [potentialTarget, setPotentialTarget] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivation / Deletion Reassign form
  const [reassignConsultantId, setReassignConsultantId] = useState('');

  const fetchConsultants = async () => {
    setIsLoading(true);
    try {
      const res = await api.consultants.list();
      setConsultants(res.consultants);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load consultants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultants();
  }, []);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setMobile('');
    setPassword('Consultant@123456');
    setCallTarget(30);
    setWhatsappTarget(25);
    setLeadTarget(60);
    setFollowupTarget(15);
    setPotentialTarget(5);
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: User) => {
    setSelectedConsultant(c);
    setName(c.name || '');
    setEmail(c.email || '');
    setMobile(c.mobile || '');
    setPassword('');
    setIsActiveStatus(c.is_active === 1 ? 1 : 0);
    setCallTarget(c.daily_call_target || 30);
    setWhatsappTarget(c.daily_whatsapp_target || 25);
    setLeadTarget(c.daily_lead_target || 60);
    setFollowupTarget((c as any).daily_followup_target || 15);
    setPotentialTarget((c as any).daily_potential_target || 5);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (c: User) => {
    setSelectedConsultant(c);
    setReassignConsultantId('');
    setIsDeleteModalOpen(true);
  };

  const handleAddConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Name, Email, and Password are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.consultants.create({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim() || undefined,
        password: password.trim(),
        daily_call_target: Number(callTarget),
        daily_whatsapp_target: Number(whatsappTarget),
        daily_lead_target: Number(leadTarget),
        daily_followup_target: Number(followupTarget),
        daily_potential_target: Number(potentialTarget),
      });

      toast.success('New Business Consultant onboarded successfully!');
      setIsAddModalOpen(false);
      fetchConsultants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create consultant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultant) return;
    if (!name || !email) {
      toast.error('Name and Email are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.consultants.update(selectedConsultant.id, {
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim() || undefined,
        password: password.trim() ? password.trim() : undefined,
        is_active: isActiveStatus,
        daily_call_target: Number(callTarget),
        daily_whatsapp_target: Number(whatsappTarget),
        daily_lead_target: Number(leadTarget),
        daily_followup_target: Number(followupTarget),
        daily_potential_target: Number(potentialTarget),
      });

      toast.success(`Consultant "${name}" updated successfully!`);
      setIsEditModalOpen(false);
      setSelectedConsultant(null);
      fetchConsultants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update consultant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultant) return;

    setIsSubmitting(true);
    try {
      await api.consultants.delete(selectedConsultant.id, {
        reassign_to_id: reassignConsultantId ? Number(reassignConsultantId) : undefined,
      });

      toast.success(`Consultant "${selectedConsultant.name}" deleted permanently.`);
      setIsDeleteModalOpen(false);
      setSelectedConsultant(null);
      fetchConsultants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete consultant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultant) return;

    setIsSubmitting(true);
    try {
      await api.consultants.deactivate(
        selectedConsultant.id,
        reassignConsultantId ? Number(reassignConsultantId) : undefined
      );

      toast.success(`Consultant ${selectedConsultant.name} deactivated and workload reassigned!`);
      setIsDeactivateModalOpen(false);
      setSelectedConsultant(null);
      fetchConsultants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate consultant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (c: User) => {
    try {
      const res = await api.consultants.toggleStatus(c.id);
      toast.success(res.message || 'Status updated');
      fetchConsultants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Business Consultant Team & RBAC Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage consultants, edit details, assign daily quotas, and securely delete or reassign accounts
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Add Consultant
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Fetching consultant roster and activity counts..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consultants.map((c) => {
            const isActive = c.is_active === 1;

            return (
              <div
                key={c.id}
                className={`bg-slate-900/90 rounded-2xl border p-5 shadow-xl space-y-4 flex flex-col justify-between transition hover:border-slate-700 ${
                  isActive ? 'border-slate-800' : 'border-slate-800/80 opacity-70 bg-slate-950/80'
                }`}
              >
                <div>
                  {/* Top Bar with Badge and Quick Icons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        USER ID #{c.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </div>

                    {/* Quick Action Icons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(c)}
                        title="Edit Consultant"
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/40 rounded-lg transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(c)}
                        title="Delete Consultant"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-white mt-2">{c.name}</h3>
                  <div className="text-xs text-slate-400 space-y-1 mt-1 font-medium">
                    <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> {c.email}</p>
                    {c.mobile && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {c.mobile}</p>}
                  </div>

                  {/* Quotas */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center text-xs">
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Calls / Day</span>
                      <span className="font-bold text-emerald-400 mt-0.5 block">{c.daily_call_target || 30}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">WA / Day</span>
                      <span className="font-bold text-teal-400 mt-0.5 block">{c.daily_whatsapp_target || 25}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Leads / Day</span>
                      <span className="font-bold text-indigo-400 mt-0.5 block">{c.daily_lead_target || 60}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs gap-2">
                  <button
                    onClick={() => openEditModal(c)}
                    className="px-3 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/40 text-indigo-300 rounded-lg transition font-bold flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" /> Edit Details
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <button
                        onClick={() => {
                          setSelectedConsultant(c);
                          setIsDeactivateModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-amber-400 hover:bg-amber-950/40 border border-amber-800/30 rounded-lg transition font-semibold text-[11px]"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className="px-2.5 py-1.5 text-emerald-400 hover:bg-emerald-950/40 border border-emerald-800/30 rounded-lg transition font-semibold text-[11px]"
                      >
                        Reactivate
                      </button>
                    )}

                    <button
                      onClick={() => openDeleteModal(c)}
                      className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-950/50 border border-rose-800/30 rounded-lg transition font-bold text-[11px] flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Consultant Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Onboard Business Consultant" maxWidth="max-w-md">
        <form onSubmit={handleAddConsultant} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahul@dizibrand.com"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Mobile Number</label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+91 9811122233"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Initial Password *</label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Calls Target</label>
              <input
                type="number"
                value={callTarget}
                onChange={(e) => setCallTarget(Number(e.target.value))}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 text-white rounded text-center text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">WhatsApp</label>
              <input
                type="number"
                value={whatsappTarget}
                onChange={(e) => setWhatsappTarget(Number(e.target.value))}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 text-white rounded text-center text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Leads/Day</label>
              <input
                type="number"
                value={leadTarget}
                onChange={(e) => setLeadTarget(Number(e.target.value))}
                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 text-white rounded text-center text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30"
            >
              {isSubmitting ? 'Creating...' : 'Onboard Consultant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Consultant Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedConsultant(null);
        }}
        title={`Edit Consultant: ${selectedConsultant?.name}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEditConsultant} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Mobile Number</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Account Status</label>
              <select
                value={isActiveStatus}
                onChange={(e) => setIsActiveStatus(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value={1}>Active (Login Enabled)</option>
                <option value={0}>Deactivated (Login Disabled)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Reset Password (Optional)
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep existing password"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Enter at least 6 characters if you wish to reset their password.</p>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <span className="text-xs font-bold text-indigo-400 block mb-2">Daily Performance Quotas</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Calls Target</label>
                <input
                  type="number"
                  min="0"
                  value={callTarget}
                  onChange={(e) => setCallTarget(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 text-white rounded text-center text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">WhatsApp</label>
                <input
                  type="number"
                  min="0"
                  value={whatsappTarget}
                  onChange={(e) => setWhatsappTarget(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 text-white rounded text-center text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Leads/Day</label>
                <input
                  type="number"
                  min="0"
                  value={leadTarget}
                  onChange={(e) => setLeadTarget(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 text-white rounded text-center text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedConsultant(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30"
            >
              {isSubmitting ? 'Saving...' : 'Update Consultant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Consultant Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedConsultant(null);
        }}
        title={`Delete Consultant: ${selectedConsultant?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeleteConsultant} className="space-y-4">
          <div className="p-3.5 bg-rose-950/40 rounded-xl border border-rose-800/40 text-xs text-rose-300 space-y-1.5">
            <span className="font-bold flex items-center gap-1.5 text-rose-200">
              <ShieldAlert className="w-4 h-4" /> Permanent Account Deletion
            </span>
            <p>
              Are you sure you want to permanently delete <strong>{selectedConsultant?.name}</strong> ({selectedConsultant?.email})? This action cannot be undone.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Reassign Active Leads To:
            </label>
            <select
              value={reassignConsultantId}
              onChange={(e) => setReassignConsultantId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="">Return to Unassigned Leads Pool</option>
              {consultants
                .filter((c) => c.is_active === 1 && c.id !== selectedConsultant?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Reassign to: {c.name} ({c.email})
                  </option>
                ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Select another active consultant to take over this consultant's leads, or leave in the unassigned pool.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedConsultant(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30"
            >
              {isSubmitting ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate & Reassign Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setSelectedConsultant(null);
        }}
        title={`Deactivate Consultant: ${selectedConsultant?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeactivate} className="space-y-4">
          <div className="p-3.5 bg-amber-950/40 rounded-xl border border-amber-800/40 text-xs text-amber-300 space-y-1.5">
            <span className="font-bold block text-amber-200">Historical Attribution Preservation</span>
            <p>
              Deactivating this user revokes their login immediately. Historical call and deal logs remain credited to {selectedConsultant?.name}.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Reassign Active Leads & Follow-ups To:
            </label>
            <select
              value={reassignConsultantId}
              onChange={(e) => setReassignConsultantId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="">Do not reassign (Leave in Unassigned Pool)</option>
              {consultants
                .filter((c) => c.is_active === 1 && c.id !== selectedConsultant?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsDeactivateModalOpen(false);
                setSelectedConsultant(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-sm"
            >
              {isSubmitting ? 'Deactivating...' : 'Confirm Deactivation & Reassign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

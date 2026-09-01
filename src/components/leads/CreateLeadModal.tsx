import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { User, Business, LeadSource, Tag, Priority } from '../../types';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: User[];
  businesses: Business[];
  sources: LeadSource[];
  tags: Tag[];
  onSuccess: () => void;
  isSuperAdmin?: boolean;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  consultants,
  businesses,
  sources,
  tags,
  onSuccess,
  isSuperAdmin = false,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [cin, setCin] = useState('');
  const [companyType, setCompanyType] = useState('Private Limited');
  const [industry, setIndustry] = useState('');
  const [subIndustry, setSubIndustry] = useState('');
  const [incorporationDate, setIncorporationDate] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [website, setWebsite] = useState('');

  const [contactPerson, setContactPerson] = useState('');
  const [designation, setDesignation] = useState('Director');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');

  const [sourceId, setSourceId] = useState('12'); // Manual Entry default
  const [sourceCampaign, setSourceCampaign] = useState('');
  const [assignedConsultantId, setAssignedConsultantId] = useState('');
  const [internalBusinessId, setInternalBusinessId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [remarks, setRemarks] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactPerson || !mobile) {
      toast.error('Company Name, Contact Person, and Mobile are required!');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.leads.create({
        company_name: companyName.trim(),
        cin: cin.trim() || undefined,
        company_type: companyType,
        industry: industry.trim() || undefined,
        sub_industry: subIndustry.trim() || undefined,
        incorporation_date: incorporationDate || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        registered_address: registeredAddress.trim() || undefined,
        website: website.trim() || undefined,
        contact_person: contactPerson.trim(),
        designation: designation.trim() || undefined,
        mobile: mobile.trim(),
        alternate_mobile: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        source_id: Number(sourceId),
        source_campaign: sourceCampaign.trim() || undefined,
        assigned_consultant_id: assignedConsultantId ? Number(assignedConsultantId) : undefined,
        internal_business_id: internalBusinessId ? Number(internalBusinessId) : undefined,
        priority,
        remarks: remarks.trim() || undefined,
        tag_ids: selectedTagIds,
      });

      toast.success('Lead created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Lead (Manual Entry)" maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Company Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 p-2 rounded-lg mb-2">
            1. Company Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">CIN (Corporate ID)</label>
              <input
                type="text"
                value={cin}
                onChange={(e) => setCin(e.target.value)}
                placeholder="e.g. U72200KA2024PTC123456"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Company Type</label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Private Limited">Private Limited</option>
                <option value="Public Limited">Public Limited</option>
                <option value="LLP">LLP</option>
                <option value="Partnership">Partnership</option>
                <option value="Proprietorship">Proprietorship</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Information Technology"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 p-2 rounded-lg mb-2">
            2. Contact Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Contact Person *</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Managing Director / Founder"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Mobile Number *</label>
              <input
                type="text"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Alternate Mobile</label>
              <input
                type="text"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
                placeholder="Optional second number"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@example.com"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="HOT">🔥 Hot</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: CRM Details */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 p-2 rounded-lg mb-2">
            3. CRM & Attribution
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Lead Source</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {isSuperAdmin && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Assign Consultant</label>
                <select
                  value={assignedConsultantId}
                  onChange={(e) => setAssignedConsultantId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Leave Unassigned</option>
                  {consultants.filter(c => c.is_active === 1).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Internal Business Unit</label>
                <select
                  value={internalBusinessId}
                  onChange={(e) => setInternalBusinessId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Business...</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const isSelected = selectedTagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Initial Remark / Notes</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Any background notes or context..."
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
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
            className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Lead } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface PotentialHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export const PotentialHandoverModal: React.FC<PotentialHandoverModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [requirement, setRequirement] = useState('');
  const [requirementDetails, setRequirementDetails] = useState('');
  const [interestLevel, setInterestLevel] = useState('VERY_HIGH');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState('IMMEDIATE');
  const [decisionMaker, setDecisionMaker] = useState('');
  const [currentVendor, setCurrentVendor] = useState('');
  const [callRemark, setCallRemark] = useState('');
  const [whatsappSummary, setWhatsappSummary] = useState('');
  const [recommendedNextAction, setRecommendedNextAction] = useState('Schedule Online Discovery Meeting with Super Admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requirement || !requirementDetails || !decisionMaker || !recommendedNextAction) {
      toast.error('Please fill in all mandatory fields!');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.potentialLeads.handover({
        lead_id: lead.id,
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        mobile: lead.mobile,
        requirement: requirement.trim(),
        requirement_details: requirementDetails.trim(),
        interest_level: interestLevel,
        budget: budget.trim() || undefined,
        urgency,
        decision_maker: decisionMaker.trim(),
        current_vendor: currentVendor.trim() || undefined,
        call_remark: callRemark.trim() || undefined,
        whatsapp_summary: whatsappSummary.trim() || undefined,
        recommended_next_action: recommendedNextAction.trim(),
      });

      toast.success('🔥 Opportunity handed over to Super Admin as Potential Lead!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit potential lead handover');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔥 Send as Potential Lead to Super Admin" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Owner Handover Workflow</span>
            Submitting this handover transitions the lead status to <span className="font-bold underline">OWNER_HANDOVER</span> and immediately alerts Super Admin for closing takeover, discovery meeting, and proposal drafting.
          </div>
        </div>

        {/* Company & Contact Read-Only Preview */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Company Name</span>
            <span className="font-bold text-slate-800 truncate block">{lead.company_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Decision Contact</span>
            <span className="font-bold text-slate-800 truncate block">{lead.contact_person}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Direct Mobile</span>
            <span className="font-bold font-mono text-slate-900 truncate block">{lead.mobile}</span>
          </div>
        </div>

        {/* 1. Core Requirement */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Identified Requirement / Scope <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="e.g. 360 Digital Marketing & Performance Branding Retainer"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
          />
        </div>

        {/* 2. Requirement Details */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Requirement Details & Client Pain Points <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            value={requirementDetails}
            onChange={(e) => setRequirementDetails(e.target.value)}
            rows={3}
            placeholder="Detail what client specifically wants, their goals, target timeline, expectations..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* 3. Interest Level & Urgency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Client Interest Level <span className="text-rose-500">*</span>
            </label>
            <select
              value={interestLevel}
              onChange={(e) => setInterestLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            >
              <option value="VERY_HIGH">🔥 Very High (Ready to start immediately)</option>
              <option value="HIGH">High (Strong interest, evaluating solutions)</option>
              <option value="MEDIUM">Medium (Exploring options for next quarter)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Urgency / Timeline <span className="text-rose-500">*</span>
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            >
              <option value="IMMEDIATE">⚡ Immediate (Within 7-15 Days)</option>
              <option value="THIS_MONTH">This Month (Within 30 Days)</option>
              <option value="NEXT_MONTH">Next Month / Q4</option>
            </select>
          </div>
        </div>

        {/* 4. Decision Maker & Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Decision Maker Verification <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={decisionMaker}
              onChange={(e) => setDecisionMaker(e.target.value)}
              placeholder="e.g. Vikramaditya Roy (MD - Sole Authority)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Estimated Budget (if disclosed)
            </label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. ₹2,00,000 / month or ₹15 Lakhs one-time"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* 5. Existing Vendor */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Current Vendor / Competitor (if applicable)
          </label>
          <input
            type="text"
            value={currentVendor}
            onChange={(e) => setCurrentVendor(e.target.value)}
            placeholder="e.g. In-house team / Competitor Agency / None"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* 6. Interaction Summaries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Calling Remark Summary
            </label>
            <textarea
              value={callRemark}
              onChange={(e) => setCallRemark(e.target.value)}
              rows={2}
              placeholder="Key notes from phone conversation..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              WhatsApp Summary
            </label>
            <textarea
              value={whatsappSummary}
              onChange={(e) => setWhatsappSummary(e.target.value)}
              rows={2}
              placeholder="Shared documents, client response on chat..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* 7. Recommended Next Action */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Recommended Next Action for Admin <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={recommendedNextAction}
            onChange={(e) => setRecommendedNextAction(e.target.value)}
            placeholder="e.g. Schedule online discovery meeting with Super Admin & Creative Director"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/30 transition disabled:opacity-50 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            {isSubmitting ? 'Handing Over...' : 'SUBMIT POTENTIAL LEAD'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Lead, WhatsAppOutcome } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { MessageCircle, Copy, Building2, UserCheck, AlertCircle } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [template, setTemplate] = useState('intro');
  const [customMessage, setCustomMessage] = useState('');
  const [outcome, setOutcome] = useState<WhatsAppOutcome>('SENT');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolved dynamic greeting names
  const [resolvedBusinessName, setResolvedBusinessName] = useState<string>(lead?.business_name || '');
  const [resolvedMemberName, setResolvedMemberName] = useState<string>(lead?.assigned_consultant_name || '');

  useEffect(() => {
    if (!isOpen || !lead) return;

    setCustomMessage('');
    const initialBiz = lead.business_name || '';
    const initialMember = lead.assigned_consultant_name || '';

    setResolvedBusinessName(initialBiz);
    setResolvedMemberName(initialMember);

    // If business name or assigned consultant is missing on the passed lead object, fetch full details from DB
    if ((!initialBiz || !initialMember) && lead.id) {
      api.leads.getById(lead.id)
        .then((res: any) => {
          if (res?.lead) {
            if (res.lead.business_name) setResolvedBusinessName(res.lead.business_name);
            if (res.lead.assigned_consultant_name) setResolvedMemberName(res.lead.assigned_consultant_name);
          }
        })
        .catch(() => {
          // Graceful fallback
        });
    }
  }, [isOpen, lead?.id, lead?.business_name, lead?.assigned_consultant_name]);

  if (!lead) return null;

  const rawMobile = String(lead.mobile || lead.alternate_mobile || '');
  const digits = rawMobile.replace(/[^0-9]/g, '');
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;

  // Exact greeting requirements:
  // "Hello [Lead Name], this is [Consultant Name] from [Assigned Business Name]."
  const leadName = lead.contact_person?.trim() || lead.company_name?.trim() || 'Sir/Madam';
  const consultantName = resolvedMemberName?.trim() || lead.assigned_consultant_name?.trim() || user?.name?.trim() || 'Business Consultant';
  
  // Specifically the assigned business category mapped to this lead, NOT the panel's master CRM name
  const hasAssignedBusiness = Boolean(resolvedBusinessName?.trim() || lead.business_name?.trim());
  const assignedBusinessName = (resolvedBusinessName?.trim() || lead.business_name?.trim()) || 'our corporate advisory team';

  const templates: Record<string, { title: string; text: string }> = {
    intro: {
      title: 'Introduction & Value Proposition',
      text: `Hello ${leadName}, this is ${consultantName} from ${assignedBusinessName}.\n\nWe noticed that ${lead.company_name} is scaling rapidly. We specialize in corporate services, compliance, and specialized growth advisory designed for enterprises in your industry.\n\nWould you be open for a brief 10-minute discovery call this week?\n\nWarm regards,\n${consultantName}\n${assignedBusinessName}`,
    },
    service_inquiry: {
      title: 'Business Service & Solutions',
      text: `Hello ${leadName}, this is ${consultantName} from ${assignedBusinessName}.\n\nI am reaching out regarding business solutions and specialized services for ${lead.company_name}. We help companies streamline their operations, filings, and growth roadmap.\n\nCould we schedule a quick 5-minute call today to discuss how ${assignedBusinessName} can assist your operations?\n\nBest regards,\n${consultantName}\n${assignedBusinessName}`,
    },
    pitch_deck: {
      title: 'Share Company Portfolio Deck',
      text: `Hello ${leadName}, this is ${consultantName} from ${assignedBusinessName}.\n\nThank you for your time on our recent discussion. As promised, I am sharing the corporate presentation and tailored solutions from ${assignedBusinessName} for ${lead.company_name}.\n\nPlease let me know a convenient time to review the proposal together.\n\nWarm regards,\n${consultantName}\n${assignedBusinessName}`,
    },
    follow_up: {
      title: 'Follow-up on Discussion / Proposal',
      text: `Hello ${leadName}, this is ${consultantName} from ${assignedBusinessName}.\n\nJust following up regarding our previous discussion for ${lead.company_name}. Did you get a chance to review the details we shared from ${assignedBusinessName}? Looking forward to hearing your thoughts.\n\nBest regards,\n${consultantName}\n${assignedBusinessName}`,
    },
    meeting_confirm: {
      title: 'Discovery Meeting Confirmation',
      text: `Hello ${leadName}, this is ${consultantName} from ${assignedBusinessName}.\n\nConfirming our scheduled discovery meeting with ${assignedBusinessName} regarding ${lead.company_name} for ${lead.next_followup_date || 'our upcoming call'}.\n\nPlease let me know if you need to adjust the timing or have any questions beforehand.\n\nBest regards,\n${consultantName}\n${assignedBusinessName}`,
    },
  };

  const messageToSend = customMessage || (templates[template] ? templates[template].text : '');

  const handleOpenWhatsApp = () => {
    if (!formattedPhone || formattedPhone.length < 10) {
      toast.error('No valid phone number found for this lead.');
      return;
    }
    const encoded = encodeURIComponent(messageToSend);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageToSend);
    toast.success('Message copied to clipboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.activities.logWhatsApp({
        lead_id: lead.id,
        outcome,
        template_name: templates[template]?.title || 'Custom Message',
        message_preview: messageToSend.substring(0, 150),
        remark: remark.trim() || undefined,
      });

      toast.success('WhatsApp outreach logged successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log WhatsApp activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Direct WhatsApp Outreach & Activity Log" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Info Header */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{lead.company_name}</h4>
            <p className="text-xs text-slate-600">
              {leadName} • <span className="font-mono font-bold text-slate-900">{lead.mobile}</span>
            </p>
            {/* Greeting Identity Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {hasAssignedBusiness ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700" title="Assigned Business Category mapped to this lead">
                  <Building2 className="w-3 h-3 text-indigo-500" />
                  <span>Business Category: <strong>{assignedBusinessName}</strong></span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700" title="No business category mapped to this lead">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Business: <strong>Not Mapped (Generic)</strong></span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700" title="Assigned Consultant / Sender">
                <UserCheck className="w-3 h-3 text-teal-500" />
                <span>Consultant: <strong>{consultantName}</strong></span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            OPEN WHATSAPP
          </button>
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Choose Message Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(templates).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTemplate(key);
                  setCustomMessage('');
                }}
                className={`p-2 text-xs font-semibold rounded-xl border text-left transition ${
                  template === key && !customMessage
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        {/* Message Content Preview */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Message Preview (Greets as {consultantName} from {assignedBusinessName})
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              Copy text
            </button>
          </div>
          <textarea
            value={messageToSend}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-normal leading-relaxed"
          />
        </div>

        {/* Outreach Outcome */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            WhatsApp Activity Outcome
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'SENT', label: 'Message Sent' },
              { val: 'REPLIED', label: 'Client Replied' },
              { val: 'INTERESTED', label: 'Client Interested' },
              { val: 'NOT_INTERESTED', label: 'Not Interested' },
              { val: 'NO_RESPONSE', label: 'No Response' },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setOutcome(opt.val as WhatsAppOutcome)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border text-center transition ${
                  outcome === opt.val
                    ? 'bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Remark */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Remark (Optional)
          </label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Add note on client's WhatsApp interaction..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Logging...' : 'Save WhatsApp Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

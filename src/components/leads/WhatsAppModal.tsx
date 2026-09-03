import React, { useState, useEffect } from 'react';
import { Lead, WhatsAppOutcome } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { MessageCircle, Copy, Building2, UserCheck, RefreshCw } from 'lucide-react';
import {
  normalizeBusinessKey,
  getBusinessDisplayName,
  getBusinessTemplates,
  BusinessKey,
} from '../../services/whatsappTemplates';

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

  // Business verticals list
  const [businesses, setBusinesses] = useState<{ id: number; name: string; code?: string }[]>([]);

  // Resolved dynamic greeting parameters
  const [resolvedBusinessName, setResolvedBusinessName] = useState<string>('');
  const [resolvedMemberName, setResolvedMemberName] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');

  // Fetch available business categories once on mount
  useEffect(() => {
    api.businesses.list()
      .then((res: any) => {
        if (res?.businesses && Array.isArray(res.businesses)) {
          setBusinesses(res.businesses);
        }
      })
      .catch((err) => {
        console.error('Failed to load businesses:', err);
      });
  }, []);

  // When modal opens or lead changes, resolve greeting parameters
  useEffect(() => {
    if (!isOpen || !lead) return;

    setCustomMessage('');
    setTemplate('intro');

    // 1. Initial resolution of business name
    let initialBiz = (lead.business_name || (lead as any).internal_business_name || '').trim();
    if (!initialBiz && lead.internal_business_id && businesses.length > 0) {
      const match = businesses.find((b) => b.id === Number(lead.internal_business_id));
      if (match) initialBiz = match.name;
    }
    if (!initialBiz && businesses.length > 0) {
      const fyn = businesses.find((b) => b.name.toLowerCase().includes('fyn'));
      initialBiz = fyn ? fyn.name : businesses[0].name;
    }

    const initialKey = normalizeBusinessKey(initialBiz || lead.internal_business_id);
    setResolvedBusinessName(getBusinessDisplayName(initialKey));

    // 2. Initial resolution of consultant name
    let initialMember = (lead.assigned_consultant_name || '').trim();
    if (!initialMember && user?.name) {
      initialMember = user.name.trim();
    }

    setResolvedMemberName(initialMember || 'Business Consultant');
    setScheduledDate(lead.next_followup_date || '');
    setScheduledTime(lead.next_followup_time || '');

    // 3. Fetch latest full details from DB to guarantee 100% accuracy
    if (lead.id) {
      api.leads.getById(lead.id)
        .then((res: any) => {
          if (res?.lead) {
            const fetchedBiz = (res.lead.business_name || res.lead.internal_business_name || '').trim();
            const fetchedMember = (res.lead.assigned_consultant_name || '').trim();

            if (fetchedBiz || res.lead.internal_business_id) {
              const fetchedKey = normalizeBusinessKey(fetchedBiz || res.lead.internal_business_id);
              setResolvedBusinessName(getBusinessDisplayName(fetchedKey));
            }

            if (fetchedMember) {
              setResolvedMemberName(fetchedMember);
            }

            if (res.lead.next_followup_date) {
              setScheduledDate(res.lead.next_followup_date);
            }
            if (res.lead.next_followup_time) {
              setScheduledTime(res.lead.next_followup_time);
            }

            if (!res.lead.next_followup_date && res.follow_ups && res.follow_ups.length > 0) {
              const latest = res.follow_ups[0];
              if (latest?.followup_date) setScheduledDate(latest.followup_date);
              if (latest?.followup_time) setScheduledTime(latest.followup_time);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, lead?.id, lead?.business_name, lead?.internal_business_id, lead?.assigned_consultant_name, businesses.length]);

  if (!lead) return null;

  const rawMobile = String(lead.mobile || lead.alternate_mobile || '');
  const digits = rawMobile.replace(/[^0-9]/g, '');
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;

  // Resolve business key and official business name
  const currentBusinessKey: BusinessKey = normalizeBusinessKey({
    name: resolvedBusinessName,
    id: businesses.find((b) => b.name.toLowerCase() === resolvedBusinessName.toLowerCase())?.id || lead.internal_business_id,
  });

  const activeBusinessDisplayName = getBusinessDisplayName(currentBusinessKey);

  const clientName = lead.contact_person?.trim() || lead.company_name?.trim() || 'Sir/Madam';
  const leadName = clientName;
  const consultantName = resolvedMemberName?.trim() || user?.name?.trim() || 'Business Consultant';
  const companyName = lead.company_name?.trim() || 'your company';

  // Generate business-specific templates via centralized service
  const templates = getBusinessTemplates(currentBusinessKey, {
    clientName,
    consultantName,
    companyName,
    scheduledDate,
    scheduledTime,
    businessName: activeBusinessDisplayName,
  });

  const activeTemplateDef = templates[template] || templates['intro'];
  const messageToSend = customMessage !== '' ? customMessage : (activeTemplateDef?.text || '');

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
          </div>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition whitespace-nowrap cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            OPEN WHATSAPP
          </button>
        </div>

        {/* Dynamic Business & Consultant Greeting Selector */}
        <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="w-full sm:w-1/2">
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
              <Building2 className="w-3 h-3 text-indigo-600" />
              Greeting as Business:
            </label>
            <select
              value={activeBusinessDisplayName}
              onChange={(e) => {
                setResolvedBusinessName(e.target.value);
                setCustomMessage(''); // Regenerates template with new business name
              }}
              className="w-full text-xs font-bold text-indigo-950 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
            >
              {Array.from(
                new Set(
                  businesses.length > 0
                    ? businesses.map((b) => getBusinessDisplayName(normalizeBusinessKey(b)))
                    : ['FynTrust', 'DiziBrand Media', 'Strategic HR', 'No Brokerage']
                )
              ).map((officialName) => (
                <option key={officialName} value={officialName}>
                  {officialName}
                </option>
              ))}
              {!businesses.some((b) => getBusinessDisplayName(normalizeBusinessKey(b)) === activeBusinessDisplayName) && (
                <option value={activeBusinessDisplayName}>{activeBusinessDisplayName}</option>
              )}
            </select>
          </div>

          <div className="w-full sm:w-1/2">
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-900 mb-1">
              <UserCheck className="w-3 h-3 text-teal-600" />
              Sender / Consultant Name:
            </label>
            <input
              type="text"
              value={resolvedMemberName}
              onChange={(e) => {
                setResolvedMemberName(e.target.value);
                setCustomMessage(''); // Regenerates template with new consultant name
              }}
              placeholder="e.g. Jyoti"
              className="w-full text-xs font-bold text-slate-900 bg-white border border-teal-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
          </div>
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
                className={`p-2 text-xs font-semibold rounded-xl border text-left transition cursor-pointer ${
                  template === key && !customMessage
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-sm ring-1 ring-indigo-500'
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Live Preview (Greeting as <span className="text-indigo-700 font-extrabold">{consultantName}</span> from <span className="text-indigo-700 font-extrabold">{activeBusinessDisplayName}</span>)
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
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-normal leading-relaxed shadow-inner"
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
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

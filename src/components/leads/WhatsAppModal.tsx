import React, { useState } from 'react';
import { Lead, WhatsAppOutcome } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { MessageCircle, Send, Copy, ExternalLink } from 'lucide-react';

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
  const [template, setTemplate] = useState('intro');
  const [customMessage, setCustomMessage] = useState('');
  const [outcome, setOutcome] = useState<WhatsAppOutcome>('SENT');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const rawMobile = String(lead.mobile || lead.alternate_mobile || '');
  const digits = rawMobile.replace(/[^0-9]/g, '');
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;

  const templates: Record<string, { title: string; text: string }> = {
    intro: {
      title: 'Introduction & Value Proposition',
      text: `Hello ${lead.contact_person || 'Director'}, this is ${lead.assigned_consultant_name || 'your consultant'} from Dizibrand.\n\nWe noticed ${lead.company_name} is scaling rapidly. We specialize in digital marketing, compliance, and growth consulting designed for enterprises in your industry.\n\nWould you be open for a brief 10-minute discovery call this week?`,
    },
    pitch_deck: {
      title: 'Share Company Portfolio Deck',
      text: `Hi ${lead.contact_person || 'Director'}, thank you for your time on our recent call. As discussed, I am sharing our corporate portfolio and case studies for ${lead.company_name}.\n\nPlease let me know a suitable time to discuss the tailored proposal.`,
    },
    follow_up: {
      title: 'Follow-up on Proposal / Discussion',
      text: `Hi ${lead.contact_person || 'Director'}, hope you are doing well!\n\nJust following up regarding our previous discussion for ${lead.company_name}. Did you get a chance to review the details we shared? Looking forward to your thoughts.`,
    },
    meeting_confirm: {
      title: 'Discovery Meeting Confirmation',
      text: `Hi ${lead.contact_person || 'Director'}, confirming our scheduled discovery meeting with our leadership team for ${lead.next_followup_date || 'tomorrow'}.\n\nPlease let me know if you need to adjust the timing.`,
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
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{lead.company_name}</h4>
            <p className="text-xs text-slate-600">
              {lead.contact_person} • <span className="font-mono font-bold text-slate-900">{lead.mobile}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition"
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
          <div className="grid grid-cols-2 gap-2">
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
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900'
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
              Message Content Preview
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
            >
              <Copy className="w-3 h-3" />
              Copy text
            </button>
          </div>
          <textarea
            value={messageToSend}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
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
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Logging...' : 'Save WhatsApp Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

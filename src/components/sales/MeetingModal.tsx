import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { toast } from 'sonner';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  companyName: string;
  onSuccess: () => void;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({
  isOpen,
  onClose,
  leadId,
  companyName,
  onSuccess,
}) => {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [title, setTitle] = useState(`Discovery Meeting with ${companyName}`);
  const [meetingDate, setMeetingDate] = useState(tomorrowStr);
  const [meetingTime, setMeetingTime] = useState('14:00');
  const [meetingType, setMeetingType] = useState<'ONLINE_VIDEO' | 'PHONE' | 'IN_PERSON' | 'CLIENT_OFFICE'>('ONLINE_VIDEO');
  const [participants, setParticipants] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.sales.createMeeting({
        lead_id: leadId,
        title: title.trim(),
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        meeting_type: meetingType,
        participants: participants.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success('Meeting scheduled successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Discovery / Closing Meeting" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Meeting Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Time *</label>
            <input
              type="time"
              required
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Meeting Type</label>
          <select
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ONLINE_VIDEO">📹 Online Video Call (Google Meet / Zoom)</option>
            <option value="PHONE">📞 Phone Conference</option>
            <option value="IN_PERSON">🏢 In-Person (Our Office)</option>
            <option value="CLIENT_OFFICE">🚗 Client Office Visit</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Participants / Attendees</label>
          <input
            type="text"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="e.g. Managing Director, Tech Lead, Super Admin"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Agenda & Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Key talking points, presentation deck link, questions..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Scheduling...' : 'Confirm Meeting'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

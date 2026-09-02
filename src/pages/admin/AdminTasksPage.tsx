import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Task, User, Priority } from '../../types';
import { PriorityBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import {
  CheckSquare, Plus, Target, Clock, UserCheck,
  Calendar, CheckCircle2, Pause, Play, X
} from 'lucide-react';

export const AdminTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [consultants, setConsultants] = useState<User[]>([]);
  const [selectedConsultantFilter, setSelectedConsultantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Task Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [consultantId, setConsultantId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [callTarget, setCallTarget] = useState(30);
  const [whatsappTarget, setWhatsappTarget] = useState(25);
  const [leadTarget, setLeadTarget] = useState(60);
  const [followupTarget, setFollowupTarget] = useState(20);
  const [potentialTarget, setPotentialTarget] = useState(5);
  const [meetingTarget, setMeetingTarget] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.tasks.list({
          consultant_id: selectedConsultantFilter ? Number(selectedConsultantFilter) : undefined,
          status: statusFilter || undefined,
        }),
        api.consultants.list(),
      ]);
      setTasks(tRes.tasks || []);
      const activeCons = (cRes.consultants || []).filter(
        (c) => c.role === 'CONSULTANT' || Number(c.is_active) === 1
      );
      setConsultants(activeCons);
      if (activeCons.length > 0 && !consultantId) {
        setConsultantId(String(activeCons[0].id));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedConsultantFilter, statusFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !consultantId || !startDate || !dueDate) {
      toast.error('Title, Consultant, Start Date, and Due Date are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.tasks.create({
        title: title.trim(),
        description: description.trim() || undefined,
        consultant_id: Number(consultantId),
        priority,
        start_date: startDate,
        due_date: dueDate,
        call_target: Number(callTarget),
        whatsapp_target: Number(whatsappTarget),
        lead_target: Number(leadTarget),
        followup_target: Number(followupTarget),
        potential_target: Number(potentialTarget),
        meeting_target: Number(meetingTarget),
      });

      toast.success('Task and daily productivity targets assigned!');
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, status: string) => {
    try {
      await api.tasks.update(taskId, { status: status as any });
      toast.success(`Task status updated to ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Targets & Tasks Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure individual Consultant productivity quotas (Calling, WhatsApp, Follow-ups, Handovers) and sprint tasks.
          </p>
        </div>

        <button
          onClick={() => {
            if (consultants.length > 0 && !consultantId) {
              setConsultantId(String(consultants[0].id));
            }
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Assign Target & Task
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-xs">
        <select
          value={selectedConsultantFilter}
          onChange={(e) => setSelectedConsultantFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
        >
          <option value="">All Consultants</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <LoadingSpinner text="Fetching consultant tasks..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8 text-indigo-500" />}
          title="No Tasks Found"
          description="Create customized tasks and daily quotas for your business consultants."
          action={
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
            >
              Create New Task
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-indigo-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    {task.consultant_name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={task.priority} />
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                      task.status === 'IN_PROGRESS' ? 'bg-indigo-500/20 text-indigo-300' :
                      task.status === 'PAUSED' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-white mt-1">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                )}

                {/* Quotas Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center text-xs">
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Call Target</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block">{task.call_target || 0}/day</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">WhatsApp</span>
                    <span className="font-bold text-teal-400 mt-0.5 block">{task.whatsapp_target || 0}/day</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Leads to Work</span>
                    <span className="font-bold text-indigo-400 mt-0.5 block">{task.lead_target || 0}/day</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Start: {task.start_date}</span>
                  <span className="font-bold text-rose-400">Deadline: {task.due_date}</span>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-800">
                {task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-lg transition"
                  >
                    Mark Done
                  </button>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'PAUSED')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg transition"
                  >
                    Pause
                  </button>
                )}
                {task.status === 'PAUSED' && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 text-white rounded-lg transition"
                  >
                    Resume
                  </button>
                )}
                {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'CANCELLED')}
                    className="px-2.5 py-1 text-[11px] text-rose-400 hover:bg-rose-950 rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Assign Target & Task to Consultant" maxWidth="max-w-lg">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MCA Karnataka Q3 IT Campaign Calling Sprint"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Assigned Consultant *</label>
            <select
              required
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
            >
              {consultants.length === 0 ? (
                <option value="">No active consultants found</option>
              ) : (
                consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Daily Quotas Configuration (PRD Section 4) */}
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
            <span className="text-xs font-extrabold text-indigo-900 block">Configure Daily Quotas (Target Settings)</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Daily Call Target</label>
                <input
                  type="number"
                  min="0"
                  value={callTarget}
                  onChange={(e) => setCallTarget(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Daily WhatsApp</label>
                <input
                  type="number"
                  min="0"
                  value={whatsappTarget}
                  onChange={(e) => setWhatsappTarget(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Leads to Work</label>
                <input
                  type="number"
                  min="0"
                  value={leadTarget}
                  onChange={(e) => setLeadTarget(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Follow-ups</label>
                <input
                  type="number"
                  min="0"
                  value={followupTarget}
                  onChange={(e) => setFollowupTarget(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Potential Target</label>
                <input
                  type="number"
                  min="0"
                  value={potentialTarget}
                  onChange={(e) => setPotentialTarget(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Meeting Target</label>
                <input
                  type="number"
                  min="0"
                  value={meetingTarget}
                  onChange={(e) => setMeetingTarget(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-bold text-center"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="HOT">🔥 Hot</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Instructions and goals for the consultant..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Target & Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

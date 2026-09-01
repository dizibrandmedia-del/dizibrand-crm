import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Task } from '../../types';
import { PriorityBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import { Target, CheckCircle2, Calendar, Clock, CheckSquare } from 'lucide-react';

export const ConsultantTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.tasks.list();
      setTasks(res.tasks);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleComplete = async (taskId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await api.tasks.update(taskId, { status: nextStatus as any });
      toast.success(`Task marked as ${nextStatus}!`);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task status');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          My Targets & Assigned Tasks
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Daily quotas and priorities assigned by leadership
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Fetching your assigned tasks and target quotas..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8 text-indigo-500" />}
          title="No Special Tasks Assigned"
          description="Focus on your standard daily calling and follow-up queues!"
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';

            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 rounded-2xl border transition shadow-lg ${
                  isDone ? 'bg-slate-950/60 border-slate-800/80 opacity-70' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    <h3 className={`text-base font-extrabold text-white mt-1 ${isDone ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-slate-300 leading-relaxed">{task.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleComplete(task.id, task.status)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 ${
                      isDone
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isDone ? 'Reopen' : 'Mark Completed'}
                  </button>
                </div>

                {/* Quotas */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center text-xs">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Daily Calls</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block">{task.call_target || 0} / day</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">WhatsApp</span>
                    <span className="font-bold text-teal-400 mt-0.5 block">{task.whatsapp_target || 0} / day</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Leads to Work</span>
                    <span className="font-bold text-indigo-400 mt-0.5 block">{task.lead_target || 0} / day</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Start: {task.start_date}</span>
                  <span className="font-bold text-rose-400">Due: {task.due_date}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

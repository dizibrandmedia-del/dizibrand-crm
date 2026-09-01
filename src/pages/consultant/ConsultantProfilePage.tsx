import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { toast } from 'sonner';
import {
  User, Lock, ShieldCheck, PhoneCall, MessageCircle,
  Calendar, Sparkles, CheckCircle2, Award
} from 'lucide-react';

export const ConsultantProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    api.analytics.consultantDashboard()
      .then((data) => setDashboardData(data))
      .catch((err) => console.error(err));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const metrics = dashboardData?.todayMetrics || {};
  const targets = dashboardData?.targets || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-6">
      {/* User Info Card */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/30">
          {user?.name?.charAt(0) || 'C'}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl font-black text-white">{user?.name}</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Business Consultant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{user?.email} • Mobile: {user?.mobile || 'N/A'}</p>
        </div>
      </div>

      {/* Career Productivity & Attribution Metrics */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          My Pipeline & Productivity Summary
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <PhoneCall className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400">Calls Logged Today</span>
            <span className="text-xl font-black text-white block mt-0.5">{metrics.today_calls || 0}</span>
            <span className="text-[10px] text-slate-500 font-mono">Target: {targets.daily_call_target || 20}</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <MessageCircle className="w-5 h-5 text-teal-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400">WhatsApp Today</span>
            <span className="text-xl font-black text-white block mt-0.5">{metrics.today_whatsapp || 0}</span>
            <span className="text-[10px] text-slate-500 font-mono">Target: {targets.daily_whatsapp_target || 20}</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400">Follow-ups Today</span>
            <span className="text-xl font-black text-white block mt-0.5">{metrics.today_followups || 0}</span>
            <span className="text-[10px] text-slate-500 font-mono">Completed</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <Sparkles className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400">Total Potential Leads</span>
            <span className="text-xl font-black text-amber-400 block mt-0.5">{metrics.potential_handovers || 0}</span>
            <span className="text-[10px] text-slate-500 font-mono">Handed Over</span>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" />
          Security & Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {isChangingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

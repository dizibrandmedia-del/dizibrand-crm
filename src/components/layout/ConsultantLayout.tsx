import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  LayoutDashboard, Users, Calendar, CheckSquare, Sparkles,
  User, Bell, LogOut, Phone, MessageSquare
} from 'lucide-react';

export const ConsultantLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  const navTabs = [
    { label: 'Dashboard', path: '/consultant/dashboard', icon: LayoutDashboard },
    { label: 'My Leads', path: '/consultant/leads', icon: Users },
    { label: 'Follow-ups', path: '/consultant/followups', icon: Calendar },
    { label: 'Tasks', path: '/consultant/tasks', icon: CheckSquare },
    { label: 'Potential', path: '/consultant/potential', icon: Sparkles },
    { label: 'Profile', path: '/consultant/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased pb-20 sm:pb-0">
      {/* Top Mobile-Friendly Header */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm">
            D
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-white">
              DIZIBRAND <span className="text-indigo-400 font-medium">CRM</span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Consultant: <span className="text-slate-200 font-semibold">{user?.name}</span>
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 text-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">
                    Notifications ({unreadCount})
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-indigo-400"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <div className="mt-2 max-h-60 overflow-y-auto space-y-1.5">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-3">No notifications</p>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link_url) navigate(n.link_url);
                          setNotifOpen(false);
                        }}
                        className={`p-2 rounded-xl text-xs cursor-pointer ${
                          n.is_read ? 'bg-slate-800/30 text-slate-400' : 'bg-slate-800 text-white font-medium border border-indigo-500/20'
                        }`}
                      >
                        <p className="font-semibold text-slate-200 text-[11px]">{n.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Top Navbar if on large screen */}
      <div className="hidden sm:block bg-white border-b border-slate-200 px-6 py-2 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="text-xs text-slate-500 font-medium">
            Daily Calling Target: <span className="text-indigo-600 font-bold">{user?.daily_call_target || 20} calls</span>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        <Outlet />
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 px-2 py-1 flex items-center justify-around shadow-lg">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

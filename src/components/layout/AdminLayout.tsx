import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useNotifications } from '../../context/NotificationContext.js';
import {
  LayoutDashboard, Users, UserCheck, UploadCloud, CheckSquare,
  Calendar, Award, BarChart3, Building2, Layers, ShieldCheck,
  Settings, Bell, LogOut, Menu, X, Sparkles, ChevronRight,
  TrendingUp, PhoneCall, MessageCircle, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle.js';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const navItems = [
    { label: 'Executive Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Leads Database', path: '/admin/leads', icon: Users },
    { label: 'Live Google Sheets', path: '/admin/google-sheets', icon: FileSpreadsheet, badge: 'Auto' },
    { label: 'Import MCA / Excel', path: '/admin/import', icon: UploadCloud },
    { label: 'Potential Leads', path: '/admin/potential-leads', icon: Sparkles, badge: 'Takeover' },
    { label: 'Follow-ups Queue', path: '/admin/followups', icon: Calendar },
    { label: 'Targets & Tasks', path: '/admin/tasks', icon: CheckSquare },
    { label: 'Sales & Closing Deals', path: '/admin/sales', icon: Award },
    { label: 'Analytics & ROI', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Consultant Team', path: '/admin/team', icon: UserCheck },
    { label: 'Internal Businesses', path: '/admin/businesses', icon: Building2 },
    { label: 'Lead Sources', path: '/admin/sources', icon: Layers },
    { label: 'Audit Trail', path: '/admin/audit-logs', icon: ShieldCheck },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d32f2f] to-[#ed1a3b] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#ed1a3b]/25">
              D
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block leading-none">
                DIZIBRAND <span className="text-[#ed1a3b] font-semibold">CRM</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest block mt-0.5">
                Super Admin
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#ed1a3b] text-white shadow-lg shadow-[#ed1a3b]/25 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Account / Signout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#ed1a3b]/10 border border-[#ed1a3b]/30 text-[#ed1a3b] flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || 'SA'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
              <span className="text-slate-900 dark:text-white capitalize font-semibold">
                {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick Multi-Business Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5 text-[#ed1a3b]" />
              <span>4 Businesses Active</span>
            </div>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ed1a3b] rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Notifications
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#ed1a3b]/10 text-[#ed1a3b] border border-[#ed1a3b]/30">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-[11px] text-[#ed1a3b] hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No notifications right now
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.link_url) {
                              navigate(n.link_url);
                              setNotifOpen(false);
                            }
                          }}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-start gap-3 ${
                            !n.is_read ? 'bg-[#ed1a3b]/5 dark:bg-[#ed1a3b]/10' : ''
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              !n.is_read ? 'bg-[#ed1a3b]' : 'bg-transparent'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{n.title}</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useNotifications } from '../../context/NotificationContext.js';
import {
  LayoutDashboard, Users, UserCheck, UploadCloud, CheckSquare,
  Calendar, Award, BarChart3, Building2, Layers, ShieldCheck,
  Settings, Bell, LogOut, Menu, X, Sparkles, ChevronRight,
  Search, Plus, CheckCircle2, ChevronDown, FileSpreadsheet, Command
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [businessUnit, setBusinessUnit] = useState('All Business Units');
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Leads Pipeline', path: '/admin/leads', icon: Users },
        { label: 'Live Google Sheets', path: '/admin/google-sheets', icon: FileSpreadsheet, badge: 'Live' },
        { label: 'Import MCA / Excel', path: '/admin/import', icon: UploadCloud },
        { label: 'Potential Leads', path: '/admin/potential-leads', icon: Sparkles, badge: 'Hot' },
        { label: 'Follow-ups Queue', path: '/admin/followups', icon: Calendar },
      ],
    },
    {
      title: 'DATA & FEEDS',
      items: [
        { label: 'Targets & Tasks', path: '/admin/tasks', icon: CheckSquare },
        { label: 'Sales & Closing', path: '/admin/sales', icon: Award },
        { label: 'Analytics & Attribution', path: '/admin/analytics', icon: BarChart3 },
        { label: 'Internal Businesses', path: '/admin/businesses', icon: Building2 },
        { label: 'Lead Sources', path: '/admin/sources', icon: Layers },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { label: 'Consultant Team', path: '/admin/team', icon: UserCheck },
        { label: 'Consultant Panel', path: '/consultant/dashboard', icon: Sparkles, badge: 'Live' },
        { label: 'Audit Trail', path: '/admin/audit-logs', icon: ShieldCheck },
        { label: 'Engine Settings', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const businessUnits = [
    'All Business Units',
    'Dizibrand MCA Syndicate',
    'Strategic HR',
    'Fyntrust Capital',
    'No Brokerage Commercial',
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col md:flex-row text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#10131A] border-r border-[#232D42] flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#232D42] bg-[#10131A]">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3B5BFF] via-[#8B5CF6] to-[#06D0C6] flex items-center justify-center text-white font-sora font-black text-sm shadow-md shadow-blue-500/20">
              D
            </div>
            <div>
              <span className="font-sora font-bold text-sm tracking-tight text-white block leading-none">
                DIZIBRAND <span className="text-[#3B5BFF]">MCA</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider block mt-1 uppercase">
                Global Syndicate Engine
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-3 border-b border-[#232D42]/60">
          <button
            onClick={() => navigate('/admin/leads?create=true')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#3B5BFF]/10 hover:bg-[#3B5BFF]/20 border border-[#3B5BFF]/30 text-blue-400 hover:text-blue-300 text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Qualify Lead</span>
          </button>
        </div>

        {/* Nav Links Grouped by Section */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                {section.title}
              </span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#3B5BFF] text-white font-semibold shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#151A25]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Account / Underwriter Footer */}
        <div className="p-3.5 border-t border-[#232D42] bg-[#10131A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3B5BFF]/30 to-[#8B5CF6]/30 border border-[#3B5BFF]/40 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AM'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#10131A]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Alex Mercer'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.role === 'SUPER_ADMIN' ? 'Director Underwriting' : (user?.role || 'Underwriting Lead')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Shell Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[#232D42] bg-[#10131A] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#151A25]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Business Unit Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151A25] border border-[#232D42] hover:border-slate-600 text-xs font-medium text-slate-200 transition"
              >
                <Building2 className="w-3.5 h-3.5 text-[#3B5BFF]" />
                <span className="hidden sm:inline">{businessUnit}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {businessDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-[#151A25] border border-[#232D42] rounded-xl shadow-xl z-50 py-1">
                  {businessUnits.map((bu) => (
                    <button
                      key={bu}
                      onClick={() => {
                        setBusinessUnit(bu);
                        setBusinessDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition ${
                        businessUnit === bu
                          ? 'bg-[#3B5BFF]/15 text-[#3B5BFF] font-semibold'
                          : 'text-slate-300 hover:bg-[#1A2232]'
                      }`}
                    >
                      {bu}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center Search Input with ⌘K Badge */}
          <div className="flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company, CIN, phone, or consultant..."
                className="w-full bg-[#151A25] border border-[#232D42] focus:border-[#3B5BFF] rounded-lg pl-9 pr-14 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden transition"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#10131A] border border-[#232D42] text-[10px] text-slate-400 font-mono">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </form>
          </div>

          {/* Right Controls: Sync active, Notifications, + New Lead CTA */}
          <div className="flex items-center gap-3">
            {/* Live Sync Pulse Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Sync active • 2m ago</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#151A25] transition"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-[#10131A]" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#151A25] border border-[#232D42] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3.5 border-b border-[#232D42] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Notifications
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-[11px] text-[#3B5BFF] hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#232D42]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
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
                          className={`p-3 hover:bg-[#1A2232] transition cursor-pointer flex items-start gap-2.5 ${
                            !n.is_read ? 'bg-blue-950/20' : ''
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              !n.is_read ? 'bg-[#3B5BFF]' : 'bg-transparent'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white leading-snug">{n.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-slate-400 mt-1 block font-mono">
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

            {/* Stitch Primary CTA Button */}
            <button
              onClick={() => navigate('/admin/leads?create=true')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3B5BFF] hover:bg-blue-600 text-white font-sora font-semibold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Lead</span>
            </button>
          </div>
        </header>

        {/* View Outlet with Dark Bedrock */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0B0E14]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

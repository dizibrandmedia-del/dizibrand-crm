import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { ThemeProvider, useTheme } from './context/ThemeContext.js';
import { Toaster } from 'sonner';

// Layouts
import { AdminLayout } from './components/layout/AdminLayout.js';
import { ConsultantLayout } from './components/layout/ConsultantLayout.js';

// Auth Page
import { LoginPage } from './pages/LoginPage.js';

// Super Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { AdminLeadsPage } from './pages/admin/AdminLeadsPage.js';
import { MCAImportPage } from './pages/admin/MCAImportPage.js';
import GoogleSheetSyncPage from './pages/admin/GoogleSheetSyncPage.js';
import { AdminPotentialLeadsPage } from './pages/admin/AdminPotentialLeadsPage.js';
import { AdminFollowupsPage } from './pages/admin/AdminFollowupsPage.js';
import { AdminTasksPage } from './pages/admin/AdminTasksPage.js';
import { AdminSalesPage } from './pages/admin/AdminSalesPage.js';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage.js';
import { AdminTeamPage } from './pages/admin/AdminTeamPage.js';
import { AdminBusinessesPage } from './pages/admin/AdminBusinessesPage.js';
import { AdminSourcesPage } from './pages/admin/AdminSourcesPage.js';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage.js';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.js';

// Consultant Pages
import { ConsultantDashboardPage } from './pages/consultant/ConsultantDashboardPage.js';
import { ConsultantLeadsPage } from './pages/consultant/ConsultantLeadsPage.js';
import { ConsultantFollowupsPage } from './pages/consultant/ConsultantFollowupsPage.js';
import { ConsultantTasksPage } from './pages/consultant/ConsultantTasksPage.js';
import { ConsultantPotentialPage } from './pages/consultant/ConsultantPotentialPage.js';
import { ConsultantProfilePage } from './pages/consultant/ConsultantProfilePage.js';

// Route Guards
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/consultant/dashboard" replace />;
  }

  return <>{children}</>;
};

const RequireConsultant: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/consultant/dashboard" replace />;
};

const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" theme={theme} />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ThemedToaster />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<RootRedirect />} />

              {/* Super Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="leads" element={<AdminLeadsPage />} />
                <Route path="google-sheets" element={<GoogleSheetSyncPage />} />
                <Route path="import" element={<MCAImportPage />} />
                <Route path="potential-leads" element={<AdminPotentialLeadsPage />} />
                <Route path="potential" element={<AdminPotentialLeadsPage />} />
                <Route path="followups" element={<AdminFollowupsPage />} />
                <Route path="tasks" element={<AdminTasksPage />} />
                <Route path="sales" element={<AdminSalesPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="team" element={<AdminTeamPage />} />
                <Route path="businesses" element={<AdminBusinessesPage />} />
                <Route path="sources" element={<AdminSourcesPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Business Consultant Protected Routes */}
              <Route
                path="/consultant"
                element={
                  <RequireConsultant>
                    <ConsultantLayout />
                  </RequireConsultant>
                }
              >
                <Route index element={<Navigate to="/consultant/dashboard" replace />} />
                <Route path="dashboard" element={<ConsultantDashboardPage />} />
                <Route path="leads" element={<ConsultantLeadsPage />} />
                <Route path="followups" element={<ConsultantFollowupsPage />} />
                <Route path="tasks" element={<ConsultantTasksPage />} />
                <Route path="potential" element={<ConsultantPotentialPage />} />
                <Route path="profile" element={<ConsultantProfilePage />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

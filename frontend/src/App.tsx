import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { LeadsPage } from './pages/Leads/LeadsPage';
import { LeadDetailPage } from './pages/Leads/LeadDetailPage';
import { ICPsPage } from './pages/ICPs/ICPsPage';
import { ConversationsPage } from './pages/Conversations/ConversationsPage';
import { SequencesPage } from './pages/Sequences/SequencesPage';
import { CalendarPage } from './pages/Calendar/CalendarPage';
import { IntegrationsPage } from './pages/Integrations/IntegrationsPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { AuditPage } from './pages/Audit/AuditPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { SetupWizardPage } from './pages/Setup/SetupWizardPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Application Layout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/icps" element={<ICPsPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/sequences" element={<SequencesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/setup" element={<SetupWizardPage />} />
            <Route path="/onboarding" element={<SetupWizardPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

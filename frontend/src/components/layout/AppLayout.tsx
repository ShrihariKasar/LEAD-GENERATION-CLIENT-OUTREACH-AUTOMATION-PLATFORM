import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ToastProvider } from '../common/Toast';
import { AIHelpWidget } from '../common/AIHelpWidget';

export const AppLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-slate-700">Connecting to Threadline operations...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
        {/* Floating Operational AI Assistant */}
        <AIHelpWidget />
      </div>
    </ToastProvider>
  );
};

export default AppLayout;

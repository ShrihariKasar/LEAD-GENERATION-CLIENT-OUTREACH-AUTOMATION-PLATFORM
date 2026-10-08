import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Target, MessageSquare,
  Workflow, Calendar, Link2, BarChart2, ShieldAlert, Settings, Wrench, Plus
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/leads', label: 'Lead Pool', icon: Users },
  { to: '/icps', label: 'ICP Profiles', icon: Target },
  { to: '/conversations', label: 'Inbox & Triage', icon: MessageSquare },
  { to: '/sequences', label: 'Sequences', icon: Workflow },
  { to: '/calendar', label: 'Meetings', icon: Calendar },
  { to: '/integrations', label: 'Integrations', icon: Link2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/audit', label: 'Audit & AI Logs', icon: ShieldAlert },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100">
        <Link to="/" className="flex items-center group">
          <BrandLogo size={36} />
        </Link>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 py-4">
        <Link
          to="/leads"
          className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Discover Leads</span>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Platform Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 text-slate-500" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Operational Footer / Setup Wizard Badge */}
      <div className="p-4 border-t border-slate-100">
        <NavLink
          to="/setup"
          className="block bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg p-3 transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Pipeline Active</span>
            </div>
            <Wrench className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Setup Wizard • 7 Adapters</p>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;

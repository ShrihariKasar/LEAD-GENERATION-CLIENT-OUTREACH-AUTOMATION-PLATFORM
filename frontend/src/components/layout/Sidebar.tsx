import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Target, MessageSquare,
  Workflow, Calendar, Link2, BarChart2, ShieldAlert, Settings, Wrench
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/leads', label: 'Lead Pool', icon: Users },
  { to: '/icps', label: 'ICP Profiles', icon: Target },
  { to: '/conversations', label: 'Inbox', icon: MessageSquare },
  { to: '/sequences', label: 'Sequences', icon: Workflow },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/integrations', label: 'Integrations', icon: Link2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/audit', label: 'Audit & AI Logs', icon: ShieldAlert },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-56 bg-[#090d16] border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 flex-shrink-0">
      <div>
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center border-b border-slate-800/80">
          <BrandLogo size={24} />
        </div>

        {/* Navigation Items */}
        <nav className="p-2.5 space-y-0.5">
          <div className="px-2 py-1.5 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
            Operations
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-800/90 text-emerald-400 border border-slate-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Setup Wizard Footer Card */}
      <div className="p-3 border-t border-slate-800/80">
        <NavLink
          to="/setup"
          className="flex items-center gap-2 px-3 py-2 bg-[#0f172a] hover:bg-slate-800 border border-slate-800 rounded-md text-xs text-slate-300 transition group"
        >
          <Wrench className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-semibold text-slate-200">Setup Wizard</span>
            <span className="text-[10px] text-slate-400 font-mono">Verify 7 Adapters</span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};

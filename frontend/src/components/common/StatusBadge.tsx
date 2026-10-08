import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'lead' | 'qualification' | 'outreach' | 'integration' | 'meeting' | 'conversation';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'lead', size = 'sm' }) => {
  const normalized = (status || 'UNKNOWN').toUpperCase();

  let bgClass = "bg-slate-800/80 text-slate-300 border-slate-700";
  let dotClass = "bg-slate-400";
  let label = status;

  // Qualification Status
  if (normalized === 'QUALIFIED') {
    bgClass = "bg-emerald-950/60 text-emerald-300 border-emerald-800/50";
    dotClass = "bg-emerald-400";
    label = "Qualified";
  } else if (normalized === 'POTENTIAL') {
    bgClass = "bg-sky-950/60 text-sky-300 border-sky-800/50";
    dotClass = "bg-sky-400";
    label = "Potential";
  } else if (normalized === 'NEEDS_HUMAN') {
    bgClass = "bg-amber-950/60 text-amber-300 border-amber-800/50";
    dotClass = "bg-amber-400 animate-pulse";
    label = "Needs Human";
  } else if (normalized === 'NOT_QUALIFIED') {
    bgClass = "bg-rose-950/40 text-rose-300 border-rose-900/40";
    dotClass = "bg-rose-400";
    label = "Not Qualified";
  } else if (normalized === 'UNQUALIFIED') {
    bgClass = "bg-slate-900 text-slate-400 border-slate-800";
    dotClass = "bg-slate-500";
    label = "Unqualified";
  }

  // CRM / Lead Status
  else if (normalized === 'MEETING_SCHEDULED') {
    bgClass = "bg-emerald-950/70 text-emerald-200 border-emerald-700/60";
    dotClass = "bg-emerald-400";
    label = "Meeting Scheduled";
  } else if (normalized === 'MEETING_PENDING') {
    bgClass = "bg-sky-950/60 text-sky-300 border-sky-800/50";
    dotClass = "bg-sky-400";
    label = "Meeting Pending";
  } else if (normalized === 'ENGAGED') {
    bgClass = "bg-indigo-950/60 text-indigo-300 border-indigo-800/50";
    dotClass = "bg-indigo-400";
    label = "Engaged";
  } else if (normalized === 'CONTACTED') {
    bgClass = "bg-blue-950/60 text-blue-300 border-blue-800/50";
    dotClass = "bg-blue-400";
    label = "Contacted";
  } else if (normalized === 'DO_NOT_CONTACT' || normalized === 'OPTED_OUT') {
    bgClass = "bg-rose-950/60 text-rose-300 border-rose-800/50";
    dotClass = "bg-rose-400";
    label = "Do Not Contact";
  } else if (normalized === 'NEW') {
    bgClass = "bg-slate-900 text-slate-300 border-slate-800";
    dotClass = "bg-slate-400";
    label = "New Lead";
  }

  // Integration Status
  else if (normalized === 'CONNECTED') {
    bgClass = "bg-emerald-950/60 text-emerald-300 border-emerald-800/50";
    dotClass = "bg-emerald-400";
    label = "Connected";
  } else if (normalized === 'RESTRICTED') {
    bgClass = "bg-amber-950/60 text-amber-300 border-amber-800/50";
    dotClass = "bg-amber-400";
    label = "Restricted Access";
  } else if (normalized === 'ERROR') {
    bgClass = "bg-rose-950/60 text-rose-300 border-rose-800/50";
    dotClass = "bg-rose-400";
    label = "Error";
  } else if (normalized === 'NOT_CONNECTED' || normalized === 'MISSING') {
    bgClass = "bg-slate-900 text-slate-400 border-slate-800";
    dotClass = "bg-slate-500";
    label = "Not Connected";
  }

  // Conversation Status
  else if (normalized === 'HUMAN_REVIEW') {
    bgClass = "bg-amber-950/70 text-amber-200 border-amber-700/60";
    dotClass = "bg-amber-400 animate-pulse";
    label = "Human Review";
  } else if (normalized === 'MEETING_INTENT') {
    bgClass = "bg-sky-950/70 text-sky-200 border-sky-700/60";
    dotClass = "bg-sky-400";
    label = "Meeting Intent";
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${padding} ${bgClass} font-mono tracking-tight`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
      <span>{label}</span>
    </span>
  );
};

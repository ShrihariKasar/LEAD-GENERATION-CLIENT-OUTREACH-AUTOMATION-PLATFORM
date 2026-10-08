import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'lead' | 'qualification' | 'outreach' | 'integration' | 'meeting' | 'conversation';
  size?: 'sm' | 'md';
}

interface BadgeStyle {
  bg: string;
  dot: string;
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const normalized = (status || 'UNKNOWN').toUpperCase().replace(/\s+/g, '_');

  let config: BadgeStyle = {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: status || 'Unknown',
  };

  // Qualification Statuses
  if (normalized === 'QUALIFIED') {
    config = { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Qualified' };
  } else if (normalized === 'POTENTIAL') {
    config = { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600', label: 'Potential' };
  } else if (normalized === 'NEEDS_HUMAN') {
    config = { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500 animate-pulse', label: 'Needs Human' };
  } else if (normalized === 'NOT_QUALIFIED' || normalized === 'UNQUALIFIED') {
    config = { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Not Qualified' };
  }

  // CRM / Lead Statuses
  else if (normalized === 'MEETING_SCHEDULED') {
    config = { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Meeting Scheduled' };
  } else if (normalized === 'MEETING_PENDING') {
    config = { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Meeting Pending' };
  } else if (normalized === 'ENGAGED') {
    config = { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600', label: 'Engaged' };
  } else if (normalized === 'CONTACTED') {
    config = { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Contacted' };
  } else if (normalized === 'DO_NOT_CONTACT' || normalized === 'OPTED_OUT') {
    config = { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Do Not Contact' };
  } else if (normalized === 'NEW') {
    config = { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500', label: 'New Lead' };
  }

  // Integrations
  else if (normalized === 'CONNECTED' || normalized === 'ACTIVE') {
    config = { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Connected' };
  } else if (normalized === 'RESTRICTED' || normalized === 'DEGRADED') {
    config = { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Restricted' };
  } else if (normalized === 'ERROR' || normalized === 'FAILED' || normalized === 'DISCONNECTED') {
    config = { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Error' };
  } else if (normalized === 'NOT_CONNECTED' || normalized === 'MISSING' || normalized === 'IDLE') {
    config = { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: 'Not Connected' };
  }

  // Conversation Status
  else if (normalized === 'HUMAN_REVIEW') {
    config = { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500 animate-pulse', label: 'Human Review' };
  } else if (normalized === 'MEETING_INTENT') {
    config = { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600', label: 'Meeting Intent' };
  } else if (normalized === 'REPLIED') {
    config = { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Replied' };
  }

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${config.bg} ${
        isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      <span className={`rounded-full shrink-0 ${config.dot} ${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;

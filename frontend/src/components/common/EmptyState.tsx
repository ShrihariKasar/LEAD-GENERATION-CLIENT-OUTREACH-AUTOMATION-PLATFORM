import React from 'react';
import { LucideIcon, Users, SearchX, AlertTriangle, Plus } from 'lucide-react';

interface EmptyStateProps {
  type?: 'no-data' | 'no-results' | 'error';
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionNode?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  icon,
  title,
  description,
  actionText,
  onAction,
  actionNode,
}) => {
  const defaults = {
    'no-data': {
      icon: Users,
      title: 'No records found',
      description: 'Get started by creating your first record or running discovery.',
      actionText: '+ Create New',
    },
    'no-results': {
      icon: SearchX,
      title: 'No matching results',
      description: 'Try adjusting your search criteria or resetting your active filters.',
      actionText: 'Reset Filters',
    },
    error: {
      icon: AlertTriangle,
      title: 'Unable to load data',
      description: 'An unexpected connection issue occurred. Please try again.',
      actionText: 'Retry',
    },
  };

  const current = defaults[type] || defaults['no-data'];
  const Icon = icon || current.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-6">
      <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1.5">{title || current.title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">{description || current.description}</p>

      {actionNode ? (
        <div className="flex items-center justify-center">{actionNode}</div>
      ) : onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          {type === 'no-data' && <Plus className="w-4 h-4" />}
          <span>{actionText || current.actionText}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;

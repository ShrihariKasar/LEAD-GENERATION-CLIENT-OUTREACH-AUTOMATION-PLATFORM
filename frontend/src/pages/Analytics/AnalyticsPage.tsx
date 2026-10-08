import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DashboardOverview } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import {
  BarChart2, TrendingUp, Users, Send, CheckCircle2,
  Calendar, ShieldCheck, Clock, Sparkles
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span>Aggregating operational analytics benchmarks...</span>
      </div>
    );
  }

  const isEmpty = !data || data.total_leads === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Revenue Operations Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Database-aggregated conversion funnels, response rates, and model safety metrics.
          </p>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          type="no-data"
          icon={BarChart2}
          title="No Analytics Data Yet"
          description="Zero prospects or messages recorded in the database yet. All metrics are calculated live from real production records."
        />
      ) : (
        <div className="space-y-6">
          {/* Top Conversion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5 hover:border-slate-300 transition">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Prospects</span>
              <div className="text-3xl font-bold text-slate-900 tabular-nums">{data.total_leads}</div>
              <div className="text-xs text-slate-500 font-medium">Across all ingestion sources</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5 hover:border-slate-300 transition">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Qualification Fit</span>
              <div className="text-3xl font-bold text-emerald-700 tabular-nums">{data.qualification_rate}%</div>
              <div className="text-xs text-slate-500 font-medium">Deterministic + AI evaluated</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5 hover:border-slate-300 transition">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reply Conversion</span>
              <div className="text-3xl font-bold text-blue-700 tabular-nums">{data.response_rate}%</div>
              <div className="text-xs text-slate-500 font-medium">{data.responses_received_count} total replies received</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5 hover:border-slate-300 transition">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meeting Conversion</span>
              <div className="text-3xl font-bold text-indigo-700 tabular-nums">{data.meeting_conversion_rate}%</div>
              <div className="text-xs text-slate-500 font-medium">First signal to booked call</div>
            </div>
          </div>

          {/* AI Intelligence Health */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Decisioning & Model Safety Metrics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated precision, intent classification certainty, and human intervention thresholds
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">AI Dialogue Turns</span>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">{data.ai_conversations_count}</div>
                <div className="text-xs text-slate-500 font-medium">Grounded turns executed</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Avg Model Confidence</span>
                <div className="text-2xl font-bold text-emerald-700 tabular-nums">{Math.round(data.average_ai_confidence * 100)}%</div>
                <div className="text-xs text-slate-500 font-medium">Intent & qualification certainty</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Human Handoffs</span>
                <div className="text-2xl font-bold text-amber-700 tabular-nums">{data.human_handoff_count}</div>
                <div className="text-xs text-slate-500 font-medium">Cases triaged to human oversight</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;

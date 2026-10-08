import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DashboardOverview } from '../../types';
import {
  BarChart2, TrendingUp, Users, Send, CheckCircle2,
  Calendar, ShieldCheck, Clock
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
      <div className="p-8 text-center text-xs text-slate-400 font-mono">
        Aggregating operational analytics...
      </div>
    );
  }

  const isEmpty = !data || data.total_leads === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Revenue Operations Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Database aggregated conversion benchmarks and channel response rates</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-10 text-center max-w-md mx-auto space-y-3 my-8">
          <BarChart2 className="w-8 h-8 text-slate-500 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-200">No Analytics Data Yet</h2>
          <p className="text-xs text-slate-400 font-mono">
            Zero prospects or messages recorded in the database. All metrics are calculated live from real records.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Conversion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">Total Prospects</span>
              <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">{data.total_leads}</div>
              <div className="text-[11px] text-slate-400 font-mono">Across all sources</div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">Qualification Fit</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">{data.qualification_rate}%</div>
              <div className="text-[11px] text-slate-400 font-mono">Deterministic + AI evaluated</div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">Reply Conversion</span>
              <div className="text-2xl font-bold font-mono text-sky-400 tabular-nums">{data.response_rate}%</div>
              <div className="text-[11px] text-slate-400 font-mono">{data.responses_received_count} total replies</div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">Meeting Conversion</span>
              <div className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">{data.meeting_conversion_rate}%</div>
              <div className="text-[11px] text-slate-400 font-mono">From first signal to booked call</div>
            </div>
          </div>

          {/* AI Intelligence Health */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
              AI Decisioning & Safety Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-[#090d16] border border-slate-800 rounded space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase">AI Dialogue Turns</span>
                <div className="text-xl font-bold font-mono text-slate-100">{data.ai_conversations_count}</div>
                <div className="text-[11px] text-slate-400 font-mono">Grounded turns executed</div>
              </div>

              <div className="p-3 bg-[#090d16] border border-slate-800 rounded space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Avg Model Confidence</span>
                <div className="text-xl font-bold font-mono text-emerald-400">{Math.round(data.average_ai_confidence * 100)}%</div>
                <div className="text-[11px] text-slate-400 font-mono">Intent & qualification certainty</div>
              </div>

              <div className="p-3 bg-[#090d16] border border-slate-800 rounded space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Human Handoffs</span>
                <div className="text-xl font-bold font-mono text-amber-400">{data.human_handoff_count}</div>
                <div className="text-[11px] text-slate-400 font-mono">Cases requiring human oversight</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

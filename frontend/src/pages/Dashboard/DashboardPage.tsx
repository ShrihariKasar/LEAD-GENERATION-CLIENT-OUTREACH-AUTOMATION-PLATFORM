import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DashboardOverview } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  AlertTriangle, Users, Calendar, ArrowRight, MessageSquare,
  Sparkles, CheckCircle2, ShieldAlert, Send, Plus, Upload, Link2
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
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
      <div className="p-8 text-center font-mono text-xs text-slate-400">
        Aggregating operational pipeline metrics from database...
      </div>
    );
  }

  const isCompletelyEmpty = !data || (data.total_leads === 0 && data.messages_sent_count === 0 && data.ai_conversations_count === 0);

  return (
    <div className="space-y-6">
      {/* Operations Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Operations Cockpit</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time pipeline health and required human interventions</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/leads"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Discover Leads
          </Link>
          <Link
            to="/integrations"
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 font-mono flex items-center gap-1.5 transition"
          >
            <Link2 className="w-3.5 h-3.5 text-slate-400" />
            Integrations
          </Link>
        </div>
      </div>

      {/* Empty State when zero database records */}
      {isCompletelyEmpty ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-10 text-center max-w-2xl mx-auto space-y-4 my-8">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-200">No leads in workspace yet</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your prospect pool is completely empty. Connect Apollo.io, import a CSV list, or create your first Ideal Customer Profile (ICP) to begin.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/leads"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Search Prospects
            </Link>
            <Link
              to="/icps"
              className="px-4 py-2 bg-[#090d16] hover:bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 font-mono transition"
            >
              Define Target ICP
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Attention Inbox Bar */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
                  Needs Attention Right Now
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {data.attention_items.length} actionable item{data.attention_items.length === 1 ? '' : 's'}
              </span>
            </div>

            {data.attention_items.length === 0 ? (
              <div className="py-3 text-xs text-slate-400 font-mono text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                All active conversations and automations operating normally. Zero human interventions required.
              </div>
            ) : (
              <div className="space-y-2">
                {data.attention_items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#090d16] border border-slate-800/80 rounded flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-slate-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.description}</div>
                    </div>

                    <button
                      onClick={() => navigate('/conversations')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-mono flex items-center gap-1 cursor-pointer"
                    >
                      Take Over
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Leads */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
                <span>Prospect Pool</span>
                <Users className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
                {data.total_leads.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {data.leads_by_stage['QUALIFIED'] || 0} qualified • {data.leads_by_stage['ENGAGED'] || 0} engaged
              </div>
            </div>

            {/* Qualification Rate */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
                <span>Qualification Rate</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {data.qualification_rate}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {data.qualified_leads_today} qualified today
              </div>
            </div>

            {/* Response Rate */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
                <span>Response Rate</span>
                <Send className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
                {data.response_rate}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {data.responses_received_count} / {data.messages_sent_count} sent
              </div>
            </div>

            {/* Meeting Conversion */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-1">
              <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
                <span>Booked Meetings</span>
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
                {data.meetings_today} today
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {data.meeting_conversion_rate}% conversion rate
              </div>
            </div>
          </div>

          {/* Pipeline Stage Breakdown */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
              Pipeline Stage Distribution
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {[
                { stage: 'NEW', label: 'New', count: data.leads_by_stage['NEW'] || 0 },
                { stage: 'CONTACTED', label: 'Contacted', count: data.leads_by_stage['CONTACTED'] || 0 },
                { stage: 'ENGAGED', label: 'Engaged', count: data.leads_by_stage['ENGAGED'] || 0 },
                { stage: 'QUALIFIED', label: 'Qualified', count: data.leads_by_stage['QUALIFIED'] || 0 },
                { stage: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', count: data.leads_by_stage['MEETING_SCHEDULED'] || 0 },
                { stage: 'DO_NOT_CONTACT', label: 'DNC / Opt-Out', count: data.leads_by_stage['DO_NOT_CONTACT'] || 0 },
                { stage: 'CLOSED', label: 'Closed', count: data.leads_by_stage['CLOSED'] || 0 },
              ].map((s) => (
                <div key={s.stage} className="p-3 bg-[#090d16] border border-slate-800 rounded text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase truncate">{s.label}</div>
                  <div className="text-lg font-bold font-mono text-slate-100 mt-0.5 tabular-nums">
                    {s.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DashboardOverview } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import {
  AlertTriangle, Users, Calendar, ArrowRight, MessageSquare,
  Sparkles, CheckCircle2, ShieldAlert, Send, Plus, Upload, Link2,
  TrendingUp, Clock, AlertCircle
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    api.getDashboardOverview()
      .then(setData)
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        setError('Unable to load pipeline metrics. Please check your backend connection.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isCompletelyEmpty = !data || (data.total_leads === 0 && data.messages_sent_count === 0 && data.ai_conversations_count === 0);

  const statCards = data ? [
    {
      title: 'Total Prospects',
      value: data.total_leads.toLocaleString(),
      subtext: `${data.leads_by_stage['QUALIFIED'] || 0} qualified • ${data.leads_by_stage['ENGAGED'] || 0} engaged`,
      icon: Users,
      bg: 'bg-slate-100 text-slate-700',
    },
    {
      title: 'Qualification Rate',
      value: `${data.qualification_rate}%`,
      subtext: `${data.qualified_leads_today} evaluated today`,
      icon: Sparkles,
      bg: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Response Rate',
      value: `${data.response_rate}%`,
      subtext: `${data.responses_received_count} / ${data.messages_sent_count} sent`,
      icon: Send,
      bg: 'bg-blue-100 text-blue-800',
    },
    {
      title: 'Booked Meetings',
      value: `${data.meetings_today} today`,
      subtext: `${data.meeting_conversion_rate}% conversion rate`,
      icon: Calendar,
      bg: 'bg-amber-100 text-amber-800',
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Operations Cockpit
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Real-time pipeline health, outreach cadence, and required human interventions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/integrations"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition shadow-2xs"
          >
            <Link2 className="w-4 h-4 text-slate-500" />
            <span>Integrations</span>
          </Link>
          <Link
            to="/leads"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Discover Leads</span>
          </Link>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchDashboard}
            className="underline font-semibold hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State when zero database records */}
      {isCompletelyEmpty ? (
        <EmptyState
          type="no-data"
          icon={Users}
          title="No leads in workspace yet"
          description="Your prospect pool is completely empty. Connect Apollo.io, import a CSV list, or create your first Ideal Customer Profile (ICP) to begin."
          actionText="Search Prospects"
          onAction={() => navigate('/leads')}
          actionNode={
            <div className="flex items-center gap-3 mt-4">
              <Link
                to="/leads"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Search Prospects</span>
              </Link>
              <Link
                to="/icps"
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm py-2 px-4 rounded-lg shadow-2xs transition"
              >
                <span>Define Target ICP</span>
              </Link>
            </div>
          }
        />
      ) : data ? (
        <>
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {card.title}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tabular-nums">
                      {card.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {card.subtext}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attention Inbox Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">
                  Needs Attention Right Now
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {data.attention_items.length} actionable item{data.attention_items.length === 1 ? '' : 's'}
              </span>
            </div>

            {data.attention_items.length === 0 ? (
              <div className="py-4 text-sm text-slate-500 text-center flex items-center justify-center gap-2 bg-slate-50 rounded-lg border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>All active conversations and sequences operating normally. Zero human interventions required.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.attention_items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/70 transition"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">{item.description}</div>
                    </div>

                    <button
                      onClick={() => navigate('/conversations')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <span>Take Over</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Stage Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pipeline Stage Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current prospect progression across automated lifecycle stages
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {[
                { stage: 'NEW', label: 'New', count: data.leads_by_stage['NEW'] || 0 },
                { stage: 'CONTACTED', label: 'Contacted', count: data.leads_by_stage['CONTACTED'] || 0 },
                { stage: 'ENGAGED', label: 'Engaged', count: data.leads_by_stage['ENGAGED'] || 0 },
                { stage: 'QUALIFIED', label: 'Qualified', count: data.leads_by_stage['QUALIFIED'] || 0 },
                { stage: 'MEETING_SCHEDULED', label: 'Meeting Set', count: data.leads_by_stage['MEETING_SCHEDULED'] || 0 },
                { stage: 'DO_NOT_CONTACT', label: 'DNC / Opt-Out', count: data.leads_by_stage['DO_NOT_CONTACT'] || 0 },
                { stage: 'CLOSED', label: 'Closed Deal', count: data.leads_by_stage['CLOSED'] || 0 },
              ].map((s) => (
                <div key={s.stage} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center hover:bg-slate-100/60 transition">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{s.label}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {s.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DashboardPage;

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AuditLog, AIRun } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import {
  ShieldAlert, Sparkles, Terminal, Clock, CheckCircle2,
  XCircle, User, Cpu, Link2, RefreshCw
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [aiRuns, setAiRuns] = useState<AIRun[]>([]);
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'AI_RUNS'>('AUDIT');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const [auditData, aiData] = await Promise.all([
        api.listAuditLogs(100),
        api.listAIRuns(100)
      ]);
      setLogs(auditData);
      setAiRuns(aiData);
    } catch {
      setLogs([]);
      setAiRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleRefresh = async () => {
    await loadLogs();
    addToast('Audit telemetry refreshed.');
  };

  const getActorBadge = (actor: string) => {
    if (actor === 'AI') {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-xs font-semibold">
          AI
        </span>
      );
    } else if (actor === 'USER') {
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-xs font-semibold">
          USER
        </span>
      );
    } else if (actor === 'WEBHOOK') {
      return (
        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md text-xs font-semibold">
          WEBHOOK
        </span>
      );
    } else if (actor === 'INTEGRATION') {
      return (
        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-xs font-semibold">
          INTEGRATION
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-xs font-semibold">
        {actor}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Audit Trail & AI Observability
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Immutable operation history, token telemetry, and explainable decision records.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs cursor-pointer self-start sm:self-auto"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'AUDIT'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          System Audit Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('AI_RUNS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'AI_RUNS'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          AI Execution Runs ({aiRuns.length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading telemetry traces...</span>
        </div>
      ) : activeTab === 'AUDIT' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {logs.length === 0 ? (
            <EmptyState
              type="no-data"
              icon={ShieldAlert}
              title="No Audit Logs Recorded"
              description="Actions taken across campaigns, manual takeovers, and qualification updates are recorded here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Context Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        {getActorBadge(log.actor_type)}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-semibold">{log.action}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-xs font-mono text-[11px]">
                        {JSON.stringify(log.metadata_json)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {aiRuns.length === 0 ? (
            <EmptyState
              type="no-data"
              icon={Sparkles}
              title="No AI Execution Runs"
              description="Evaluations by OpenAI models and prompt reasoning logs will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Tokens</th>
                    <th className="py-3 px-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {aiRuns.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-semibold">{r.model}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{r.prompt_category} (v{r.prompt_version})</td>
                      <td className="py-3 px-4 text-slate-700 tabular-nums font-semibold">{r.latency_ms}ms</td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {r.input_tokens || 0} in / {r.output_tokens || 0} out
                      </td>
                      <td className="py-3 px-4">
                        {r.success ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> OK
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditPage;

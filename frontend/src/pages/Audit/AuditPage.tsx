import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AuditLog, AIRun } from '../../types';
import {
  ShieldAlert, Sparkles, Terminal, Clock, CheckCircle2,
  XCircle, User, Cpu, Link2, RefreshCw
} from 'lucide-react';

export const AuditPage: React.FC = () => {
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

  const getActorBadge = (actor: string) => {
    if (actor === 'AI') {
      return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono text-[10px]">AI</span>;
    } else if (actor === 'USER') {
      return <span className="bg-sky-950 text-sky-400 border border-sky-800 px-1.5 py-0.5 rounded font-mono text-[10px]">USER</span>;
    } else if (actor === 'WEBHOOK') {
      return <span className="bg-purple-950 text-purple-400 border border-purple-800 px-1.5 py-0.5 rounded font-mono text-[10px]">WEBHOOK</span>;
    } else if (actor === 'INTEGRATION') {
      return <span className="bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded font-mono text-[10px]">INTEGRATION</span>;
    }
    return <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono text-[10px]">{actor}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Audit Trail & AI Observability</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable operation history, token usage telemetry, and explainable decision records
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 hover:text-slate-100"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
            activeTab === 'AUDIT'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          System Audit Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('AI_RUNS')}
          className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
            activeTab === 'AI_RUNS'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          AI Execution Runs ({aiRuns.length})
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading telemetry logs...</div>
      ) : activeTab === 'AUDIT' ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">No audit logs recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090d16]/70 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition text-[11px]">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2 px-3">
                      {getActorBadge(log.actor_type)}
                    </td>
                    <td className="py-2 px-3 text-slate-200 font-semibold">{log.action}</td>
                    <td className="py-2 px-3 text-slate-400">{log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}</td>
                    <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                      {JSON.stringify(log.metadata_json)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
          {aiRuns.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">No AI execution runs recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090d16]/70 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Tokens</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {aiRuns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition text-[11px]">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold">{r.model}</td>
                    <td className="py-2 px-3 text-slate-300">{r.prompt_category} (v{r.prompt_version})</td>
                    <td className="py-2 px-3 text-slate-300 tabular-nums">{r.latency_ms}ms</td>
                    <td className="py-2 px-3 text-slate-400">
                      {r.input_tokens || 0} in / {r.output_tokens || 0} out
                    </td>
                    <td className="py-2 px-3">
                      {r.success ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1 font-semibold">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

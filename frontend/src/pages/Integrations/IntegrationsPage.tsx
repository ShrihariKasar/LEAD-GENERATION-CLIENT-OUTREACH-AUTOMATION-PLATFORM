import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Integration, DiagnosticError } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Link2, RefreshCw, Key, Shield, AlertTriangle, CheckCircle2,
  Trash2, ExternalLink, X, Clock, HelpCircle, Terminal
} from 'lucide-react';

const PROVIDER_METADATA: Record<string, { name: string; category: string; description: string; placeholder: string; fieldName: string }> = {
  OPENAI: {
    name: "OpenAI Intelligence",
    category: "AI & Decisioning",
    description: "Powers structured qualification, buying intent classification, grounded messaging, and anti-repetition memory.",
    placeholder: "sk-proj-...",
    fieldName: "api_key"
  },
  APOLLO: {
    name: "Apollo.io Lead Discovery",
    category: "Lead Generation",
    description: "Enables direct B2B prospect search, organization filtering, and enriched contact ingestion.",
    placeholder: "Apollo API key",
    fieldName: "api_key"
  },
  HUNTER: {
    name: "Hunter.io Enrichment",
    category: "Email Verification",
    description: "Performs real email deliverability verification and confidence scoring with provenance tracking.",
    placeholder: "Hunter.io API key",
    fieldName: "api_key"
  },
  TELEGRAM: {
    name: "Telegram Bot API",
    category: "Outreach & Messaging",
    description: "Automates direct messaging and 2-way AI conversation with verified opt-in deep links.",
    placeholder: "Bot token (from @BotFather)",
    fieldName: "bot_token"
  },
  GOOGLE_CALENDAR: {
    name: "Google Calendar",
    category: "Scheduling",
    description: "Queries real FreeBusy availability windows and books conflict-free calendar events with Google Meet links.",
    placeholder: "Google OAuth Access Token",
    fieldName: "access_token"
  },
  LINKEDIN: {
    name: "LinkedIn Connector",
    category: "Social Outreach",
    description: "Official profile and CRM integration. Reports restricted capabilities without unofficial scraping.",
    placeholder: "LinkedIn OAuth Access Token",
    fieldName: "access_token"
  },
  HUBSPOT: {
    name: "HubSpot CRM",
    category: "CRM Synchronization",
    description: "Additive two-way contact synchronization for qualified revenue opportunities.",
    placeholder: "HubSpot Private App Token (pat-...)",
    fieldName: "api_key"
  }
};

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  // Connection Modal
  const [connectModalProvider, setConnectModalProvider] = useState<string | null>(null);
  const [credentialInput, setCredentialInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Diagnostic Modal
  const [diagnosticModal, setDiagnosticModal] = useState<DiagnosticError | null>(null);

  // Testing individual provider
  const [testingMap, setTestingMap] = useState<Record<string, boolean>>({});

  const loadIntegrations = async () => {
    try {
      const data = await api.listIntegrations();
      setIntegrations(data);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleOpenConnect = (prov: string) => {
    setConnectModalProvider(prov);
    setCredentialInput('');
    setConnectError(null);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectModalProvider || !credentialInput.trim()) return;
    setIsConnecting(true);
    setConnectError(null);

    const meta = PROVIDER_METADATA[connectModalProvider];
    const payload: Record<string, any> = {
      [meta.fieldName]: credentialInput.trim()
    };

    try {
      const res = await api.connectIntegration(connectModalProvider, payload);
      if (res.status === 'ERROR') {
        setConnectError(res.error_message || 'Connection test failed');
      } else {
        setConnectModalProvider(null);
        await loadIntegrations();
      }
    } catch (err: any) {
      setConnectError(err.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async (prov: string) => {
    setTestingMap((prev) => ({ ...prev, [prov]: true }));
    try {
      const res = await api.testIntegration(prov);
      if (!res.success && res.diagnostic) {
        setDiagnosticModal(res.diagnostic);
      }
      await loadIntegrations();
    } catch {
      //
    } finally {
      setTestingMap((prev) => ({ ...prev, [prov]: false }));
    }
  };

  const handleDisconnect = async (prov: string) => {
    if (window.confirm(`Disconnect ${prov} from workspace?`)) {
      await api.disconnectIntegration(prov);
      await loadIntegrations();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Integration Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Encrypted credential management, live health checks, and structured error diagnostics
          </p>
        </div>
      </div>

      {/* Global Status Bar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">Global Status Bar:</span>
        <div className="flex flex-wrap items-center gap-3">
          {integrations.map((i) => (
            <div key={i.provider} className="flex items-center gap-1.5 bg-[#090d16] px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-300 font-medium">{i.provider}</span>
              <StatusBadge status={i.status} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((i) => {
          const meta = PROVIDER_METADATA[i.provider] || {
            name: i.provider,
            category: "Integration",
            description: "",
            placeholder: "",
            fieldName: "api_key"
          };
          const isTesting = Boolean(testingMap[i.provider]);

          return (
            <div key={i.provider} className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                      {meta.category}
                    </div>
                    <h2 className="text-sm font-semibold text-slate-100 font-mono mt-0.5">
                      {meta.name}
                    </h2>
                  </div>
                  <StatusBadge status={i.status} />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {meta.description}
                </p>

                {i.account_identifier && (
                  <div className="text-[11px] font-mono text-slate-300 bg-[#090d16] p-2 rounded border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500">Connected Account:</span>
                    <span className="text-emerald-400 font-medium truncate max-w-[200px]">{i.account_identifier}</span>
                  </div>
                )}

                {i.error_message && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[10px] text-rose-400">ERROR: {i.error_code || 'CONN_FAILED'}</span>
                      {i.diagnostic && (
                        <button
                          onClick={() => setDiagnosticModal(i.diagnostic!)}
                          className="text-[10px] text-rose-300 underline cursor-pointer"
                        >
                          View Diagnostics
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] truncate">{i.error_message}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 font-mono">
                  {i.last_successful_request
                    ? `Verified ${new Date(i.last_successful_request).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not verified yet'}
                </div>

                <div className="flex items-center gap-2">
                  {i.status === 'CONNECTED' || i.status === 'RESTRICTED' || i.status === 'ERROR' ? (
                    <>
                      <button
                        onClick={() => handleTestConnection(i.provider)}
                        disabled={isTesting}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-mono flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                        {isTesting ? 'Testing...' : 'Test'}
                      </button>

                      <button
                        onClick={() => handleOpenConnect(i.provider)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-mono cursor-pointer"
                      >
                        Update
                      </button>

                      <button
                        onClick={() => handleDisconnect(i.provider)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenConnect(i.provider)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Key className="w-3 h-3" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {connectModalProvider && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                <Key className="w-4 h-4 text-emerald-400" />
                Configure {PROVIDER_METADATA[connectModalProvider]?.name}
              </h2>
              <button onClick={() => setConnectModalProvider(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">
                  API Key / OAuth Token (stored with AES-256 encryption)
                </label>
                <input
                  type="password"
                  required
                  value={credentialInput}
                  onChange={(e) => setCredentialInput(e.target.value)}
                  placeholder={PROVIDER_METADATA[connectModalProvider]?.placeholder}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {connectError && (
                <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded text-rose-300 text-[11px] font-mono">
                  {connectError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConnectModalProvider(null)}
                  className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!credentialInput.trim() || isConnecting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50"
                >
                  {isConnecting ? 'Verifying Live...' : 'Save & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnostic Details Modal */}
      {diagnosticModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Integration Error Diagnostic
              </h2>
              <button onClick={() => setDiagnosticModal(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Cause</span>
                <span className="text-slate-200">{diagnosticModal.cause}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Recommended Action</span>
                <span className="text-emerald-400">{diagnosticModal.action}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Technical Reference</span>
                  <span className="text-slate-300 font-bold">{diagnosticModal.technical_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Timestamp</span>
                  <span className="text-slate-400">{new Date(diagnosticModal.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {diagnosticModal.raw_message && (
                <div className="p-2.5 bg-[#090d16] border border-slate-800 rounded text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-32">
                  {diagnosticModal.raw_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setDiagnosticModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

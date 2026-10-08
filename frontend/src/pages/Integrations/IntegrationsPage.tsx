import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Integration, DiagnosticError } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/Toast';
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
  const { addToast } = useToast();
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
        addToast(`Connection to ${connectModalProvider} failed.`, 'error');
      } else {
        setConnectModalProvider(null);
        addToast(`Connected to ${PROVIDER_METADATA[connectModalProvider]?.name || connectModalProvider}!`);
        await loadIntegrations();
      }
    } catch (err: any) {
      setConnectError(err.message || 'Connection failed');
      addToast('Connection failed', 'error');
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
        addToast(`Health check error on ${prov}.`, 'error');
      } else {
        addToast(`Adapter check passed for ${prov}!`);
      }
      await loadIntegrations();
    } catch {
      addToast(`Test connection failed for ${prov}`, 'error');
    } finally {
      setTestingMap((prev) => ({ ...prev, [prov]: false }));
    }
  };

  const handleDisconnect = async (prov: string) => {
    if (window.confirm(`Disconnect ${prov} from workspace?`)) {
      try {
        await api.disconnectIntegration(prov);
        addToast(`Disconnected ${prov}.`);
        await loadIntegrations();
      } catch (err: any) {
        addToast(err.message || 'Disconnect failed', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Integration Center
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Verified credential management, live adapter health checks, and actionable diagnostics.
          </p>
        </div>
      </div>

      {/* Global Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
          Global Adapters Status
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          {integrations.map((i) => (
            <div key={i.provider} className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <span className="text-slate-800 font-semibold text-xs">{i.provider}</span>
              <StatusBadge status={i.status} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            <div key={i.provider} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-300 transition">
              <div className="space-y-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      {meta.category}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {meta.name}
                    </h2>
                  </div>
                  <StatusBadge status={i.status} />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {meta.description}
                </p>

                {i.account_identifier && (
                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between font-medium">
                    <span className="text-slate-500">Connected Account:</span>
                    <span className="text-slate-900 font-semibold truncate max-w-[200px]">{i.account_identifier}</span>
                  </div>
                )}

                {i.error_message && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-rose-700">ALERT: {i.error_code || 'CONN_FAILED'}</span>
                      {i.diagnostic && (
                        <button
                          onClick={() => setDiagnosticModal(i.diagnostic!)}
                          className="text-[11px] text-rose-800 underline font-semibold cursor-pointer"
                        >
                          View Diagnostics
                        </button>
                      )}
                    </div>
                    <div className="text-xs truncate">{i.error_message}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-400 font-medium">
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
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs transition"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'Testing...' : 'Test'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenConnect(i.provider)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition"
                      >
                        Update
                      </button>

                      <button
                        onClick={() => handleDisconnect(i.provider)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                        title="Disconnect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenConnect(i.provider)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                    >
                      <Key className="w-3 h-3" />
                      <span>Connect</span>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                Configure {PROVIDER_METADATA[connectModalProvider]?.name}
              </h2>
              <button onClick={() => setConnectModalProvider(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  API Key / OAuth Token (stored with AES-256 encryption)
                </label>
                <input
                  type="password"
                  required
                  value={credentialInput}
                  onChange={(e) => setCredentialInput(e.target.value)}
                  placeholder={PROVIDER_METADATA[connectModalProvider]?.placeholder}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              {connectError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium">
                  {connectError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConnectModalProvider(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!credentialInput.trim() || isConnecting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Integration Error Diagnostic
              </h2>
              <button onClick={() => setDiagnosticModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-0.5">Cause</span>
                <span className="text-slate-900 font-semibold text-sm">{diagnosticModal.cause}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-0.5">Recommended Action</span>
                <span className="text-slate-700 font-medium leading-relaxed">{diagnosticModal.action}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Error Code</span>
                  <span className="text-slate-900 font-bold">{diagnosticModal.technical_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Timestamp</span>
                  <span className="text-slate-600 font-medium">{new Date(diagnosticModal.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {diagnosticModal.raw_message && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-32 font-mono">
                  {diagnosticModal.raw_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setDiagnosticModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold cursor-pointer transition"
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

export default IntegrationsPage;

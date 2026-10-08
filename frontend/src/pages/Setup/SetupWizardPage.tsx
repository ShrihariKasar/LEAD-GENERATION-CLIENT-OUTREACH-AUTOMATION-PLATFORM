import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { SetupStatus, Integration } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/Toast';
import {
  CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  Sparkles, Database, Users, Shield, Link2, Key, RefreshCw,
  Building, Calendar, MessageSquare, ExternalLink
} from 'lucide-react';

export const SetupWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [statusData, setStatusData] = useState<SetupStatus | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  // Form states for in-wizard connection
  const [companyName, setCompanyName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [apolloKey, setApolloKey] = useState('');
  const [hunterKey, setHunterKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const loadStatus = async () => {
    try {
      const [s, i] = await Promise.all([
        api.getSetupStatus(),
        api.listIntegrations()
      ]);
      setStatusData(s);
      setIntegrations(i);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    api.getCurrentWorkspace().then((ws) => {
      setCompanyName(ws.company_name || '');
      setProductDesc(ws.product_description || '');
    }).catch(() => {});
  }, []);

  const handleSaveCompany = async () => {
    try {
      await api.updateWorkspace({
        company_name: companyName,
        product_description: productDesc
      });
      addToast('Company value proposition context saved.');
      await loadStatus();
      setActiveStep(2);
    } catch (err: any) {
      addToast(err.message || 'Failed to update company context', 'error');
    }
  };

  const handleConnectProvider = async (provider: string, creds: Record<string, any>) => {
    setTestingProvider(provider);
    setTestResult(null);
    try {
      const res = await api.connectIntegration(provider, creds);
      const isOk = res.status === 'CONNECTED' || res.status === 'RESTRICTED';
      setTestResult({
        success: isOk,
        message: isOk ? 'Connection verified successfully.' : (res.error_message || 'Verification failed')
      });
      if (isOk) {
        addToast(`Verified adapter: ${provider}!`);
      } else {
        addToast(`Verification failed for ${provider}`, 'error');
      }
      await loadStatus();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection failed' });
      addToast('Connection failed', 'error');
    } finally {
      setTestingProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span>Inspecting platform integrations & database connectivity...</span>
      </div>
    );
  }

  const steps = [
    { num: 1, title: "Company Context" },
    { num: 2, title: "AI Intelligence" },
    { num: 3, title: "Lead Sources" },
    { num: 4, title: "Communication" },
    { num: 5, title: "Final Verification" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Platform Setup Wizard
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Verify platform adapters, database schema consistency, and credentials.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
          >
            Skip to Operations Console
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-6">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`p-3 border rounded-xl text-left transition cursor-pointer ${
                activeStep === s.num
                  ? 'border-slate-900 bg-white shadow-2xs ring-1 ring-slate-900'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-600'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">STEP {s.num}</div>
              <div className="text-xs font-bold text-slate-900 truncate mt-0.5">{s.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Company Profile */}
      {activeStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-slate-600" />
              Company Identity & Value Proposition
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              AI models ground evaluation decisions and tailored messaging using this exact context without hallucinating claims.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company / Product Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Cloud Infrastructure"
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Product Description & Core Offering</label>
              <textarea
                rows={3}
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                placeholder="e.g. High-performance PostgreSQL database replication and failover engine for mid-market engineering teams."
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveCompany}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              <span>Save & Next: Connect AI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: OpenAI */}
      {activeStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              OpenAI Intelligence Adapter
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Required for intent classification, grounded qualification scoring, anti-repetition memory, and structured outputs.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">OpenAI API Key (sk-...)</label>
              <div className="flex gap-2.5">
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
                <button
                  onClick={() => handleConnectProvider('OPENAI', { api_key: openaiKey })}
                  disabled={!openaiKey || testingProvider === 'OPENAI'}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer transition"
                >
                  {testingProvider === 'OPENAI' ? 'Testing...' : 'Test & Save'}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-lg text-xs font-medium border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              <span>Next: Lead Sources</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Lead Sources */}
      {activeStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Lead Discovery & Enrichment Providers
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Connect Apollo.io for discovery and Hunter.io for email deliverability verification.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Apollo */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Apollo.io API Key</span>
                <StatusBadge status={integrations.find(i => i.provider === 'APOLLO')?.status || 'NOT_CONNECTED'} />
              </div>
              <div className="flex gap-2.5">
                <input
                  type="password"
                  value={apolloKey}
                  onChange={(e) => setApolloKey(e.target.value)}
                  placeholder="Apollo API key"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
                <button
                  onClick={() => handleConnectProvider('APOLLO', { api_key: apolloKey })}
                  disabled={!apolloKey || testingProvider === 'APOLLO'}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-sm transition"
                >
                  {testingProvider === 'APOLLO' ? 'Testing...' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Hunter */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Hunter.io API Key</span>
                <StatusBadge status={integrations.find(i => i.provider === 'HUNTER')?.status || 'NOT_CONNECTED'} />
              </div>
              <div className="flex gap-2.5">
                <input
                  type="password"
                  value={hunterKey}
                  onChange={(e) => setHunterKey(e.target.value)}
                  placeholder="Hunter.io API key"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
                <button
                  onClick={() => handleConnectProvider('HUNTER', { api_key: hunterKey })}
                  disabled={!hunterKey || testingProvider === 'HUNTER'}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-sm transition"
                >
                  {testingProvider === 'HUNTER' ? 'Testing...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(2)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(4)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              <span>Next: Communication Channel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Telegram */}
      {activeStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Telegram Bot API & Opt-In Architecture
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Provides verified opt-in deep links (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">https://t.me/Bot?start=lead_ref</code>) and 2-way AI conversations.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Telegram Bot Token (from @BotFather)</label>
              <div className="flex gap-2.5">
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxyz"
                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
                <button
                  onClick={() => handleConnectProvider('TELEGRAM', { bot_token: telegramToken })}
                  disabled={!telegramToken || testingProvider === 'TELEGRAM'}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-sm transition"
                >
                  {testingProvider === 'TELEGRAM' ? 'Testing...' : 'Verify Token'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(3)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(5)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              <span>Next: Final Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Final Check */}
      {activeStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Final Integration Health Check
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Live status across all 7 platform adapters:
            </p>
          </div>

          <div className="space-y-3">
            {statusData?.services.map((svc) => (
              <div key={svc.provider_key} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{svc.name}</span>
                    {svc.is_required && (
                      <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">{svc.summary}</div>
                </div>
                <StatusBadge status={svc.status} />
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(4)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => navigate('/leads')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              <span>Launch Operations Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupWizardPage;

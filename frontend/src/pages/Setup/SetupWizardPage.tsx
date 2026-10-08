import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { SetupStatus, Integration } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  Sparkles, Database, Users, Shield, Link2, Key, RefreshCw,
  Building, Calendar, MessageSquare, ExternalLink
} from 'lucide-react';

export const SetupWizardPage: React.FC = () => {
  const navigate = useNavigate();
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
    await api.updateWorkspace({
      company_name: companyName,
      product_description: productDesc
    });
    await loadStatus();
    setActiveStep(2);
  };

  const handleConnectProvider = async (provider: string, creds: Record<string, any>) => {
    setTestingProvider(provider);
    setTestResult(null);
    try {
      const res = await api.connectIntegration(provider, creds);
      setTestResult({ success: res.status === 'CONNECTED' || res.status === 'RESTRICTED', message: res.error_message || 'Connection verified successfully.' });
      await loadStatus();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection failed' });
    } finally {
      setTestingProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center font-mono text-xs text-slate-400">
        Inspecting platform integrations & database status...
      </div>
    );
  }

  const steps = [
    { num: 1, title: "Company Context" },
    { num: 2, title: "AI Intelligence" },
    { num: 3, title: "Lead Sources" },
    { num: 4, title: "Communication" },
    { num: 5, title: "Calendar & Verification" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-100 font-mono tracking-tight">System Initialization & Setup Wizard</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify platform adapters, database consistency, and API connectivity.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 hover:border-slate-700 font-mono"
          >
            Skip to Operations Console
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mt-6">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`flex-1 py-2 px-3 border rounded text-xs font-mono transition text-left ${
                activeStep === s.num
                  ? 'border-emerald-500/80 bg-emerald-950/20 text-emerald-300'
                  : 'border-slate-800 bg-[#0f172a] text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] text-slate-500 font-semibold">STEP {s.num}</div>
              <div className="font-medium truncate">{s.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Company Profile */}
      {activeStep === 1 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              Company Identity & Value Proposition
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              AI uses this context to ground qualification checks and outreach messaging without fabricating claims.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Company / Product Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Cloud Infrastructure"
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Product Description & Core Offering</label>
              <textarea
                rows={3}
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                placeholder="e.g. High-performance PostgreSQL database replication and failover engine for mid-market engineering teams."
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={handleSaveCompany}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              Save & Next: Connect AI
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: OpenAI */}
      {activeStep === 2 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              OpenAI Intelligence Adapter
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Required for intent classification, grounded qualification scoring, anti-repetition memory, and structured outputs.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">OpenAI API Key (sk-...)</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="flex-1 bg-[#090d16] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={() => handleConnectProvider('OPENAI', { api_key: openaiKey })}
                  disabled={!openaiKey || testingProvider === 'OPENAI'}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-mono disabled:opacity-50 cursor-pointer"
                >
                  {testingProvider === 'OPENAI' ? 'Testing...' : 'Test & Save'}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 border rounded text-xs font-mono ${
                testResult.success ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveStep(1)}
              className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              Next: Lead Sources
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Lead Sources */}
      {activeStep === 3 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Lead Discovery & Enrichment Providers
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Connect Apollo.io for discovery and Hunter.io for email deliverability verification.
            </p>
          </div>

          <div className="space-y-5">
            {/* Apollo */}
            <div className="p-4 border border-slate-800 rounded-md bg-[#090d16]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 font-mono">Apollo.io API Key</span>
                <StatusBadge status={integrations.find(i => i.provider === 'APOLLO')?.status || 'NOT_CONNECTED'} />
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apolloKey}
                  onChange={(e) => setApolloKey(e.target.value)}
                  placeholder="Apollo API key"
                  className="flex-1 bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
                <button
                  onClick={() => handleConnectProvider('APOLLO', { api_key: apolloKey })}
                  disabled={!apolloKey || testingProvider === 'APOLLO'}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono disabled:opacity-50"
                >
                  {testingProvider === 'APOLLO' ? 'Testing...' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Hunter */}
            <div className="p-4 border border-slate-800 rounded-md bg-[#090d16]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 font-mono">Hunter.io API Key</span>
                <StatusBadge status={integrations.find(i => i.provider === 'HUNTER')?.status || 'NOT_CONNECTED'} />
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={hunterKey}
                  onChange={(e) => setHunterKey(e.target.value)}
                  placeholder="Hunter.io API key"
                  className="flex-1 bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
                <button
                  onClick={() => handleConnectProvider('HUNTER', { api_key: hunterKey })}
                  disabled={!hunterKey || testingProvider === 'HUNTER'}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono disabled:opacity-50"
                >
                  {testingProvider === 'HUNTER' ? 'Testing...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveStep(2)}
              className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(4)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              Next: Communication Channel
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Telegram */}
      {activeStep === 4 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Telegram Bot API & Opt-In Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Provides verified opt-in deep links (<code className="text-emerald-400">https://t.me/Bot?start=lead_ref</code>) and 2-way AI conversations.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Telegram Bot Token (from @BotFather)</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxyz"
                  className="flex-1 bg-[#090d16] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={() => handleConnectProvider('TELEGRAM', { bot_token: telegramToken })}
                  disabled={!telegramToken || testingProvider === 'TELEGRAM'}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-mono disabled:opacity-50 cursor-pointer"
                >
                  {testingProvider === 'TELEGRAM' ? 'Testing...' : 'Verify Token'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveStep(3)}
              className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(5)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              Next: Calendar & Verification
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Calendar & Status Check */}
      {activeStep === 5 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Final Integration Health Check
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Live status across all 7 platform adapters:
            </p>
          </div>

          <div className="space-y-3">
            {statusData?.services.map((svc) => (
              <div key={svc.provider_key} className="p-3 border border-slate-800 rounded bg-[#090d16] flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-200 flex items-center gap-2">
                    <span>{svc.name}</span>
                    {svc.is_required && (
                      <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-900/50 px-1 rounded font-mono">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{svc.summary}</div>
                </div>
                <StatusBadge status={svc.status} />
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveStep(4)}
              className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
            >
              Back
            </button>
            <button
              onClick={() => navigate('/leads')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              Launch Operations Console
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

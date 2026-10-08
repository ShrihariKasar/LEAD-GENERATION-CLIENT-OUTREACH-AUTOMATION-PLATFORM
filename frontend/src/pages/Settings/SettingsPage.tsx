import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Workspace } from '../../types';
import { useToast } from '../../components/common/Toast';
import {
  Settings as SettingsIcon, Shield, Users, Save, Check,
  AlertTriangle, Clock, Building
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [maxDailyOutreach, setMaxDailyOutreach] = useState(50);
  const [maxFollowUps, setMaxFollowUps] = useState(3);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [optOutKeywords, setOptOutKeywords] = useState('stop, unsubscribe, remove me, not interested, cancel');

  useEffect(() => {
    api.getCurrentWorkspace().then((ws) => {
      setWorkspace(ws);
      setCompanyName(ws.company_name || '');
      setWebsite(ws.website || '');
      setIndustry(ws.industry || '');
      setProductDesc(ws.product_description || '');
      
      const s = ws.settings || {};
      setMaxDailyOutreach(s.max_daily_outreach || 50);
      setMaxFollowUps(s.max_follow_ups || 3);
      setQuietHoursEnabled(s.quiet_hours_enabled !== false);
      if (Array.isArray(s.opt_out_keywords)) {
        setOptOutKeywords(s.opt_out_keywords.join(', '));
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const keywords = optOutKeywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
      await api.updateWorkspace({
        company_name: companyName,
        website: website,
        industry: industry,
        product_description: productDesc,
        settings: {
          ...(workspace?.settings || {}),
          max_daily_outreach: Number(maxDailyOutreach),
          max_follow_ups: Number(maxFollowUps),
          quiet_hours_enabled: quietHoursEnabled,
          opt_out_keywords: keywords
        }
      });
      addToast('Workspace settings saved successfully.');
    } catch (err: any) {
      addToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span>Loading workspace configuration...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Workspace & Compliance Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage company value proposition context, cadence caps, and outreach safety guardrails.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-900">
              Company Context & Value Proposition
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Website URL</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Product Description (Grounding context for AI outreach generation)
              </label>
              <textarea
                rows={3}
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                placeholder="Briefly describe what your product does, key differentiators, and value provided..."
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Outreach Safety Policies */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Outreach Safety & Compliance Guardrails
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Daily Sending Cap (Messages/Day)</label>
              <input
                type="number"
                min="1"
                max="500"
                value={maxDailyOutreach}
                onChange={(e) => setMaxDailyOutreach(Number(e.target.value))}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Follow-ups per Prospect</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxFollowUps}
                onChange={(e) => setMaxFollowUps(Number(e.target.value))}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
              />
            </div>

            <div className="md:col-span-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-800 font-medium">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                />
                <span className="text-sm">Enforce Quiet Hours (20:00 - 08:00 local time) — Automations pause overnight</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Opt-Out Detection Keywords (triggers instant Do Not Contact status)
              </label>
              <input
                type="text"
                value={optOutKeywords}
                onChange={(e) => setOptOutKeywords(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95 disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Workspace Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;

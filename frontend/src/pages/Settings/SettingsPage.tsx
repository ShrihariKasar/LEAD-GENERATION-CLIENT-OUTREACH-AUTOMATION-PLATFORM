import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Workspace } from '../../types';
import {
  Settings as SettingsIcon, Shield, Users, Save, Check,
  AlertTriangle, Clock, Building
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
    setSavedSuccess(false);
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
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      //
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading workspace settings...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Workspace & Operational Safety Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage company product positioning and outreach safety policies</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Building className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
              Company Context & Value Proposition
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Website URL</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1">Product Description (Grounding context for AI outreach)</label>
              <textarea
                rows={3}
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Outreach Safety Policies */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
              Outreach Safety & Compliance Guardrails
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Daily Sending Cap (Messages/Day)</label>
              <input
                type="number"
                min="1"
                max="500"
                value={maxDailyOutreach}
                onChange={(e) => setMaxDailyOutreach(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Max Follow-ups per Prospect</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxFollowUps}
                onChange={(e) => setMaxFollowUps(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
                <span>Enforce Quiet Hours (20:00 - 08:00 local time) — Automations pause overnight</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1">Opt-Out Detection Keywords (triggers instant DNC status)</label>
              <input
                type="text"
                value={optOutKeywords}
                onChange={(e) => setOptOutKeywords(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          {savedSuccess && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Settings updated successfully.
            </span>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Workspace Settings
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ICPProfile } from '../../types';
import {
  Target, Plus, Check, X, Trash2, Edit2, Shield,
  Layers, CheckCircle2, Sliders, ChevronRight
} from 'lucide-react';

export const ICPsPage: React.FC = () => {
  const [icps, setIcps] = useState<ICPProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetTitles, setTargetTitles] = useState('VP Engineering, Head of Engineering, CTO');
  const [targetIndustries, setTargetIndustries] = useState('Software, SaaS, Information Technology');
  const [targetSizes, setTargetSizes] = useState('11-50, 51-200');
  const [targetGeographies, setTargetGeographies] = useState('United States, Canada, United Kingdom');
  const [excludedTitles, setExcludedTitles] = useState('Intern, Student, Assistant');
  const [minScore, setMinScore] = useState(65);
  const [autoThreshold, setAutoThreshold] = useState(80);

  const loadICPs = async () => {
    setLoading(true);
    try {
      const data = await api.listICPs();
      setIcps(data);
    } catch {
      setIcps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadICPs();
  }, []);

  const handleCreateICP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createICP({
        name,
        description,
        target_job_titles: targetTitles.split(',').map((t) => t.trim()).filter(Boolean),
        target_industries: targetIndustries.split(',').map((i) => i.trim()).filter(Boolean),
        target_company_sizes: targetSizes.split(',').map((s) => s.trim()).filter(Boolean),
        target_geographies: targetGeographies.split(',').map((g) => g.trim()).filter(Boolean),
        negative_criteria: {
          excluded_titles: excludedTitles.split(',').map((t) => t.trim()).filter(Boolean)
        },
        min_qualification_score: Number(minScore),
        auto_qualification_threshold: Number(autoThreshold)
      });
      setShowModal(false);
      setName('');
      setDescription('');
      await loadICPs();
    } catch {
      //
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this ICP profile?")) {
      await api.deleteICP(id);
      await loadICPs();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Ideal Customer Profiles (ICP)</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic rule definitions and scoring weights for automated prospect evaluation
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Create ICP Profile
        </button>
      </div>

      {/* ICP List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading ICP profiles...</div>
      ) : icps.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-10 text-center max-w-lg mx-auto space-y-3">
          <Target className="w-8 h-8 text-emerald-400 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-200">No ICP Profiles Configured</h2>
          <p className="text-xs text-slate-400">
            Define target job titles, company sizes, industries, and negative filters to begin scoring leads.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
          >
            Create First ICP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {icps.map((icp) => (
            <div key={icp.id} className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-100 font-mono">{icp.name}</h2>
                    {icp.is_active && (
                      <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  {icp.description && (
                    <p className="text-xs text-slate-400 mt-1">{icp.description}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(icp.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Criteria Pills */}
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Target Roles</span>
                  <div className="flex flex-wrap gap-1">
                    {icp.target_job_titles.map((t, idx) => (
                      <span key={idx} className="bg-[#090d16] border border-slate-800 px-2 py-0.5 rounded text-slate-300 text-[11px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Industries</span>
                  <div className="flex flex-wrap gap-1">
                    {icp.target_industries.map((ind, idx) => (
                      <span key={idx} className="bg-[#090d16] border border-slate-800 px-2 py-0.5 rounded text-slate-300 text-[11px]">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Company Scales</span>
                  <div className="flex flex-wrap gap-1">
                    {icp.target_company_sizes.map((sz, idx) => (
                      <span key={idx} className="bg-[#090d16] border border-slate-800 px-2 py-0.5 rounded text-slate-300 text-[11px]">
                        {sz} employees
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scoring Weights Summary */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <div>Min Score: <span className="text-slate-200 font-semibold">{icp.min_qualification_score}%</span></div>
                <div>Auto-Qualify: <span className="text-emerald-400 font-semibold">{icp.auto_qualification_threshold}%</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ICP Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                <Target className="w-4 h-4 text-emerald-400" />
                Define ICP Profile & Scoring Weights
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateICP} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Profile Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mid-Market Engineering Decision Makers"
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Target Job Titles (comma separated)</label>
                <input
                  type="text"
                  value={targetTitles}
                  onChange={(e) => setTargetTitles(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Target Industries (comma separated)</label>
                <input
                  type="text"
                  value={targetIndustries}
                  onChange={(e) => setTargetIndustries(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Target Sizes (e.g. 11-50, 51-200)</label>
                  <input
                    type="text"
                    value={targetSizes}
                    onChange={(e) => setTargetSizes(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Target Geographies</label>
                  <input
                    type="text"
                    value={targetGeographies}
                    onChange={(e) => setTargetGeographies(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Negative Exclusions (excluded titles)</label>
                <input
                  type="text"
                  value={excludedTitles}
                  onChange={(e) => setExcludedTitles(e.target.value)}
                  placeholder="Intern, Student, Consultant"
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Min Qualification Score (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Auto-Qualification Threshold (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={autoThreshold}
                    onChange={(e) => setAutoThreshold(Number(e.target.value))}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                >
                  Save ICP Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

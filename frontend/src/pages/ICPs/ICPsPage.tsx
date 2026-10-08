import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ICPProfile } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import {
  Target, Plus, Check, X, Trash2, Edit2, Shield,
  Layers, CheckCircle2, Sliders, ChevronRight
} from 'lucide-react';

export const ICPsPage: React.FC = () => {
  const { addToast } = useToast();
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
      addToast('ICP Profile created successfully.');
      await loadICPs();
    } catch (err: any) {
      addToast(err.message || 'Failed to create ICP profile', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this ICP profile?")) {
      try {
        await api.deleteICP(id);
        addToast('ICP Profile deleted.');
        await loadICPs();
      } catch (err: any) {
        addToast(err.message || 'Failed to delete ICP profile', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Ideal Customer Profiles (ICP)
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Deterministic rule definitions and scoring weights for automated prospect evaluation.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create ICP Profile</span>
        </button>
      </div>

      {/* ICP List */}
      {loading ? (
        <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading ICP profiles...</span>
        </div>
      ) : icps.length === 0 ? (
        <EmptyState
          type="no-data"
          icon={Target}
          title="No ICP Profiles Configured"
          description="Define target job titles, company sizes, industries, and negative filters to begin scoring leads automatically."
          actionText="Create First ICP"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {icps.map((icp) => (
            <div key={icp.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 hover:border-slate-300 transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900">{icp.name}</h2>
                    {icp.is_active && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  {icp.description && (
                    <p className="text-xs text-slate-500 mt-1 font-medium">{icp.description}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(icp.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                  title="Delete Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Criteria Pills */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Target Roles
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.target_job_titles.map((t, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-medium text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Industries
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.target_industries.map((ind, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-medium text-xs">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Company Headcounts
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.target_company_sizes.map((sz, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-medium text-xs">
                        {sz} emp
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scoring Weights Summary */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-slate-600 font-medium">
                  Min Fit Score: <span className="text-slate-900 font-bold">{icp.min_qualification_score}%</span>
                </div>
                <div className="text-slate-600 font-medium">
                  Auto-Qualify: <span className="text-emerald-700 font-bold">{icp.auto_qualification_threshold}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ICP Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                Define ICP Profile & Scoring Weights
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateICP} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Profile Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mid-Market Engineering Decision Makers"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. B2B SaaS engineering leadership in North America"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Job Titles (comma separated)</label>
                <input
                  type="text"
                  value={targetTitles}
                  onChange={(e) => setTargetTitles(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Industries (comma separated)</label>
                <input
                  type="text"
                  value={targetIndustries}
                  onChange={(e) => setTargetIndustries(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company Sizes</label>
                  <input
                    type="text"
                    value={targetSizes}
                    onChange={(e) => setTargetSizes(e.target.value)}
                    placeholder="11-50, 51-200"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Geographies</label>
                  <input
                    type="text"
                    value={targetGeographies}
                    onChange={(e) => setTargetGeographies(e.target.value)}
                    placeholder="United States, Canada"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Negative Criteria (Excluded Titles)</label>
                <input
                  type="text"
                  value={excludedTitles}
                  onChange={(e) => setExcludedTitles(e.target.value)}
                  placeholder="Intern, Student, Assistant"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Score Threshold (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Auto-Qualify Threshold (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={autoThreshold}
                    onChange={(e) => setAutoThreshold(Number(e.target.value))}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm active:scale-95"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ICPsPage;

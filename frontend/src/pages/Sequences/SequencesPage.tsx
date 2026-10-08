import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { OutreachSequence, SequenceStep } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import {
  Workflow, Plus, Play, Pause, Trash2, Clock, Check, X,
  ArrowDown, ChevronRight, Send, AlertCircle
} from 'lucide-react';

export const SequencesPage: React.FC = () => {
  const { addToast } = useToast();
  const [sequences, setSequences] = useState<OutreachSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      step_number: 1,
      channel: 'EMAIL',
      delay_hours: 0,
      condition_rule: 'ALWAYS',
      template_content: "Hi {{first_name}}, I noticed your work leading engineering at {{company}}. Would you be open to a brief discussion about streamlining your data pipeline?"
    },
    {
      step_number: 2,
      channel: 'EMAIL',
      delay_hours: 48,
      condition_rule: 'IF_NO_REPLY',
      template_content: "Hi {{first_name}}, following up on my previous note. We recently helped a similar team in your space reduce replication lag by 60%. Happy to share a quick 15-min overview."
    }
  ]);

  const loadSequences = async () => {
    setLoading(true);
    try {
      const data = await api.listSequences();
      setSequences(data);
    } catch {
      setSequences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSequences();
  }, []);

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSequence({
        name,
        description,
        is_active: true,
        trigger_type: 'MANUAL',
        steps
      });
      setShowModal(false);
      setName('');
      setDescription('');
      addToast('Outreach Sequence deployed successfully.');
      await loadSequences();
    } catch (err: any) {
      addToast(err.message || 'Failed to create sequence', 'error');
    }
  };

  const handleToggleActive = async (seq: OutreachSequence) => {
    try {
      if (seq.is_active) {
        await api.pauseSequence(seq.id);
        addToast(`Sequence "${seq.name}" paused.`);
      } else {
        await api.activateSequence(seq.id);
        addToast(`Sequence "${seq.name}" activated.`);
      }
      await loadSequences();
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle sequence status', 'error');
    }
  };

  const addStep = () => {
    const nextNum = steps.length + 1;
    setSteps([
      ...steps,
      {
        step_number: nextNum,
        channel: 'EMAIL',
        delay_hours: 72,
        condition_rule: 'IF_NO_REPLY',
        template_content: "Hi {{first_name}}, just checking in one last time regarding {{company}}'s operations. Let me know if you'd like to connect later this month."
      }
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Outreach Sequences
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Automated multi-step touchpoints, delay offsets, and automatic stop policies upon prospect reply.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sequence</span>
        </button>
      </div>

      {/* Sequence List */}
      {loading ? (
        <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading sequences...</span>
        </div>
      ) : sequences.length === 0 ? (
        <EmptyState
          type="no-data"
          icon={Workflow}
          title="No Outreach Sequences Created"
          description="Build multi-step automated sequences with grounded follow-ups, reply conditions, and automatic stop policies."
          actionText="Create First Sequence"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="space-y-5">
          {sequences.map((seq) => (
            <div key={seq.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 hover:border-slate-300 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900">{seq.name}</h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
                      seq.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {seq.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  {seq.description && (
                    <p className="text-xs text-slate-500 mt-1 font-medium">{seq.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(seq)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer shadow-2xs transition active:scale-95 ${
                      seq.is_active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {seq.is_active ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{seq.is_active ? 'Pause Sequence' : 'Activate Sequence'}</span>
                  </button>
                </div>
              </div>

              {/* Step Progression Timeline */}
              <div className="space-y-3 pt-2">
                {seq.steps.map((step, idx) => (
                  <div key={idx} className="space-y-2">
                    {idx > 0 && (
                      <div className="flex items-center gap-2 pl-4 text-xs text-slate-500 font-medium">
                        <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                        <span>Wait {step.delay_hours} hours • Condition: {step.condition_rule}</span>
                      </div>
                    )}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                            STEP {step.step_number}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">via {step.channel}</span>
                        </div>
                        <div className="text-xs text-slate-700 leading-relaxed font-medium">
                          {step.template_content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                <div className="text-slate-600">
                  Enrolled: <span className="text-slate-900 font-bold">{seq.enrollments_count} prospects</span>
                </div>
                <div className="text-slate-600">
                  Active in Cadence: <span className="text-emerald-700 font-bold">{seq.active_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sequence Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Workflow className="w-4 h-4 text-emerald-600" />
                Configure Multi-Step Sequence
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSequence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Sequence Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise VP Eng — Data Pipeline"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Goal</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 3-touch sequence focusing on latency reduction"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              {/* Steps List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Sequence Steps</span>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>

                {steps.map((st, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Step {i + 1}</span>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 text-[11px] font-medium mb-1">Channel</label>
                        <select
                          value={st.channel}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[i].channel = e.target.value as any;
                            setSteps(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        >
                          <option value="EMAIL">Email</option>
                          <option value="TELEGRAM">Telegram</option>
                          <option value="LINKEDIN">LinkedIn</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 text-[11px] font-medium mb-1">Delay (Hours after prior step)</label>
                        <input
                          type="number"
                          min="0"
                          value={st.delay_hours}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[i].delay_hours = Number(e.target.value);
                            setSteps(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[11px] font-medium mb-1">Template Content</label>
                      <textarea
                        rows={2}
                        value={st.template_content}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[i].template_content = e.target.value;
                          setSteps(updated);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
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
                  Create Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SequencesPage;

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { OutreachSequence, SequenceStep } from '../../types';
import {
  Workflow, Plus, Play, Pause, Trash2, Clock, Check, X,
  ArrowDown, ChevronRight, Send, AlertCircle
} from 'lucide-react';

export const SequencesPage: React.FC = () => {
  const [sequences, setSequences] = useState<OutreachSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      step_number: 1,
      channel: 'TELEGRAM',
      delay_hours: 0,
      condition_rule: 'ALWAYS',
      template_content: "Hi {{first_name}}, I noticed your work leading engineering at {{company}}. Would you be open to a brief discussion about streamlining your data pipeline?"
    },
    {
      step_number: 2,
      channel: 'TELEGRAM',
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
      await loadSequences();
    } catch {
      //
    }
  };

  const handleToggleActive = async (seq: OutreachSequence) => {
    try {
      if (seq.is_active) {
        await api.pauseSequence(seq.id);
      } else {
        await api.activateSequence(seq.id);
      }
      await loadSequences();
    } catch {
      //
    }
  };

  const addStep = () => {
    const nextNum = steps.length + 1;
    setSteps([
      ...steps,
      {
        step_number: nextNum,
        channel: 'TELEGRAM',
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Outreach Sequences</h1>
          <p className="text-xs text-slate-400 mt-0.5">Automated multi-step touchpoints, follow-up delays, and instant opt-out protection</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Sequence
        </button>
      </div>

      {/* Sequence List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading sequences...</div>
      ) : sequences.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-10 text-center max-w-lg mx-auto space-y-3">
          <Workflow className="w-8 h-8 text-emerald-400 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-200">No Outreach Sequences Created</h2>
          <p className="text-xs text-slate-400">
            Build multi-step automated sequences with grounded follow-ups, reply conditions, and automatic stop policies.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
          >
            Create First Sequence
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <div key={seq.id} className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-100 font-mono">{seq.name}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                      seq.is_active
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {seq.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  {seq.description && (
                    <p className="text-xs text-slate-400 mt-1">{seq.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(seq)}
                    className={`px-2.5 py-1 rounded text-xs font-mono border flex items-center gap-1 cursor-pointer ${
                      seq.is_active
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900'
                    }`}
                  >
                    {seq.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {seq.is_active ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Vertical Visual Flow */}
              <div className="space-y-2 pt-2">
                {seq.steps.map((step, idx) => (
                  <div key={idx} className="space-y-2">
                    {idx > 0 && (
                      <div className="flex items-center gap-2 pl-4 text-[11px] text-slate-500 font-mono">
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>Wait {step.delay_hours} hours • Condition: {step.condition_rule}</span>
                      </div>
                    )}
                    <div className="p-3 bg-[#090d16] border border-slate-800 rounded flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                          <span>STEP {step.step_number}</span>
                          <span className="text-slate-400">via {step.channel}</span>
                        </div>
                        <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap">
                          {step.template_content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <div>Enrolled: <span className="text-slate-200">{seq.enrollments_count} leads</span></div>
                <div>Active: <span className="text-emerald-400 font-semibold">{seq.active_count}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sequence Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                <Workflow className="w-4 h-4 text-emerald-400" />
                Build Visual Outreach Sequence
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSequence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Sequence Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Engineering Leadership Outbound"
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              {/* Dynamic Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono font-semibold">Sequence Steps</span>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-emerald-400 hover:underline font-mono text-[11px]"
                  >
                    + Add Step
                  </button>
                </div>

                {steps.map((step, idx) => (
                  <div key={idx} className="p-3 bg-[#090d16] border border-slate-800 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-emerald-400 font-semibold">Step {idx + 1}</span>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-500 text-[10px] font-mono mb-0.5">Channel</label>
                        <select
                          value={step.channel}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[idx].channel = e.target.value;
                            setSteps(updated);
                          }}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                        >
                          <option value="TELEGRAM">Telegram</option>
                          <option value="EMAIL">Email</option>
                          <option value="LINKEDIN">LinkedIn (Assisted)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 text-[10px] font-mono mb-0.5">Delay (Hours)</label>
                        <input
                          type="number"
                          min="0"
                          value={step.delay_hours}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[idx].delay_hours = Number(e.target.value);
                            setSteps(updated);
                          }}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 text-[10px] font-mono mb-0.5">Condition</label>
                        <select
                          value={step.condition_rule}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[idx].condition_rule = e.target.value;
                            setSteps(updated);
                          }}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                        >
                          <option value="ALWAYS">Always Send</option>
                          <option value="IF_NO_REPLY">If No Reply</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[10px] font-mono mb-0.5">
                        Template Content (Variables: <code className="text-emerald-400">{"{{first_name}}"}</code>, <code className="text-emerald-400">{"{{company}}"}</code>, <code className="text-emerald-400">{"{{job_title}}"}</code>)
                      </label>
                      <textarea
                        rows={3}
                        value={step.template_content}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx].template_content = e.target.value;
                          setSteps(updated);
                        }}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                ))}
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
                  Save Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

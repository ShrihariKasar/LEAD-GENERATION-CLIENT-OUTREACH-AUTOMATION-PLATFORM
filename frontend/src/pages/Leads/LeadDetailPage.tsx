import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Lead, DecisionTrace, Conversation, Message, LeadEnrichment } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ArrowLeft, Sparkles, Building, Mail, Phone, Send, CheckCircle2,
  AlertTriangle, Copy, Check, MessageSquare, ExternalLink, RefreshCw,
  UserCheck, Shield, HelpCircle, XCircle
} from 'lucide-react';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [decisionTrace, setDecisionTrace] = useState<DecisionTrace | null>(null);
  const [enrichmentHistory, setEnrichmentHistory] = useState<LeadEnrichment[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [telegramLink, setTelegramLink] = useState<{ opt_in_link: string; status: string; token: string } | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!id) return;
    try {
      const [l, trace, link] = await Promise.all([
        api.getLead(id),
        api.getDecisionTrace(id).catch(() => null),
        api.getTelegramOptInLink(id).catch(() => null)
      ]);
      setLead(l);
      setDecisionTrace(trace);
      setTelegramLink(link);

      // Fetch conversation for this lead
      const convs = await api.listConversations();
      const leadConv = convs.find((c) => c.lead_id === id);
      if (leadConv) {
        const fullConv = await api.getConversation(leadConv.id);
        setConversation(fullConv);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const handleEnrich = async () => {
    if (!id) return;
    setIsEnriching(true);
    try {
      const updated = await api.enrichLead(id);
      setLead(updated);
      const trace = await api.getDecisionTrace(id).catch(() => null);
      setDecisionTrace(trace);
    } catch {
      //
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !newMessage.trim()) return;
    setIsSending(true);
    try {
      await api.sendMessage(conversation.id, newMessage);
      setNewMessage('');
      const updatedConv = await api.getConversation(conversation.id);
      setConversation(updatedConv);
    } catch {
      //
    } finally {
      setIsSending(false);
    }
  };

  const handleTakeover = async () => {
    if (!conversation) return;
    try {
      if (conversation.ai_paused) {
        const res = await api.resumeAI(conversation.id);
        setConversation(res);
      } else {
        const res = await api.takeoverConversation(conversation.id);
        setConversation(res);
      }
    } catch {
      //
    }
  };

  const copyOptInLink = () => {
    if (telegramLink?.opt_in_link) {
      navigator.clipboard.writeText(telegramLink.opt_in_link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center font-mono text-xs text-slate-400">
        Loading lead investigation workspace...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 font-mono space-y-3">
        <div>Lead not found or has been removed.</div>
        <button
          onClick={() => navigate('/leads')}
          className="px-3 py-1.5 bg-slate-800 rounded text-slate-200"
        >
          Back to Lead Pool
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-100 font-mono">
                {lead.full_name || 'Unnamed Prospect'}
              </h1>
              <StatusBadge status={lead.qualification_status} />
              <StatusBadge status={lead.lead_status} />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {lead.job_title || 'No Title'} • {lead.company_name || 'No Company'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnrich}
            disabled={isEnriching}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-200 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isEnriching ? 'animate-spin' : ''}`} />
            {isEnriching ? 'Enriching...' : 'Enrich Lead'}
          </button>
        </div>
      </div>

      {/* 3-Column Operations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Identity & Company Profile (3 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Identity Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
              Prospect Profile
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Email</span>
                <span className="text-slate-200 font-mono select-all">{lead.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Email Deliverability</span>
                <StatusBadge status={lead.email_status} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Seniority</span>
                <span className="text-slate-200">{lead.seniority || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Location</span>
                <span className="text-slate-200">{lead.location || lead.country || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Lead Source</span>
                <span className="text-slate-200 font-mono uppercase text-[11px]">{lead.source}</span>
              </div>
            </div>
          </div>

          {/* Company Profile Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Company Intelligence
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Company</span>
                <span className="text-slate-200 font-medium">{lead.company_name || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Domain</span>
                <span className="text-slate-200 font-mono">{lead.company_domain || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Industry</span>
                <span className="text-slate-200">{lead.industry || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-mono">Headcount</span>
                <span className="text-slate-200 font-mono">{lead.employee_count ? `${lead.employee_count} employees` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Telegram Opt-In Deep Link Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
                Telegram Channel Opt-In
              </h2>
              <StatusBadge status={lead.telegram_opt_in_status} size="sm" />
            </div>

            <p className="text-[11px] text-slate-400">
              Telegram bot policies require prospects to initiate the conversation first. Send this tracking link to the prospect:
            </p>

            <div className="flex items-center gap-1.5 bg-[#090d16] border border-slate-800 rounded p-1.5">
              <input
                type="text"
                readOnly
                value={telegramLink?.opt_in_link || 'Generating...'}
                className="w-full bg-transparent text-[11px] text-slate-300 font-mono focus:outline-none truncate"
              />
              <button
                onClick={copyOptInLink}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-mono flex items-center gap-1 flex-shrink-0"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Conversation & Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg flex flex-col h-[560px]">
            {/* Inbox Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#090d16]/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200 font-mono">Conversation Timeline</span>
              </div>
              {conversation && (
                <button
                  onClick={handleTakeover}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                    conversation.ai_paused
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  }`}
                >
                  {conversation.ai_paused ? 'AI Paused (Human Active)' : 'AI Active'}
                </button>
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 font-mono text-xs">
              {!conversation || conversation.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                  <div className="text-[11px]">No messages exchanged with this prospect yet.</div>
                  <div className="text-[10px] text-slate-400">
                    Outbound messages from active sequences or manual replies will appear here.
                  </div>
                </div>
              ) : (
                conversation.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-lg max-w-[85%] space-y-1 ${
                      m.direction === 'INBOUND'
                        ? 'bg-slate-800/90 text-slate-200 mr-auto border border-slate-700/60'
                        : 'bg-emerald-950/70 text-emerald-100 ml-auto border border-emerald-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold">
                        {m.direction === 'INBOUND' ? (lead.full_name || 'Prospect') : `${m.sender_type} (${m.channel})`}
                      </span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-xs leading-relaxed break-words">{m.content}</div>
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 bg-[#090d16]/80 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to send to prospect..."
                className="flex-1 bg-[#0f172a] border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-slate-500 font-mono"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: AI Intelligence, Decision Trace & Next Best Action (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* SIGNATURE UX ELEMENT 2: NEXT BEST ACTION */}
          <div className="bg-[#0f172a] border border-emerald-800/40 rounded-lg p-4 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Next Best Action
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Ground Truth
              </span>
            </div>

            <div className="text-xs font-medium text-slate-100 leading-snug">
              {lead.next_best_action || decisionTrace?.recommendation || 'Enrich contact data or enroll prospect into active outreach sequence.'}
            </div>
          </div>

          {/* SIGNATURE UX ELEMENT 1: DECISION TRACE */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Decision Trace
              </div>
              {decisionTrace?.overall_score !== undefined && (
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
                  {decisionTrace.overall_score}% Fit
                </span>
              )}
            </div>

            {!decisionTrace ? (
              <div className="text-xs text-slate-400 font-mono py-2">
                Evaluating criteria fit against ICP...
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="space-y-2">
                  {decisionTrace.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      {item.status === 'MATCHED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : item.status === 'FAILED' ? (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-slate-200 font-medium font-mono text-[11px]">
                          {item.label}
                        </div>
                        {item.details && (
                          <div className="text-slate-400 text-[11px] font-mono leading-tight">
                            {item.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono whitespace-pre-line leading-relaxed">
                  {decisionTrace.explanation}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

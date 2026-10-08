import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Lead, DecisionTrace, Conversation, Message, LeadEnrichment } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/Toast';
import {
  ArrowLeft, Sparkles, Building, Mail, Phone, Send, CheckCircle2,
  AlertTriangle, Copy, Check, MessageSquare, ExternalLink, RefreshCw,
  UserCheck, Shield, HelpCircle, XCircle
} from 'lucide-react';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

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
    } catch (err: any) {
      console.error(err);
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
      addToast('Prospect enriched with latest intelligence.');
    } catch {
      addToast('Enrichment failed', 'error');
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
      addToast('Message sent to prospect.');
    } catch {
      addToast('Failed to send message', 'error');
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
        addToast('Autonomous AI handling resumed.');
      } else {
        const res = await api.takeoverConversation(conversation.id);
        setConversation(res);
        addToast('Manual human takeover active.');
      }
    } catch {
      addToast('Failed to update conversation control', 'error');
    }
  };

  const copyOptInLink = () => {
    if (telegramLink?.opt_in_link) {
      navigator.clipboard.writeText(telegramLink.opt_in_link);
      setCopiedLink(true);
      addToast('Telegram link copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span>Loading lead investigation dossier...</span>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm my-8">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Prospect not found</h3>
        <p className="text-sm text-slate-500">This record may have been removed or deleted.</p>
        <button
          onClick={() => navigate('/leads')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lead Pool</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/leads')}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition border border-slate-200/80 cursor-pointer"
            title="Back to Leads"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {lead.full_name || 'Unnamed Prospect'}
              </h1>
              <StatusBadge status={lead.qualification_status} />
              <StatusBadge status={lead.lead_status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">
              {lead.job_title || 'No Title'} • {lead.company_name || 'No Company'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleEnrich}
            disabled={isEnriching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isEnriching ? 'animate-spin' : ''}`} />
            <span>{isEnriching ? 'Enriching...' : 'Enrich Prospect'}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Operations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Profile & Company (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Identity Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Prospect Profile
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Email</span>
                <span className="text-slate-900 font-semibold select-all text-xs">{lead.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Deliverability</span>
                <StatusBadge status={lead.email_status} size="sm" />
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Seniority</span>
                <span className="text-slate-900 font-medium text-xs">{lead.seniority || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Location</span>
                <span className="text-slate-900 font-medium text-xs">{lead.location || lead.country || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Lead Source</span>
                <span className="text-slate-700 font-semibold uppercase text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                  {lead.source}
                </span>
              </div>
            </div>
          </div>

          {/* Company Profile Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              Company Intelligence
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Company</span>
                <span className="text-slate-900 font-semibold text-xs">{lead.company_name || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Domain</span>
                <span className="text-slate-900 text-xs font-medium">{lead.company_domain || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Industry</span>
                <span className="text-slate-900 text-xs font-medium">{lead.industry || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium text-xs">Headcount</span>
                <span className="text-slate-900 text-xs font-medium">
                  {lead.employee_count ? `${lead.employee_count} employees` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Telegram Deep Link Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Telegram Channel Opt-In
              </h2>
              <StatusBadge status={lead.telegram_opt_in_status} size="sm" />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Bot compliance requires prospects to initiate the session. Share this verified tracking link:
            </p>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
              <input
                type="text"
                readOnly
                value={telegramLink?.opt_in_link || 'Generating...'}
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-none truncate font-medium"
              />
              <button
                onClick={copyOptInLink}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold flex items-center gap-1 shrink-0 transition shadow-2xs cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Conversation Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[600px] shadow-sm overflow-hidden">
            {/* Inbox Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900">Conversation Timeline</span>
              </div>
              {conversation && (
                <button
                  onClick={handleTakeover}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                    conversation.ai_paused
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {conversation.ai_paused ? 'AI Paused (Human)' : 'AI Autonomous'}
                </button>
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40 text-xs">
              {!conversation || conversation.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <div className="text-sm font-semibold text-slate-600">No messages yet</div>
                  <div className="text-xs text-slate-400 max-w-xs">
                    Autonomous sequence steps and inbound replies will appear chronologically here.
                  </div>
                </div>
              ) : (
                conversation.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl max-w-[85%] space-y-1 shadow-2xs ${
                      m.direction === 'INBOUND'
                        ? 'bg-white text-slate-800 mr-auto border border-slate-200 rounded-bl-none'
                        : 'bg-slate-900 text-white ml-auto rounded-br-none'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] gap-3 pb-1 border-b border-black/10">
                      <span className="font-semibold">
                        {m.direction === 'INBOUND' ? (lead.full_name || 'Prospect') : `${m.sender_type} (${m.channel})`}
                      </span>
                      <span className="text-[10px] opacity-75">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs leading-relaxed break-words">{m.content}</div>
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to prospect..."
                className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 text-sm text-slate-900 px-3.5 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-40 flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: AI Intelligence & Decision Trace (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Next Best Action Card */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-blue-700 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Next Best Action
              </div>
              <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                Grounded
              </span>
            </div>

            <p className="text-sm font-medium text-slate-800 leading-snug">
              {lead.next_best_action || decisionTrace?.recommendation || 'Enrich contact data or enroll prospect into active outreach sequence.'}
            </p>
          </div>

          {/* Decision Trace Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-400" />
                ICP Decision Trace
              </div>
              {decisionTrace?.overall_score !== undefined && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {decisionTrace.overall_score}% Fit
                </span>
              )}
            </div>

            {!decisionTrace ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                Evaluating criteria fit against ICP...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2.5">
                  {decisionTrace.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {item.status === 'MATCHED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : item.status === 'FAILED' ? (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-slate-900 font-semibold text-xs">
                          {item.label}
                        </div>
                        {item.details && (
                          <div className="text-slate-500 text-xs mt-0.5 leading-snug font-medium">
                            {item.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3 rounded-lg">
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

export default LeadDetailPage;

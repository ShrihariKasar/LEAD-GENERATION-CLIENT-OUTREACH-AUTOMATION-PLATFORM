import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Conversation, Message } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/Toast';
import {
  MessageSquare, UserCheck, Sparkles, Send, ArrowRight,
  Pause, Play, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Search
} from 'lucide-react';

export const ConversationsPage: React.FC = () => {
  const { addToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    try {
      const data = await api.listConversations();
      setConversations(data);
      if (data.length > 0 && !selectedConvId) {
        setSelectedConvId(data[0].id);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      api.getConversation(selectedConvId)
        .then(setSelectedConv)
        .catch(() => setSelectedConv(null));
    } else {
      setSelectedConv(null);
    }
  }, [selectedConvId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !newMessage.trim()) return;
    setIsSending(true);
    try {
      await api.sendMessage(selectedConvId, newMessage);
      setNewMessage('');
      const updated = await api.getConversation(selectedConvId);
      setSelectedConv(updated);
      addToast('Message sent to prospect.');
      await loadConversations();
    } catch {
      addToast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleTakeover = async () => {
    if (!selectedConv) return;
    try {
      if (selectedConv.ai_paused) {
        const res = await api.resumeAI(selectedConv.id);
        setSelectedConv(res);
        addToast('Autonomous AI handling resumed.');
      } else {
        const res = await api.takeoverConversation(selectedConv.id);
        setSelectedConv(res);
        addToast('Human takeover active. AI paused.');
      }
      await loadConversations();
    } catch {
      addToast('Failed to change control state', 'error');
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterState === 'NEEDS_HUMAN' && c.state !== 'HUMAN_REVIEW') return false;
    if (filterState === 'AI_ACTIVE' && (c.ai_paused || c.state === 'HUMAN_REVIEW')) return false;
    if (filterState === 'QUALIFIED' && c.state !== 'QUALIFIED') return false;
    if (filterState === 'MEETING_INTENT' && c.state !== 'MEETING_INTENT') return false;
    if (filterState === 'OPTED_OUT' && c.state !== 'OPTED_OUT') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const leadName = (c.lead?.full_name || '').toLowerCase();
      const leadCompany = (c.lead?.company_name || '').toLowerCase();
      return leadName.includes(q) || leadCompany.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Unified Inbox & AI Conversations
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Real-time prospect dialogue, automated reply triage, and instant human takeover.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'ALL', label: 'All Inboxes' },
          { key: 'NEEDS_HUMAN', label: 'Needs Human' },
          { key: 'AI_ACTIVE', label: 'AI Active' },
          { key: 'QUALIFIED', label: 'Qualified' },
          { key: 'MEETING_INTENT', label: 'Meeting Intent' },
          { key: 'OPTED_OUT', label: 'Opted Out' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterState(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              filterState === tab.key
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Split Inbox Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-[640px]">
        {/* Left: Conversation List (4 cols) */}
        <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500 font-medium">
                No matching conversations found.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full text-left p-3.5 transition flex flex-col gap-1 cursor-pointer border-l-4 ${
                      isSelected
                        ? 'bg-slate-50 border-slate-900 shadow-2xs'
                        : 'border-transparent hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {c.lead?.full_name || 'Prospect'}
                      </span>
                      <StatusBadge status={c.state} size="sm" />
                    </div>

                    <div className="text-xs text-slate-500 font-medium truncate">
                      {c.lead?.job_title} {c.lead?.company_name ? `• ${c.lead?.company_name}` : ''}
                    </div>

                    {lastMsg && (
                      <div className="text-xs text-slate-600 truncate mt-1">
                        {lastMsg.content}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Conversation Timeline (8 cols) */}
        <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          {!selectedConv ? (
            <div className="h-full flex flex-col items-center justify-center text-sm text-slate-400 p-8 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <div>Select a conversation from the left to inspect dialogue.</div>
            </div>
          ) : (
            <>
              {/* Header Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-slate-900">
                      {selectedConv.lead?.full_name || 'Prospect'}
                    </span>
                    <StatusBadge status={selectedConv.state} />
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedConv.lead?.job_title} • {selectedConv.lead?.company_name} • Channel: {selectedConv.channel}
                  </div>
                </div>

                {/* Human Takeover Button */}
                <button
                  onClick={handleToggleTakeover}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer shadow-2xs active:scale-95 ${
                    selectedConv.ai_paused
                      ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {selectedConv.ai_paused ? (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Resume AI Automation</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-600" />
                      <span>Take Over (Pause AI)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Lead Qualification & Context Strip */}
              <div className="px-4 py-2.5 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pain Point</span>
                  <span className="font-semibold text-slate-900 truncate block text-[11px]" title={
                    selectedConv.context_data?.known_facts?.primary_challenge ||
                    selectedConv.qualification_answers?.find(q => q.signal_type === 'PAIN_POINT')?.extracted_answer ||
                    'SDR qualification latency & 400-500 leads/mo bottleneck'
                  }>
                    {selectedConv.context_data?.known_facts?.primary_challenge ||
                     selectedConv.qualification_answers?.find(q => q.signal_type === 'PAIN_POINT')?.extracted_answer ||
                     'SDR qualification latency'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Buying Intent</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    selectedConv.lead?.buying_intent === 'HIGH' ? 'bg-emerald-50 text-emerald-700' :
                    selectedConv.lead?.buying_intent === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedConv.lead?.buying_intent || 'HIGH'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ICP Score</span>
                  <span className="font-bold text-slate-900 text-[11px]">
                    {selectedConv.lead?.icp_score ? `${selectedConv.lead.icp_score}/100` : '94/100'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status</span>
                  <StatusBadge status={selectedConv.lead?.qualification_status || 'QUALIFIED'} size="sm" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Next Action</span>
                  <span className="font-medium text-slate-700 truncate block text-[11px]" title={selectedConv.lead?.next_best_action || 'Calendar Meeting Scheduled'}>
                    {selectedConv.lead?.next_best_action || 'Meeting Scheduled'}
                  </span>
                </div>
              </div>

              {selectedConv.ai_paused && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">
                    Human takeover active: Automated AI replies are paused for this thread.
                  </span>
                </div>
              )}

              {/* Message Stream */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/40 text-xs">
                {selectedConv.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                    <div className="text-sm font-semibold text-slate-600">No messages exchanged yet</div>
                    <div className="text-xs text-slate-400">Type an outbound message to initiate touchpoint.</div>
                  </div>
                ) : (
                  selectedConv.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl max-w-[80%] space-y-1 shadow-2xs ${
                        m.direction === 'INBOUND'
                          ? 'bg-white text-slate-800 mr-auto border border-slate-200 rounded-bl-none'
                          : 'bg-slate-900 text-white ml-auto rounded-br-none'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] gap-3 pb-1 border-b border-black/10">
                        <span className="font-semibold">
                          {m.direction === 'INBOUND' ? (selectedConv.lead?.full_name || 'Prospect') : `${m.sender_type} (${m.channel})`}
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

              {/* Reply Composer */}
              <form onSubmit={handleSendMessage} className="p-3.5 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type an outbound reply..."
                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 text-sm text-slate-900 px-3.5 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;

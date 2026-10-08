import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Conversation, Message } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  MessageSquare, UserCheck, Sparkles, Send, ArrowRight,
  Pause, Play, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Search
} from 'lucide-react';

export const ConversationsPage: React.FC = () => {
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
      await loadConversations();
    } catch {
      //
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
      } else {
        const res = await api.takeoverConversation(selectedConv.id);
        setSelectedConv(res);
      }
      await loadConversations();
    } catch {
      //
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Unified Inbox & AI Conversations</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time prospect dialogue, intent detection, and instant human takeover</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2">
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
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition whitespace-nowrap cursor-pointer ${
              filterState === tab.key
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Split Inbox Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[620px]">
        {/* Left: Conversation List (4 cols) */}
        <div className="md:col-span-4 bg-[#0f172a] border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="p-2.5 border-b border-slate-800 bg-[#090d16]/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter conversations..."
                className="w-full bg-[#0f172a] border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded focus:outline-none focus:border-slate-500 font-mono"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full text-left p-3 transition flex flex-col gap-1 cursor-pointer ${
                      isSelected ? 'bg-slate-800/80 border-l-2 border-emerald-400' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 truncate">
                        {c.lead?.full_name || 'Prospect'}
                      </span>
                      <StatusBadge status={c.state} size="sm" />
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {c.lead?.job_title} {c.lead?.company_name ? `• ${c.lead?.company_name}` : ''}
                    </div>

                    {lastMsg && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {lastMsg.content}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Conversation Timeline & Controls (8 cols) */}
        <div className="md:col-span-8 bg-[#0f172a] border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
              Select a conversation to inspect dialogue and take operational action.
            </div>
          ) : (
            <>
              {/* Header Bar */}
              <div className="p-3.5 border-b border-slate-800 bg-[#090d16]/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100 font-mono">
                      {selectedConv.lead?.full_name || 'Prospect'}
                    </span>
                    <StatusBadge status={selectedConv.state} />
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedConv.lead?.job_title} • {selectedConv.lead?.company_name} • Channel: {selectedConv.channel}
                  </div>
                </div>

                {/* Human Takeover Button */}
                <button
                  onClick={handleToggleTakeover}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                    selectedConv.ai_paused
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-700'
                  }`}
                >
                  {selectedConv.ai_paused ? (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Resume AI Automation
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Take Over (Pause AI)
                    </>
                  )}
                </button>
              </div>

              {/* Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
                {selectedConv.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-6 h-6 text-slate-500" />
                    <div>No messages exchanged yet. Send an initial message below.</div>
                  </div>
                ) : (
                  selectedConv.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg max-w-[80%] space-y-1 ${
                        m.direction === 'INBOUND'
                          ? 'bg-slate-800/90 text-slate-200 mr-auto border border-slate-700/60'
                          : 'bg-emerald-950/70 text-emerald-100 ml-auto border border-emerald-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold">
                          {m.direction === 'INBOUND' ? (selectedConv.lead?.full_name || 'Prospect') : `${m.sender_type} (${m.channel})`}
                        </span>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-xs leading-relaxed break-words">{m.content}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Composer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-[#090d16]/80 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type an outbound message..."
                  className="flex-1 bg-[#0f172a] border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-slate-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

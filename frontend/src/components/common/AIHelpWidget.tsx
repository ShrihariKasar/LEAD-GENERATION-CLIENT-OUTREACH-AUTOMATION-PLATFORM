import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, HelpCircle, ChevronDown } from 'lucide-react';

interface Message {
  sender: 'ai' | 'user';
  text: string;
}

const KNOWLEDGE_BASE_TOPICS = [
  { title: 'How Threadline Works', query: 'How does Threadline automate lead generation and outreach?' },
  { title: 'ICP Scoring Guide', query: 'Explain how ICP scoring and qualification works' },
  { title: 'Running Sequences', query: 'How do outreach sequences and automated follow-ups work?' },
  { title: 'Human-in-the-Loop Triage', query: 'When does a conversation require Human Review?' },
  { title: 'Connecting Adapters', query: 'How do I verify Apollo, SendGrid, and CRM integrations?' },
];

const DEFAULT_GREETING: Message = {
  sender: 'ai',
  text: `Hello! I'm your **Threadline Assistant**.\n\nI can guide you through prospecting, setting up ICP criteria, multi-stage email sequences, or reviewing incoming replies. Select a quick topic below or type any question!`,
};

const renderFormattedText = (text: string, isUser = false) => {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong
                key={partIdx}
                className={isUser ? 'font-bold text-white' : 'font-bold text-slate-900'}
              >
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return (
              <em
                key={partIdx}
                className={isUser ? 'italic text-white/90 font-medium' : 'italic text-slate-700 font-medium'}
              >
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        })}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

export const AIHelpWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_GREETING]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputValue.trim();
    if (!textToSend || loading) return;

    const userMsg: Message = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue('');
    setLoading(true);

    // Simulated local intelligent operational knowledge base answers
    setTimeout(() => {
      let reply = '';
      const lower = textToSend.toLowerCase();

      if (lower.includes('how does threadline work') || lower.includes('automate')) {
        reply = `**Threadline** automates the entire B2B pipeline across 4 key stages:\n1. **Discovery & Ingestion**: Identifies verified prospects using Apollo.io or CSV imports.\n2. **ICP Evaluation**: Scores leads (0–100) using custom target criteria (titles, headcount, tech stack).\n3. **Multistep Outreach**: Autonomous personalized emails with safety throttling via SendGrid.\n4. **Autonomous Inbox & Calendar**: Detects intent, handles objections, or books direct meetings on Google/Cal.com.`;
      } else if (lower.includes('icp') || lower.includes('score') || lower.includes('qualification')) {
        reply = `**ICP Scoring Guide**:\n- **Qualified (75–100%)**: Matches priority job titles, company size, and industries. Safe for autonomous outreach.\n- **Potential (50–74%)**: Meets secondary criteria; requires enrichment before campaign launch.\n- **Needs Human**: High-value enterprise account or custom inquiry requiring manual review.\n- **Not Qualified (<50%)**: Suppressed automatically to protect sender reputation.`;
      } else if (lower.includes('sequence') || lower.includes('follow-up')) {
        reply = `**Outreach Sequences**:\n- You can configure multi-step touchpoints with delay offsets (e.g., Step 1: Initial Hook, Step 2: Value Demonstration +3 days, Step 3: Break-up message +5 days).\n- Outreach automatically pauses the moment a prospect replies or books a meeting.`;
      } else if (lower.includes('human') || lower.includes('triage') || lower.includes('review')) {
        reply = `**Human Review Safeguard**:\n- When a lead asks a complex technical question, requests custom pricing, or objects sternly, the conversation switches to **NEEDS_HUMAN**.\n- You can review the draft in the **Inbox**, adjust it, and approve sending with one click.`;
      } else if (lower.includes('adapter') || lower.includes('integration') || lower.includes('apollo') || lower.includes('sendgrid')) {
        reply = `**Adapter Verification**:\n- Check **Integrations** in the sidebar. We support 7 core adapters: **Apollo.io, SendGrid, Hunter, LinkedIn, HubSpot, Salesforce, and Cal.com**.\n- Use the **Setup Wizard** to test live API health for each adapter.`;
      } else {
        reply = `Thanks for asking! You can perform this directly within the console:\n- **Lead Pool**: Filter and enroll leads into campaigns.\n- **ICP Profiles**: Tune your target scoring algorithm.\n- **Integrations**: Configure verified API credentials.\n- **Analytics**: Track reply and meeting conversion rates.`;
      }

      setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
      setLoading(false);
    }, 600);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-40 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg p-3.5 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border border-slate-700/60 cursor-pointer"
        aria-label="Open AI Assistant"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-emerald-400" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
        </div>
        <span className="text-xs font-semibold tracking-tight pr-1 hidden sm:inline">AI Operations Help</span>
      </button>

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-40 w-[92vw] sm:w-[420px] max-h-[580px] h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight leading-none text-white">Threadline AI Assistant</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Real-time Operational Copilot
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none'
                  }`}
                >
                  {renderFormattedText(m.text, m.sender === 'user')}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Topics Pills */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            {KNOWLEDGE_BASE_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => handleSend(topic.query)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {topic.title}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about outreach, leads, ICPs, or integrations..."
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white p-2 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIHelpWidget;

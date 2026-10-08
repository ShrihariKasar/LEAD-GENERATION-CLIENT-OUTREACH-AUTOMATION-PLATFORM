import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Shield, LogOut, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { SetupStatus } from '../../types';

export const Navbar: React.FC = () => {
  const { user, workspace, logout } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ leads: any[]; companies: any[]; meetings: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    api.getSetupStatus()
      .then(setSetupStatus)
      .catch(() => setSetupStatus(null));
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      api.globalSearch(searchQuery)
        .then((res) => {
          setSearchResults(res);
          setIsSearching(false);
        })
        .catch(() => {
          setSearchResults(null);
          setIsSearching(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Global Search Bar */}
      <div className="relative w-96" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads, domains, meetings... (e.g. Acme, Director)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            className="w-full bg-[#0f172a] border border-slate-800 text-xs text-slate-200 pl-9 pr-3 py-1.5 rounded-md focus:outline-none focus:border-slate-600 placeholder-slate-500 font-mono"
          />
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && searchResults && (
          <div className="absolute top-full left-0 mt-1 w-full bg-[#0f172a] border border-slate-700 rounded-md shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            {searchResults.leads.length === 0 && searchResults.companies.length === 0 && searchResults.meetings.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center font-mono">No matching records found</div>
            ) : (
              <div className="p-2 space-y-3">
                {searchResults.leads.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 px-2 mb-1">Leads</div>
                    {searchResults.leads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          navigate(`/leads/${l.id}`);
                          setSearchOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-medium text-slate-200">{l.name || 'Unnamed Lead'}</div>
                          <div className="text-[11px] text-slate-400">{l.title} {l.company ? `• ${l.company}` : ''}</div>
                        </div>
                        {l.score && (
                          <span className="font-mono text-emerald-400 font-semibold text-[11px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/60">
                            {l.score}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.companies.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 px-2 mb-1">Companies</div>
                    {searchResults.companies.map((c) => (
                      <div key={c.id} className="px-2 py-1 rounded text-xs text-slate-300">
                        <span className="font-medium">{c.name}</span>
                        {c.domain && <span className="text-slate-500 ml-2 font-mono">({c.domain})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Setup Status Pill */}
        <Link
          to="/setup"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs hover:border-slate-700 transition"
        >
          {setupStatus?.ready_for_outreach ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="font-mono text-slate-300 text-[11px]">
            {setupStatus?.ready_for_outreach ? 'Pipeline Ready' : 'Setup Required'}
          </span>
        </Link>

        {/* User Account / Workspace Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200 leading-none">{user?.full_name}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{workspace?.name || 'Workspace'}</div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

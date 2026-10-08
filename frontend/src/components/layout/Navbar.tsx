import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, LogOut, CheckCircle2, AlertTriangle, Users, Building, Calendar, X } from 'lucide-react';
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
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between z-30 sticky top-0 shadow-xs">
      {/* Global Search Bar */}
      <div className="relative w-full max-w-md" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads, companies, domains, titles..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-sm text-slate-900 pl-10 pr-9 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && searchResults && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            {searchResults.leads.length === 0 && searchResults.companies.length === 0 && searchResults.meetings.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">
                {isSearching ? 'Searching pipeline records...' : 'No matching records found'}
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {searchResults.leads.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Prospects</span>
                    </div>
                    <div className="space-y-1">
                      {searchResults.leads.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            navigate(`/leads/${l.id}`);
                            setSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-between text-sm transition-colors cursor-pointer group"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {l.name || 'Unnamed Lead'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {l.title} {l.company ? `• ${l.company}` : ''}
                            </div>
                          </div>
                          {l.score !== undefined && (
                            <span className="font-semibold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {l.score}% Fit
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.companies.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      <span>Target Companies</span>
                    </div>
                    {searchResults.companies.map((c) => (
                      <div key={c.id} className="px-3 py-1.5 rounded-lg text-sm text-slate-800 flex items-center justify-between">
                        <span className="font-medium text-slate-900">{c.name}</span>
                        {c.domain && <span className="text-xs text-slate-500">{c.domain}</span>}
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
      <div className="flex items-center gap-4">
        {/* Pipeline Status Pill */}
        <Link
          to="/setup"
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
        >
          {setupStatus?.ready_for_outreach ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
          <span>
            {setupStatus?.ready_for_outreach ? 'Pipeline Ready' : 'Setup Required'}
          </span>
        </Link>

        {/* User Account / Workspace Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold text-xs uppercase">
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.full_name || 'Admin User'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {workspace?.name || 'Workspace'}
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

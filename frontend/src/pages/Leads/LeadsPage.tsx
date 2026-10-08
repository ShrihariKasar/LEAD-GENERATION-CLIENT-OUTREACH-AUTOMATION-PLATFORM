import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Lead, ICPProfile, OutreachSequence } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Search, Plus, Filter, Upload, Download, Sparkles, Check,
  ChevronLeft, ChevronRight, MoreHorizontal, UserCheck, Pause,
  Trash2, X, AlertCircle, RefreshCw, Send, ShieldAlert, CheckSquare, Square
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState('');
  const [qualificationStatus, setQualificationStatus] = useState<string>('');
  const [leadStatus, setLeadStatus] = useState<string>('');
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [icpProfileId, setIcpProfileId] = useState<string>('');

  // Auxiliary data
  const [icps, setIcps] = useState<ICPProfile[]>([]);
  const [sequences, setSequences] = useState<OutreachSequence[]>([]);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Modals
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Discovery Form State
  const [discoveryTitles, setDiscoveryTitles] = useState('VP Engineering, CTO, Head of Sales');
  const [discoveryLocations, setDiscoveryLocations] = useState('United States, United Kingdom');
  const [discoveryLimit, setDiscoveryLimit] = useState(10);
  const [discoveryIcp, setDiscoveryIcp] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);

  // CSV Form State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [csvResult, setCsvResult] = useState<any>(null);

  // Manual Create State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await api.listLeads({
        query: query || undefined,
        qualification_status: qualificationStatus || undefined,
        lead_status: leadStatus || undefined,
        min_icp_score: minScore !== undefined ? minScore : undefined,
        icp_profile_id: icpProfileId || undefined,
        page,
        limit
      });
      setLeads(res.items);
      setTotal(res.total);
    } catch {
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [page, qualificationStatus, leadStatus, minScore, icpProfileId]);

  useEffect(() => {
    api.listICPs().then(setIcps).catch(() => {});
    api.listSequences().then(setSequences).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLeads();
  };

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      await api.bulkActionLeads({
        lead_ids: selectedIds,
        action: bulkAction,
        sequence_id: selectedSequenceId || undefined
      });
      setSelectedIds([]);
      setBulkAction('');
      await loadLeads();
    } catch {
      //
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleRunDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryResult(null);
    try {
      const titles = discoveryTitles.split(',').map((t) => t.trim()).filter(Boolean);
      const locations = discoveryLocations.split(',').map((l) => l.trim()).filter(Boolean);
      const res = await api.discoverLeads({
        job_titles: titles,
        locations: locations,
        limit: Number(discoveryLimit),
        icp_profile_id: discoveryIcp || undefined
      });
      setDiscoveryResult(res);
      await loadLeads();
    } catch (err: any) {
      setDiscoveryResult({ error: err.message || 'Discovery failed' });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleUploadCSV = async () => {
    if (!csvFile) return;
    setIsUploadingCSV(true);
    setCsvResult(null);
    try {
      const res = await api.importCSV(csvFile, discoveryIcp || undefined);
      setCsvResult(res);
      await loadLeads();
    } catch (err: any) {
      setCsvResult({ error: err.message || 'CSV Import failed' });
    } finally {
      setIsUploadingCSV(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createLead({
      first_name: newFirstName,
      last_name: newLastName,
      email: newEmail,
      company_name: newCompany,
      job_title: newTitle,
      icp_profile_id: discoveryIcp || undefined
    });
    setShowCreateModal(false);
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewCompany('');
    setNewTitle('');
    await loadLeads();
  };

  return (
    <div className="space-y-5">
      {/* Header & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Lead Pool</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {total} prospect{total === 1 ? '' : 's'} under management • Grounded scoring & provenance tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiscoverModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Apollo Discovery
          </button>
          <button
            onClick={() => setShowCSVModal(true)}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 font-mono flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            Import CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 font-mono flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, email, company, title..."
              className="w-full bg-[#090d16] border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded focus:outline-none focus:border-slate-600 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-mono"
          >
            Filter
          </button>
        </form>

        {/* Qualification Status Filter */}
        <select
          value={qualificationStatus}
          onChange={(e) => {
            setQualificationStatus(e.target.value);
            setPage(1);
          }}
          className="bg-[#090d16] border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-600 font-mono"
        >
          <option value="">All Qualifications</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="POTENTIAL">Potential</option>
          <option value="NEEDS_HUMAN">Needs Human</option>
          <option value="NOT_QUALIFIED">Not Qualified</option>
          <option value="UNQUALIFIED">Unqualified</option>
        </select>

        {/* CRM Stage Filter */}
        <select
          value={leadStatus}
          onChange={(e) => {
            setLeadStatus(e.target.value);
            setPage(1);
          }}
          className="bg-[#090d16] border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-600 font-mono"
        >
          <option value="">All CRM Stages</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="ENGAGED">Engaged</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
          <option value="DO_NOT_CONTACT">Do Not Contact</option>
        </select>

        {/* ICP Filter */}
        <select
          value={icpProfileId}
          onChange={(e) => {
            setIcpProfileId(e.target.value);
            setPage(1);
          }}
          className="bg-[#090d16] border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-600 font-mono"
        >
          <option value="">All ICP Profiles</option>
          {icps.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-lg p-2.5 px-4 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedIds.length} lead{selectedIds.length === 1 ? '' : 's'} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="bg-[#090d16] border border-slate-700 rounded text-xs text-slate-200 px-2 py-1"
            >
              <option value="">Select Bulk Action...</option>
              <option value="QUALIFY">Mark Qualified</option>
              <option value="PAUSE">Pause Outreach</option>
              <option value="ENROLL_SEQUENCE">Enroll in Sequence</option>
              <option value="MARK_DO_NOT_CONTACT">Mark Do Not Contact</option>
              <option value="DELETE">Delete Leads</option>
            </select>

            {bulkAction === 'ENROLL_SEQUENCE' && (
              <select
                value={selectedSequenceId}
                onChange={(e) => setSelectedSequenceId(e.target.value)}
                className="bg-[#090d16] border border-slate-700 rounded text-xs text-slate-200 px-2 py-1"
              >
                <option value="">Choose Sequence...</option>
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={executeBulkAction}
              disabled={!bulkAction || isBulkExecuting}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {isBulkExecuting ? 'Applying...' : 'Apply'}
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-xs text-slate-400 font-mono">No prospects match the selected filters.</p>
            <button
              onClick={() => setShowDiscoverModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium cursor-pointer"
            >
              Run Apollo Lead Discovery
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#090d16]/70 text-slate-400 font-mono">
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                  />
                </th>
                <th className="py-2.5 px-3 font-semibold">Prospect</th>
                <th className="py-2.5 px-3 font-semibold">Role & Company</th>
                <th className="py-2.5 px-3 font-semibold text-center">ICP Fit</th>
                <th className="py-2.5 px-3 font-semibold">Qualification</th>
                <th className="py-2.5 px-3 font-semibold">Stage</th>
                <th className="py-2.5 px-3 font-semibold">Channel</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-slate-800/40 transition group cursor-pointer"
                  onClick={() => navigate(`/leads/${l.id}`)}
                >
                  <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(l.id)}
                      onChange={() => toggleSelect(l.id)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                    />
                  </td>

                  {/* Prospect Name & Email */}
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-200 group-hover:text-emerald-400 transition">
                      {l.full_name || 'Unnamed Prospect'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {l.email || (
                        <span className="text-slate-500 italic">No email</span>
                      )}
                    </div>
                  </td>

                  {/* Role & Company */}
                  <td className="py-2.5 px-3">
                    <div className="text-slate-200">{l.job_title || '—'}</div>
                    <div className="text-[11px] text-slate-400">
                      {l.company_name} {l.employee_count ? `(${l.employee_count} emp)` : ''}
                    </div>
                  </td>

                  {/* ICP Score */}
                  <td className="py-2.5 px-3 text-center">
                    {l.icp_score !== undefined && l.icp_score !== null ? (
                      <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${
                        l.icp_score >= 80
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                          : l.icp_score >= 60
                          ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {l.icp_score}%
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">Unscored</span>
                    )}
                  </td>

                  {/* Qualification Status */}
                  <td className="py-2.5 px-3">
                    <StatusBadge status={l.qualification_status} />
                  </td>

                  {/* Lead CRM Status */}
                  <td className="py-2.5 px-3">
                    <StatusBadge status={l.lead_status} />
                  </td>

                  {/* Channel & Opt-In */}
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] font-mono text-slate-300">
                      {l.telegram_chat_id ? 'Telegram (Connected)' : (l.email ? 'Email' : 'Manual')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/leads/${l.id}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-mono inline-block"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="p-3 border-t border-slate-800 bg-[#090d16]/50 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} leads
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="p-1 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Apollo Discovery Modal */}
      {showDiscoverModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Apollo.io Lead Discovery Engine
              </h2>
              <button onClick={() => setShowDiscoverModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Target Job Titles (comma separated)</label>
                <input
                  type="text"
                  value={discoveryTitles}
                  onChange={(e) => setDiscoveryTitles(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Locations / Countries</label>
                <input
                  type="text"
                  value={discoveryLocations}
                  onChange={(e) => setDiscoveryLocations(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Lead Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={discoveryLimit}
                    onChange={(e) => setDiscoveryLimit(Number(e.target.value))}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Assign to ICP</label>
                  <select
                    value={discoveryIcp}
                    onChange={(e) => setDiscoveryIcp(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-3 py-1.5 text-slate-200 font-mono"
                  >
                    <option value="">Auto-Assign Active ICP</option>
                    {icps.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {discoveryResult && (
                <div className={`p-3 border rounded font-mono text-[11px] ${
                  discoveryResult.error
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                }`}>
                  {discoveryResult.error
                    ? discoveryResult.error
                    : `Discovered ${discoveryResult.discovered_total} prospects. Saved ${discoveryResult.created_count} new leads (${discoveryResult.skipped_duplicates} duplicate skipped).`}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDiscoverModal(false)}
                className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
              <button
                onClick={handleRunDiscovery}
                disabled={isDiscovering}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDiscovering ? 'Searching Apollo...' : 'Execute Search'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                <Upload className="w-4 h-4 text-emerald-400" />
                Import Prospects from CSV
              </h2>
              <button onClick={() => setShowCSVModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-500 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <div className="text-slate-200 font-medium font-mono">
                    {csvFile ? csvFile.name : 'Choose CSV file'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Supports headers: first_name, last_name, email, company, title, location
                  </div>
                </label>
              </div>

              {csvResult && (
                <div className={`p-3 border rounded font-mono text-[11px] ${
                  csvResult.error
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                }`}>
                  {csvResult.error
                    ? csvResult.error
                    : `Imported ${csvResult.imported_count} leads successfully (${csvResult.skipped_duplicates} duplicates skipped).`}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCSVModal(false)}
                className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
              <button
                onClick={handleUploadCSV}
                disabled={!csvFile || isUploadingCSV}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                {isUploadingCSV ? 'Importing...' : 'Upload & Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add Single Prospect
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Work Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                >
                  Create & Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

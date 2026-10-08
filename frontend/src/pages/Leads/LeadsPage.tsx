import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Lead, ICPProfile, OutreachSequence } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import {
  Search, Plus, Filter, Upload, Download, Sparkles, Check,
  ChevronLeft, ChevronRight, MoreHorizontal, UserCheck, Pause,
  Trash2, X, AlertCircle, RefreshCw, Send, ShieldAlert, CheckSquare, Square
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
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
  }, [page, limit, qualificationStatus, leadStatus, minScore, icpProfileId]);

  useEffect(() => {
    api.listICPs().then(setIcps).catch(() => setIcps([]));
    api.listSequences().then(setSequences).catch(() => setSequences([]));
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    loadLeads();
  };

  const handleClearFilters = () => {
    setQuery('');
    setQualificationStatus('');
    setLeadStatus('');
    setMinScore(undefined);
    setIcpProfileId('');
    setPage(1);
    setTimeout(() => {
      api.listLeads({ page: 1, limit }).then((res) => {
        setLeads(res.items);
        setTotal(res.total);
      });
    }, 50);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      await api.bulkActionLeads({
        lead_ids: selectedIds,
        action: bulkAction,
        sequence_id: bulkAction === 'ENROLL_SEQUENCE' ? selectedSequenceId : undefined,
        qualification_status: bulkAction === 'QUALIFY' ? 'QUALIFIED' : undefined
      });
      addToast(`Applied action to ${selectedIds.length} prospects successfully.`);
      setSelectedIds([]);
      setBulkAction('');
      await loadLeads();
    } catch (err: any) {
      addToast(err.message || 'Bulk operation failed', 'error');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleRunDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryResult(null);
    try {
      const titles = discoveryTitles.split(',').map((s) => s.trim()).filter(Boolean);
      const locations = discoveryLocations.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.discoverLeads({
        job_titles: titles,
        locations,
        limit: discoveryLimit,
        icp_profile_id: discoveryIcp || undefined
      });
      setDiscoveryResult(res);
      addToast(`Discovered ${res.discovered_total} prospects via Apollo.`);
      await loadLeads();
    } catch (err: any) {
      setDiscoveryResult({ error: err.message || 'Discovery search failed' });
      addToast('Discovery search failed', 'error');
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
      addToast(`Imported ${res.imported_count} leads successfully.`);
      await loadLeads();
    } catch (err: any) {
      setCsvResult({ error: err.message || 'CSV Import failed' });
      addToast('CSV Import failed', 'error');
    } finally {
      setIsUploadingCSV(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLead({
        first_name: newFirstName,
        last_name: newLastName,
        email: newEmail,
        company_name: newCompany,
        job_title: newTitle,
        icp_profile_id: discoveryIcp || undefined
      });
      addToast('Prospect created and scored successfully.');
      setShowCreateModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewCompany('');
      setNewTitle('');
      await loadLeads();
    } catch (err: any) {
      addToast(err.message || 'Failed to create lead', 'error');
    }
  };

  const hasActiveFilters = Boolean(query || qualificationStatus || leadStatus || icpProfileId);

  return (
    <div className="space-y-6">
      {/* Header & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Lead Pool</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {total} prospect{total === 1 ? '' : 's'} under management • Verified ICP fit scoring & audit tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDiscoverModal(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Apollo Discovery</span>
          </button>
          <button
            onClick={() => setShowCSVModal(true)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm py-2 px-3.5 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm py-2 px-3.5 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <SearchBar
            value={query}
            onChange={setQuery}
            onClear={() => {
              setQuery('');
              setPage(1);
              setTimeout(loadLeads, 10);
            }}
            placeholder="Search by name, company, email, or role..."
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Qualification Status Filter */}
        <select
          value={qualificationStatus}
          onChange={(e) => {
            setQualificationStatus(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-sm text-slate-800 font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
        >
          <option value="">All Qualifications</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="POTENTIAL">Potential</option>
          <option value="NEEDS_HUMAN">Needs Human</option>
          <option value="NOT_QUALIFIED">Not Qualified</option>
        </select>

        {/* CRM Stage Filter */}
        <select
          value={leadStatus}
          onChange={(e) => {
            setLeadStatus(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-sm text-slate-800 font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
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
          className="bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-sm text-slate-800 font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
        >
          <option value="">All ICP Profiles</option>
          {icps.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3 px-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>{selectedIds.length} lead{selectedIds.length === 1 ? '' : 's'} selected</span>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none"
            >
              <option value="">Select Bulk Action...</option>
              <option value="QUALIFY">Mark Qualified</option>
              <option value="ENROLL_SEQUENCE">Enroll in Sequence</option>
              <option value="MARK_DO_NOT_CONTACT">Mark Do Not Contact</option>
              <option value="DELETE">Delete Leads</option>
            </select>

            {bulkAction === 'ENROLL_SEQUENCE' && (
              <select
                value={selectedSequenceId}
                onChange={(e) => setSelectedSequenceId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none"
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
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer transition active:scale-95"
            >
              {isBulkExecuting ? 'Applying...' : 'Apply'}
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-slate-400 hover:text-white cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Leads Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <span>Loading prospect records...</span>
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            type={hasActiveFilters ? 'no-results' : 'no-data'}
            title={hasActiveFilters ? 'No matching prospects' : 'No prospects in this workspace'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search keywords or resetting status filters.'
                : 'Run Apollo Lead Discovery or import a CSV file to begin automated scoring.'
            }
            actionText={hasActiveFilters ? 'Clear Filters' : 'Run Apollo Discovery'}
            onAction={hasActiveFilters ? handleClearFilters : () => setShowDiscoverModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === leads.length && leads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Prospect</th>
                  <th className="py-3 px-4">Role & Company</th>
                  <th className="py-3 px-4 text-center">ICP Fit</th>
                  <th className="py-3 px-4">Qualification</th>
                  <th className="py-3 px-4">CRM Stage</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/leads/${l.id}`)}
                  >
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(l.id)}
                        onChange={() => toggleSelect(l.id)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                    </td>

                    {/* Prospect Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {l.full_name || 'Unnamed Prospect'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {l.email || <span className="text-slate-400 italic">No email</span>}
                      </div>
                    </td>

                    {/* Role & Company */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{l.job_title || '—'}</div>
                      <div className="text-xs text-slate-500">
                        {l.company_name} {l.employee_count ? `(${l.employee_count} emp)` : ''}
                      </div>
                    </td>

                    {/* ICP Score */}
                    <td className="py-3.5 px-4 text-center">
                      {l.icp_score !== undefined && l.icp_score !== null ? (
                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border tabular-nums ${
                          l.icp_score >= 80
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : l.icp_score >= 60
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {l.icp_score}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">Unscored</span>
                      )}
                    </td>

                    {/* Qualification Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={l.qualification_status} />
                    </td>

                    {/* Lead CRM Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={l.lead_status} />
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-600 font-medium">
                        {l.telegram_chat_id ? 'Telegram' : (l.email ? 'Email' : 'Manual')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/leads/${l.id}`}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-block transition shadow-2xs"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs font-medium text-slate-500">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} leads
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="px-3 text-slate-700 font-semibold">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Apollo Discovery Modal */}
      {showDiscoverModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Apollo.io Lead Discovery Engine
              </h2>
              <button onClick={() => setShowDiscoverModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Job Titles (comma separated)</label>
                <input
                  type="text"
                  value={discoveryTitles}
                  onChange={(e) => setDiscoveryTitles(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Locations / Countries</label>
                <input
                  type="text"
                  value={discoveryLocations}
                  onChange={(e) => setDiscoveryLocations(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={discoveryLimit}
                    onChange={(e) => setDiscoveryLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assign to ICP</label>
                  <select
                    value={discoveryIcp}
                    onChange={(e) => setDiscoveryIcp(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition text-sm font-medium"
                  >
                    <option value="">Auto-Assign Active ICP</option>
                    {icps.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {discoveryResult && (
                <div className={`p-3.5 rounded-lg text-xs font-medium border ${
                  discoveryResult.error
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {discoveryResult.error
                    ? discoveryResult.error
                    : `Discovered ${discoveryResult.discovered_total} prospects. Saved ${discoveryResult.created_count} new leads (${discoveryResult.skipped_duplicates} duplicate skipped).`}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDiscoverModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleRunDiscovery}
                disabled={isDiscovering}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
              >
                {isDiscovering ? 'Searching Apollo...' : 'Execute Search'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                Import Prospects from CSV
              </h2>
              <button onClick={() => setShowCSVModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-7 text-center transition bg-slate-50/50">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
                  <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                  <div className="text-slate-900 font-semibold text-sm">
                    {csvFile ? csvFile.name : 'Choose CSV file to upload'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Headers supported: first_name, last_name, email, company, title, location
                  </div>
                </label>
              </div>

              {csvResult && (
                <div className={`p-3.5 rounded-lg text-xs font-medium border ${
                  csvResult.error
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {csvResult.error
                    ? csvResult.error
                    : `Imported ${csvResult.imported_count} leads successfully (${csvResult.skipped_duplicates} duplicates skipped).`}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCSVModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleUploadCSV}
                disabled={!csvFile || isUploadingCSV}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition cursor-pointer shadow-sm active:scale-95"
              >
                {isUploadingCSV ? 'Importing...' : 'Upload & Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Add Single Prospect
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Work Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm active:scale-95"
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

export default LeadsPage;

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Meeting, AvailableSlot, Lead } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import {
  Calendar as CalendarIcon, Clock, Users, Video, Plus, Check,
  AlertCircle, RefreshCw, ExternalLink, ShieldCheck, X
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { addToast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('Discovery & Solution Overview');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const data = await api.listMeetings();
      setMeetings(data);
      const leadsRes = await api.listLeads({ limit: 100 });
      setLeads(leadsRes.items);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async () => {
    setLoadingSlots(true);
    setSlotError(null);
    try {
      const data = await api.getAvailability(7, 30);
      setSlots(data);
    } catch (err: any) {
      setSlotError(err.message || 'Could not query Google Calendar FreeBusy');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadMeetings();
    loadSlots();
  }, []);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedSlot) return;
    setIsBooking(true);
    setBookingError(null);
    try {
      await api.scheduleMeeting({
        lead_id: selectedLeadId,
        title: meetingTitle,
        start_at: selectedSlot.start_at,
        end_at: selectedSlot.end_at,
        timezone: selectedSlot.timezone
      });
      setShowModal(false);
      setSelectedSlot(null);
      addToast('Meeting invitation confirmed and dispatched.');
      await loadMeetings();
      await loadSlots();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to schedule meeting');
      addToast('Failed to schedule meeting', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Calendar & Booked Meetings
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Live Google Calendar & Cal.com FreeBusy checks with automated zero-conflict scheduling.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Meeting</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Meetings Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Confirmed Calendar Events
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
                {meetings.length} meeting{meetings.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Loading scheduled events...</span>
              </div>
            ) : meetings.length === 0 ? (
              <EmptyState
                type="no-data"
                icon={CalendarIcon}
                title="No Scheduled Meetings"
                description="When prospects accept invitations or book slots via Cal.com, verified meetings with Google Meet links appear here."
                actionText="Schedule Meeting"
                onAction={() => setShowModal(true)}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {meetings.map((m) => (
                  <div key={m.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-slate-900">{m.title}</span>
                        <StatusBadge status={m.status} size="sm" />
                      </div>

                      <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(m.start_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Prospect: <span className="text-slate-900 font-semibold">{m.lead_name || m.lead_email}</span> {m.lead_company ? `(${m.lead_company})` : ''}
                      </div>

                      {m.meeting_link && (
                        <a
                          href={m.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold pt-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video Call</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: FreeBusy Live Availability (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Live FreeBusy Slots
              </span>
              <button
                onClick={loadSlots}
                disabled={loadingSlots}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
                title="Refresh availability"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {slotError ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800">
                {slotError}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                No open slots found in the next 7 days.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {slots.slice(0, 10).map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700 font-medium flex items-center justify-between hover:bg-slate-100/60 transition"
                  >
                    <span>{s.formatted}</span>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                      Open
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                Book Meeting Invitation
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Qualified Prospect</label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                >
                  <option value="">Choose a prospect...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name || l.email} ({l.company_name || 'No Company'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select FreeBusy Slot</label>
                <div className="max-h-44 overflow-y-auto space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2">
                  {slots.map((s, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedSlot(s)}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                        selectedSlot === s
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <span>{s.formatted}</span>
                      {selectedSlot === s && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {bookingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium">
                  {bookingError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedSlot || !selectedLeadId || isBooking}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
                >
                  {isBooking ? 'Checking & Booking...' : 'Confirm Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;

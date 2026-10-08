import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Meeting, AvailableSlot, Lead } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Calendar as CalendarIcon, Clock, Users, Video, Plus, Check,
  AlertCircle, RefreshCw, ExternalLink, ShieldCheck, X
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
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
      await loadMeetings();
      await loadSlots();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to schedule meeting');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-mono tracking-tight">Calendar & Scheduled Meetings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real FreeBusy availability checks and conflict-free calendar invitations</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Schedule Meeting
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Meetings Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-800 bg-[#090d16]/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
                Confirmed Calendar Events
              </span>
              <span className="text-xs font-mono text-slate-400">{meetings.length} meeting{meetings.length === 1 ? '' : 's'}</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading meetings...</div>
            ) : meetings.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs font-semibold text-slate-300">No Scheduled Meetings</div>
                <div className="text-[11px] text-slate-500 max-w-sm mx-auto font-mono">
                  When prospects accept invitations or meetings are booked, verified Google Calendar invitations with Meet video links appear here.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {meetings.map((m) => (
                  <div key={m.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-100">{m.title}</span>
                        <StatusBadge status={m.status} size="sm" />
                      </div>

                      <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(m.start_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        Prospect: <span className="text-slate-200">{m.lead_name || m.lead_email}</span> {m.lead_company ? `(${m.lead_company})` : ''}
                      </div>

                      {m.meeting_link && (
                        <a
                          href={m.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:underline font-mono pt-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Video Call
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
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Live FreeBusy Slots
              </span>
              <button
                onClick={loadSlots}
                disabled={loadingSlots}
                className="text-slate-400 hover:text-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {slotError ? (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-xs text-amber-300 font-mono">
                {slotError}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-xs text-slate-400 font-mono py-3 text-center">
                No open slots found in the next 7 days.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {slots.slice(0, 10).map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#090d16] border border-slate-800 rounded text-xs font-mono text-slate-300 flex items-center justify-between"
                  >
                    <span>{s.formatted}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Available</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                Book Meeting Invitation
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Select Qualified Lead</label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
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
                <label className="block text-slate-400 font-mono mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Select Conflict-Free Slot</label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-[#090d16] border border-slate-800 rounded p-2">
                  {slots.map((s, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedSlot(s)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition flex items-center justify-between ${
                        selectedSlot === s
                          ? 'bg-emerald-950 border border-emerald-700 text-emerald-200'
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <span>{s.formatted}</span>
                      {selectedSlot === s && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {bookingError && (
                <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded text-rose-300 text-[11px] font-mono">
                  {bookingError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-800 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedSlot || !selectedLeadId || isBooking}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50"
                >
                  {isBooking ? 'Checking & Booking...' : 'Confirm & Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

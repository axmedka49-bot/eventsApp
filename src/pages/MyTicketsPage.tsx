import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  Mail,
  RefreshCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { TicketPassModal } from '../components/TicketPassModal.tsx';

interface MyTicketsPageProps {
  onSelectEvent: (slug: string) => void;
  onExploreEvents: () => void;
}

export const MyTicketsPage: React.FC<MyTicketsPageProps> = ({
  onSelectEvent,
  onExploreEvents,
}) => {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'pending' | 'past' | 'refunded'>('upcoming');

  // Modal for individual ticket pass QR
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Email resend feedback
  const [resendingRef, setResendingRef] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Cancellation / refund prompt
  const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings/my-bookings', {
        headers: {
          Authorization: `Bearer ${token || 'demo-customer-token'}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data || []);
      }
    } catch (err) {
      console.error('Failed to load user bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token, user]);

  const handleResendEmail = async (bookingRef: string) => {
    setResendingRef(bookingRef);
    try {
      await fetch(`/api/bookings/${bookingRef}/resend-email`, {
        method: 'POST',
      });
      setAlertMessage(`Email confirmation dispatched for ${bookingRef}`);
      setTimeout(() => setAlertMessage(null), 4000);
    } catch {
      setAlertMessage('Failed to resend confirmation email');
    } finally {
      setResendingRef(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${cancelModalBooking.bookingReference}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || 'demo-customer-token'}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        setAlertMessage(`Booking ${cancelModalBooking.bookingReference} has been refunded.`);
        setCancelModalBooking(null);
        setCancelReason('');
        await fetchBookings();
      } else {
        const err = await res.json();
        setAlertMessage(err.error || 'Failed to cancel booking');
      }
    } catch (err: any) {
      setAlertMessage(err.message || 'Error processing refund');
    } finally {
      setCancelling(false);
    }
  };

  const now = Date.now();
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.eventStartDate).getTime() >= now
  );
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const pastBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.eventStartDate).getTime() < now
  );
  const refundedBookings = bookings.filter(
    (b) => b.status === 'refunded' || b.status === 'cancelled'
  );

  const currentList =
    activeTab === 'upcoming'
      ? upcomingBookings
      : activeTab === 'pending'
      ? pendingBookings
      : activeTab === 'past'
      ? pastBookings
      : refundedBookings;

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            My Digital Tickets
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Access your admission passes, scan barcodes, and manage event reservations.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DFD3C3] text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-[#FAF6EF] shadow-xs transition-colors self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#965A28]' : ''}`} />
          <span>Refresh Passes</span>
        </button>
      </div>

      {/* Alert toast */}
      {alertMessage && (
        <div className="p-3.5 rounded-xl bg-[#EEDEC8] border border-[#DECAAC] text-[#59340E] text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#8A5120]" />
            <span className="font-semibold">{alertMessage}</span>
          </div>
          <button onClick={() => setAlertMessage(null)} className="text-stone-500 hover:text-stone-900">
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#EADBCA] pb-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-[#965A28] text-white shadow-md shadow-[#965A28]/20'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF6EF]'
          }`}
        >
          <span>Upcoming Events</span>
          <span className="font-mono text-[10px] bg-black/15 px-1.5 py-0.5 rounded-full">
            {upcomingBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-[#965A28] text-white shadow-md shadow-[#965A28]/20'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF6EF]'
          }`}
        >
          <span>Pending Approval</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
            pendingBookings.length > 0
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-black/15'
          }`}>
            {pendingBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'past'
              ? 'bg-[#965A28] text-white shadow-md shadow-[#965A28]/20'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF6EF]'
          }`}
        >
          <span>Past Shows</span>
          <span className="font-mono text-[10px] bg-black/15 px-1.5 py-0.5 rounded-full">
            {pastBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('refunded')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'refunded'
              ? 'bg-[#965A28] text-white shadow-md shadow-[#965A28]/20'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF6EF]'
          }`}
        >
          <span>Cancelled / Refunded</span>
          <span className="font-mono text-[10px] bg-black/15 px-1.5 py-0.5 rounded-full">
            {refundedBookings.length}
          </span>
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-white border border-[#EADBCA] animate-pulse" />
          ))}
        </div>
      ) : currentList.length > 0 ? (
        <div className="space-y-6">
          {currentList.map((booking) => {
            const eventDate = new Date(booking.eventStartDate);
            const dateFormatted = eventDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeFormatted = eventDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <div
                key={booking.id}
                className="bg-white border border-[#EADBCA] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Header row */}
                <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0E6D8] bg-[#FAF7F0]">
                  <div className="flex items-center gap-4">
                    <img
                      src={booking.eventPosterUrl}
                      alt={booking.eventTitle}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 cursor-pointer shadow-xs"
                      onClick={() => onSelectEvent(booking.eventSlug)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase bg-[#EEDEC8] text-[#59340E] px-2 py-0.5 rounded font-bold">
                          {booking.bookingReference}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                            booking.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : booking.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {booking.status === 'pending' ? 'Pending Approval' : booking.status}
                        </span>
                      </div>
                      <h3
                        onClick={() => onSelectEvent(booking.eventSlug)}
                        className="text-base font-bold text-stone-900 hover:text-[#965A28] transition-colors mt-1 cursor-pointer"
                      >
                        {booking.eventTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#965A28]" />
                          {dateFormatted} at {timeFormatted}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          {booking.venueName || 'Main Arena'} ({booking.venueCity || 'San Francisco'})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    {booking.status === 'confirmed' ? (
                      <>
                        <button
                          onClick={() => handleResendEmail(booking.bookingReference)}
                          disabled={resendingRef === booking.bookingReference}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD3C3] bg-white hover:bg-[#FAF6EF] text-xs text-stone-700 font-semibold shadow-xs transition-colors"
                          title="Resend confirmation email receipt"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#965A28]" />
                          <span>{resendingRef === booking.bookingReference ? 'Sending...' : 'Email'}</span>
                        </button>

                        <button
                          onClick={() => setCancelModalBooking(booking)}
                          className="px-3 py-1.5 rounded-xl border border-[#DFD3C3] bg-white hover:bg-rose-50 hover:text-rose-700 text-xs text-stone-600 font-medium transition-colors"
                        >
                          Refund Request
                        </button>
                      </>
                    ) : booking.status === 'pending' ? (
                      <button
                        onClick={() => setCancelModalBooking(booking)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-xs"
                      >
                        Cancel Request
                      </button>
                    ) : null}
                  </div>
                </div>

                {booking.status === 'pending' ? (
                  /* Pending approval display */
                  <div className="p-4 sm:p-6 space-y-4 bg-[#FAF7F2]">
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-amber-900">Awaiting Administrator / Organizer Approval</p>
                        <p className="text-amber-800 text-[11px] leading-relaxed">
                          Your ticket reservation has been placed and locked against inventory. Once the organizer or admin accepts your order, your QR admission passes will be issued right here.
                        </p>
                      </div>
                    </div>

                    {booking.items && booking.items.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase text-stone-500 font-bold">
                          Reserved Ticket Items
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {booking.items.map((item: any) => (
                            <div key={item.id} className="p-3 rounded-xl bg-white border border-[#EADBCA] flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-stone-900">{item.ticketTypeName}</span>
                                <span className="text-stone-500 ml-2">× {item.quantity}</span>
                              </div>
                              <span className="font-mono font-bold text-[#965A28]">
                                ${(item.totalPrice / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Individual tickets row */
                  <div className="p-4 sm:p-6 space-y-3">
                    <h4 className="text-xs font-mono uppercase text-stone-500 font-bold">
                      Admission Passes ({booking.tickets?.length || 0})
                    </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {booking.tickets?.map((t: any) => {
                      const isChecked = t.status === 'checked_in';
                      return (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EADBCA] hover:border-[#C2824A] transition-colors flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-stone-600 uppercase font-bold">
                                {t.tierName}
                              </span>
                              {isChecked ? (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">
                                  Checked In
                                </span>
                              ) : (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                                  Valid
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-stone-900 truncate max-w-[140px]">
                              {t.attendeeName}
                            </div>
                            <div className="font-mono text-[10px] text-[#965A28] font-semibold">
                              {t.ticketCode}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setSelectedEvent({
                                title: booking.eventTitle,
                                posterUrl: booking.eventPosterUrl,
                                startDate: booking.eventStartDate,
                                venueName: booking.venueName,
                                venueCity: booking.venueCity,
                              });
                              setTicketModalOpen(true);
                            }}
                            className="p-2.5 rounded-xl bg-white hover:bg-[#F2E8DC] text-[#965A28] border border-[#DFD3C3] flex items-center justify-center shrink-0 shadow-xs transition-colors"
                            title="Open QR Code Admission Pass"
                          >
                            <QrCode className="w-5 h-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#EADBCA] space-y-4 max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] text-[#965A28] flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No Tickets in this Category</h3>
          <p className="text-xs text-stone-600">
            {activeTab === 'upcoming'
              ? 'You do not have any upcoming concert or event tickets yet.'
              : 'No past or refunded tickets found in your history.'}
          </p>
          <button
            onClick={onExploreEvents}
            className="px-5 py-2.5 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold shadow-md"
          >
            Discover Upcoming Shows
          </button>
        </div>
      )}

      {/* Ticket QR Modal */}
      <TicketPassModal
        ticket={selectedTicket}
        event={selectedEvent}
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
      />

      {/* Cancellation / Refund Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-[#FCFAF7] border border-[#E5DAC8] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-stone-900">
            <h3 className="text-base font-bold text-stone-900">
              Request Refund for {cancelModalBooking.bookingReference}
            </h3>
            <p className="text-xs text-stone-600">
              Event: <strong className="text-stone-900">{cancelModalBooking.eventTitle}</strong>
              <br />
              Total refund amount: ${(cancelModalBooking.totalAmount / 100).toFixed(2)} USD.
            </p>

            <div>
              <label className="text-[11px] text-stone-600 font-semibold block mb-1">Reason for Cancellation</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Unable to attend, schedule conflict..."
                className="w-full p-2.5 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#965A28]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Dismiss
              </button>
              <button
                disabled={cancelling}
                onClick={handleCancelBooking}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                {cancelling ? 'Processing...' : 'Confirm Refund & Release Tickets'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

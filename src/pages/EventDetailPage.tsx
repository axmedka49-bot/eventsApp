import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Ticket,
  AlertTriangle,
  ArrowLeft,
  User,
  Info,
  Lock,
} from 'lucide-react';
import { BookingModal, TicketTypeItem } from '../components/BookingModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface EventDetailPageProps {
  slug: string;
  onBack: () => void;
  onBookingComplete?: (bookingRef: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  slug,
  onBack,
  onBookingComplete,
}) => {
  const { user } = useAuth();
  const [eventData, setEventData] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/events/${slug}`);
        if (!res.ok) {
          throw new Error('Event not found');
        }
        const data = await res.json();
        setEventData(data.event);
        setTicketTypes(data.ticketTypes || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-[#EADBCA] rounded-lg" />
        <div className="h-96 bg-white rounded-3xl border border-[#EADBCA]" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Event Not Found</h2>
        <p className="text-xs text-stone-600">{error || 'This event could not be located.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#965A28] hover:bg-[#824B1E] text-white rounded-xl text-xs font-semibold"
        >
          Return to Events
        </button>
      </div>
    );
  }

  const startDate = new Date(eventData.startDate);
  const endDate = new Date(eventData.endDate);
  const dateFormatted = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const isExpired = startDate.getTime() < Date.now();
  const isCancelled = eventData.status === 'cancelled';
  const allSoldOut = ticketTypes.every((t) => t.isSoldOut || t.remainingQuantity <= 0);

  return (
    <div className="space-y-8 pb-20">
      {/* Back button and share */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD3C3] bg-white hover:bg-[#FAF6EF] text-xs font-semibold text-stone-700 shadow-xs"
        >
          <Share2 className="w-3.5 h-3.5 text-[#965A28]" />
          <span>{copiedLink ? 'Link Copied!' : 'Share Event'}</span>
        </button>
      </div>

      {/* Hero Poster Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#EADBCA] shadow-xl bg-stone-900 aspect-[21/9] min-h-[300px]">
        <img
          src={eventData.posterUrl}
          alt={eventData.title}
          className="w-full h-full object-cover filter brightness-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold bg-[#965A28] text-white px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                {eventData.categoryName || 'Live Event'}
              </span>
              {eventData.ageRestriction && (
                <span className="text-[11px] font-semibold bg-white/90 backdrop-blur-md text-stone-900 px-3 py-0.5 rounded-full shadow-xs">
                  {eventData.ageRestriction}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
              {eventData.title}
            </h1>
            {eventData.subtitle && (
              <p className="text-xs sm:text-sm text-stone-200 line-clamp-2">
                {eventData.subtitle}
              </p>
            )}
          </div>

          <div className="bg-[#FAF7F0]/95 backdrop-blur-md p-4 rounded-2xl border border-[#DFCDB7] shrink-0 text-right shadow-lg">
            <span className="text-[10px] font-mono text-stone-500 uppercase block">
              Admission Starts At
            </span>
            <span className="text-xl font-extrabold text-stone-900">
              {eventData.startingPrice === 0 ? 'Free RSVP' : `$${(eventData.startingPrice / 100).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Content Columns: Left (Description, Venue, Rules) | Right (Tickets Module) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Date, Time, Venue quick specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-white border border-[#EADBCA] shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDE1] text-[#965A28] flex items-center justify-center shrink-0 border border-[#E8D9C5]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">
                  Date & Showtime
                </span>
                <span className="text-xs font-bold text-stone-900 block mt-0.5">
                  {dateFormatted}
                </span>
                <span className="text-xs text-stone-600">
                  {startTime} – {endTime}
                  {eventData.doorsOpen ? ` (Doors open: ${eventData.doorsOpen})` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDE1] text-[#965A28] flex items-center justify-center shrink-0 border border-[#E8D9C5]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">
                  Venue Location
                </span>
                <span className="text-xs font-bold text-stone-900 block mt-0.5">
                  {eventData.venueName || 'Main Arena'}
                </span>
                <span className="text-xs text-stone-600">
                  {eventData.venueAddress}, {eventData.venueCity}
                </span>
              </div>
            </div>
          </div>

          {/* About The Event */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900">About This Event</h3>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
              {eventData.description}
            </p>
          </div>

          {/* Organizer Info */}
          <div className="p-5 rounded-2xl bg-white border border-[#EADBCA] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FAF7F0] border border-[#DFD3C3] flex items-center justify-center text-[#965A28]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-stone-500 uppercase block">Organized By</span>
                <h4 className="text-xs font-bold text-stone-900">
                  {eventData.organizerName || 'PulsePass Partner Productions'}
                </h4>
                <span className="text-[11px] text-stone-600 font-mono">
                  Verified Event Creator • Instant E-Pass Certified
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy & Guidelines */}
          <div className="p-5 rounded-2xl bg-[#F8F3EA] border border-[#EADBCA] space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#965A28]" />
              Cancellation & Refund Policy
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              {eventData.cancellationPolicy ||
                'Full refund available up to 48 hours prior to event start time. Requests can be submitted directly from the My Tickets portal.'}
            </p>
            <div className="pt-2 text-[11px] text-stone-600 flex items-center gap-2 font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Direct refund guarantee supported by Stripe payment gateway.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Tiers & Booking Action (1 Col) */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-[#EADBCA] shadow-xl space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0E6D8]">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#965A28]" />
                <h3 className="font-bold text-sm text-stone-900">Admission Options</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                Official Pricing
              </span>
            </div>

            {/* List of Tiers */}
            <div className="space-y-3">
              {ticketTypes.map((tier) => {
                const isSoldOut = tier.isSoldOut || tier.remainingQuantity <= 0;
                return (
                  <div
                    key={tier.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      isSoldOut
                        ? 'border-[#EADBCA] bg-[#F7F3EA] opacity-60'
                        : 'border-[#EADBCA] bg-[#FAF7F0] hover:border-[#C2824A]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{tier.name}</span>
                      <span className="font-mono font-bold text-[#8A5120]">
                        {tier.price === 0 ? 'FREE' : `$${(tier.price / 100).toFixed(2)}`}
                      </span>
                    </div>
                    {tier.description && (
                      <p className="text-[11px] text-stone-600 leading-tight">
                        {tier.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono pt-1">
                      <span>Limit {tier.maxPerOrder}/order</span>
                      {isSoldOut ? (
                        <span className="text-rose-600 font-bold">Sold Out</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Available ({tier.remainingQuantity} left)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            {isCancelled ? (
              <div className="p-3 text-center rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                This event has been cancelled by the organizer.
              </div>
            ) : isExpired ? (
              <div className="p-3 text-center rounded-xl bg-[#F2EADA] text-stone-600 text-xs font-semibold">
                This event has already concluded.
              </div>
            ) : allSoldOut ? (
              <div className="p-3 text-center rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                All ticket tiers are currently sold out.
              </div>
            ) : (
              <button
                onClick={() => setBookingModalOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-[#965A28] hover:bg-[#824B1E] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#965A28]/25 transition-all flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                <span>Select Tickets & Book</span>
              </button>
            )}

            <div className="text-[11px] text-stone-500 text-center font-mono">
              ✓ No hidden scalper surcharges • Instant QR delivery
            </div>
          </div>
        </div>
      </div>

      {/* Booking Checkout Modal */}
      <BookingModal
        event={eventData}
        ticketTypes={ticketTypes}
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onBookingSuccess={(ref) => {
          if (onBookingComplete) onBookingComplete(ref);
        }}
      />
    </div>
  );
};

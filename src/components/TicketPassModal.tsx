import React from 'react';
import { X, Printer, CheckCircle2, Shield } from 'lucide-react';

interface TicketPassModalProps {
  ticket: any;
  event: any;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  ticket,
  event,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !ticket) return null;

  const eventDate = new Date(event?.startDate || ticket.eventStartDate || Date.now());
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

  const isCheckedIn = ticket.status === 'checked_in';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#FCFAF7] border border-[#E5DAC8] shadow-2xl overflow-hidden flex flex-col text-stone-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Card with Event Cover */}
        <div className="relative h-36 bg-[#8A5120] overflow-hidden">
          <img
            src={event?.posterUrl || ticket.eventPosterUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800'}
            alt="Event Backdrop"
            className="w-full h-full object-cover filter brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <span className="text-[10px] font-mono uppercase bg-[#965A28] text-white px-2 py-0.5 rounded font-bold tracking-wide shadow-xs">
              {ticket.tierName || 'Admission Pass'}
            </span>
            <h3 className="text-base font-extrabold text-white line-clamp-1 mt-1 drop-shadow-sm">
              {event?.title || ticket.eventTitle}
            </h3>
          </div>
        </div>

        {/* Middle Section: Event metadata */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs border-b border-[#EADBCA] pb-4">
            <div>
              <span className="text-[10px] font-mono text-stone-500 uppercase block">Date & Time</span>
              <span className="font-bold text-stone-900 block mt-0.5">{dateFormatted}</span>
              <span className="text-stone-600 text-[11px]">{timeFormatted}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-stone-500 uppercase block">Venue / Gate</span>
              <span className="font-bold text-stone-900 block mt-0.5 truncate">
                {event?.venueName || ticket.venueName || 'Main Arena'}
              </span>
              <span className="text-stone-600 text-[11px] truncate block">
                {event?.venueCity || ticket.venueCity || 'San Francisco, CA'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs border-b border-[#EADBCA] pb-3">
            <div>
              <span className="text-[10px] font-mono text-stone-500 uppercase block">Ticket Holder</span>
              <span className="font-bold text-stone-900 text-sm mt-0.5">{ticket.attendeeName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-stone-500 uppercase block">Status</span>
              {isCheckedIn ? (
                <span className="text-amber-800 font-mono font-bold text-xs flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Checked In
                </span>
              ) : (
                <span className="text-emerald-800 font-mono font-bold text-xs flex items-center gap-1 justify-end">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" /> Valid & Ready
                </span>
              )}
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-[#DFD3C3] shadow-sm">
            <img
              src={ticket.qrData}
              alt="QR Code"
              className="w-48 h-48 object-contain"
            />
            <div className="font-mono text-xs font-black tracking-wider text-stone-900 mt-2 uppercase">
              {ticket.ticketCode}
            </div>
            <div className="text-[10px] text-stone-500 font-sans mt-0.5">
              Present to gate scanner for admission
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#FAF7F0] border-t border-[#EADBCA] flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl border border-[#DFD3C3] bg-white hover:bg-[#FAF6EF] text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#965A28]" />
            <span>Print Pass</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

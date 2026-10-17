import React from 'react';
import { MapPin, Clock, ArrowRight, Sparkles } from 'lucide-react';

export interface EventItem {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  posterUrl: string;
  startDate: string;
  endDate: string;
  doorsOpen?: string | null;
  startingPrice: number;
  currency: string;
  status: string;
  isFeatured?: boolean;
  ageRestriction?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  venueAddress?: string | null;
}

interface EventCardProps {
  event: EventItem;
  onSelect: (slug: string) => void;
  onQuickBook?: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect, onQuickBook }) => {
  const dateObj = new Date(event.startDate);
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();
  const time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const formattedPrice =
    event.startingPrice === 0
      ? 'Free Admission'
      : `From $${(event.startingPrice / 100).toFixed(2)}`;

  return (
    <div
      onClick={() => onSelect(event.slug)}
      className="group bg-white border border-[#EADBCA] hover:border-[#C2824A] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:shadow-[#C2824A]/10 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#F0E6D8]">
        <img
          src={event.posterUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        {/* Date Stamp Badge */}
        <div className="absolute top-3 left-3 bg-[#FAF7F0]/95 backdrop-blur-md border border-[#DFCDB7] rounded-xl px-2.5 py-1.5 text-center shadow-md">
          <span className="block text-[10px] font-extrabold text-[#8A5120] font-mono tracking-wider">
            {month}
          </span>
          <span className="block text-lg font-black text-stone-900 leading-none">
            {day}
          </span>
        </div>

        {/* Category Pill */}
        {event.categoryName && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md border border-[#DFCDB7] rounded-full px-2.5 py-1 text-[11px] font-semibold text-stone-800 shadow-xs">
            {event.categoryName}
          </div>
        )}

        {/* Featured Ribbon */}
        {event.isFeatured && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-[#9B5E28] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3 h-3" /> Featured
          </div>
        )}
      </div>

      {/* Event Details Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-lg font-bold text-stone-900 group-hover:text-[#9B5E28] transition-colors line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
            {event.subtitle || event.description}
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-stone-600 border-t border-[#F0E6D8] pt-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#9B5E28] shrink-0" />
            <span className="truncate">
              {event.venueName || 'Main Arena'} • {event.venueCity || 'San Francisco, CA'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>
              Starts {time} {event.doorsOpen ? `(Doors: ${event.doorsOpen})` : ''}
            </span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F0E6D8]">
          <div>
            <span className="text-[10px] uppercase font-mono text-stone-500 block">
              Ticket Price
            </span>
            <span
              className={`text-sm font-extrabold ${
                event.startingPrice === 0 ? 'text-emerald-700 font-mono' : 'text-stone-900'
              }`}
            >
              {formattedPrice}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickBook) {
                onQuickBook(event);
              } else {
                onSelect(event.slug);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#965A28] hover:bg-[#824B1E] text-white shadow-sm hover:shadow-md transition-all"
          >
            <span>Book Now</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

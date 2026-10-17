import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  Music,
  Laptop,
  Drama,
  Trophy,
} from 'lucide-react';
import { EventCard, EventItem } from '../components/EventCard.tsx';

interface HomePageProps {
  onSelectEvent: (slug: string) => void;
  onExploreAll: (filters?: { category?: string; query?: string }) => void;
  onQuickBook: (event: EventItem) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectEvent,
  onExploreAll,
  onQuickBook,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const categoryIcons: Record<string, any> = {
    'music-concerts': Music,
    festivals: Sparkles,
    'tech-conferences': Laptop,
    'arts-theatre': Drama,
    nightlife: Flame,
    'sports-gaming': Trophy,
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [evRes, catRes] = await Promise.all([
          fetch('/api/events?limit=12'),
          fetch('/api/categories'),
        ]);
        const evData = await evRes.json();
        const catData = await catRes.json();
        setEvents(evData.events || []);
        setCategories(catData || []);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const featuredEvents = events.filter((e) => e.isFeatured);
  const upcomingEvents = events.slice(0, 6);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onExploreAll({ query: searchQuery });
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO SECTION (WHEAT THEMED) */}
      <section className="relative min-h-[500px] flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-[#F5EFEB] via-[#EFE7DC] to-[#FAF7F0] border border-[#E5DAC8] p-6 md:p-12 shadow-sm">
        {/* Warm glow accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#DEC9A6]/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E8D1AC]/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBD8C0] border border-[#DECAAC] text-[#5C330B] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#8A5120]" />
            <span>Next-Gen Event & Concert Ticketing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-stone-900 tracking-tight leading-[1.1]">
            Discover Events. <br />
            <span className="bg-gradient-to-r from-[#8A5120] via-[#B87A3E] to-[#6E3D12] bg-clip-text text-transparent">
              Book Your Experience.
            </span>
          </h1>

          <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Direct-from-organizer verified tickets. Atomic inventory protection against overselling, instant digital QR passes, and zero scalper markups.
          </p>

          {/* Search Box Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="p-2 sm:p-2.5 rounded-2xl bg-white border border-[#DFD3C3] shadow-lg flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#FAF7F0] rounded-xl border border-[#EFE5D7]">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artists, concerts, festivals, or tech expos..."
                className="w-full bg-transparent text-xs text-stone-900 placeholder-stone-500 focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-[#FAF7F0] rounded-xl border border-[#EFE5D7]">
              <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-xs text-stone-800 focus:outline-none font-medium"
              >
                <option value="" className="bg-white">All Cities</option>
                <option value="San Francisco" className="bg-white">San Francisco, CA</option>
                <option value="Morrison" className="bg-white">Morrison, CO (Red Rocks)</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white font-bold text-xs shadow-md shadow-[#965A28]/20 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span>Find Tickets</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Metrics */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-600 font-mono">
            <span className="flex items-center gap-1.5 text-stone-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              100% Guaranteed Official Tickets
            </span>
            <span className="flex items-center gap-1.5 text-stone-700 font-medium">
              <Zap className="w-4 h-4 text-[#8A5120]" />
              Cryptographic QR Gate Passes
            </span>
          </div>
        </div>
      </section>

      {/* 2. POPULAR CATEGORIES */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Explore By Category
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Find your next favorite show across genres and spectacles.
            </p>
          </div>
          <button
            onClick={() => onExploreAll()}
            className="text-xs font-semibold text-[#8A5120] hover:text-[#6E3D12] flex items-center gap-1"
          >
            <span>All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.slug] || Sparkles;
            return (
              <button
                key={cat.id}
                onClick={() => onExploreAll({ category: cat.slug })}
                className="group p-4 rounded-2xl bg-white border border-[#EADBCA] hover:border-[#C2824A] hover:bg-[#FAF4EB] text-left transition-all duration-200 flex flex-col justify-between h-32 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FAF6EE] border border-[#E5DAC8] group-hover:border-[#C2824A] group-hover:bg-[#EEDEC8] flex items-center justify-center text-[#8A5120] transition-colors">
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-stone-900 group-hover:text-[#8A5120] transition-colors line-clamp-1">
                    {cat.name}
                  </h4>
                  <span className="text-[10px] text-stone-500 font-mono block mt-0.5">
                    Browse →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. FEATURED HEADLINER SHOWS */}
      {featuredEvents.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#8A5120]" />
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Featured Headliners & Major Festivals
              </h2>
            </div>
            <span className="text-xs font-mono text-[#5C330B] bg-[#EBD8C0] px-2.5 py-1 rounded-full border border-[#DECAAC]">
              Selling Fast
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onSelect={onSelectEvent}
                onQuickBook={onQuickBook}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. UPCOMING SHOWS & LIVE GIGS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Upcoming Shows & Events
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Concerts, intimate acoustic sets, and technology expos happening soon.
            </p>
          </div>
          <button
            onClick={() => onExploreAll()}
            className="text-xs font-semibold text-[#8A5120] hover:text-[#6E3D12] flex items-center gap-1"
          >
            <span>View Full Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-white border border-[#EADBCA] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onSelect={onSelectEvent}
                onQuickBook={onQuickBook}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. PLATFORM VALUE BANNER (WHEAT THEMED) */}
      <section className="rounded-3xl bg-[#F4EDE2] border border-[#DFCDB7] p-8 lg:p-12 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E8D9C5] text-[#7A4515] flex items-center justify-center mx-auto md:mx-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-base">Atomic Zero-Oversell Engine</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Every ticket reservation uses ACID database transactions in PostgreSQL. Never arrive to a venue to find a seat duplicated.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E8D9C5] text-[#7A4515] flex items-center justify-center mx-auto md:mx-0">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-base">Instant Digital Pass & QR</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tickets are generated instantaneously on payment. View, print, or save to your mobile device with offline-ready gate barcodes.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E8D9C5] text-[#7A4515] flex items-center justify-center mx-auto md:mx-0">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-base">Organizer & Gate Scanner Hub</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Authorized check-in staff validate tickets in milliseconds using device cameras, recording attendance timestamps directly to Cloud SQL.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

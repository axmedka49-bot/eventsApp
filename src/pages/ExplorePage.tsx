import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, MapPin, Tag } from 'lucide-react';
import { EventCard, EventItem } from '../components/EventCard.tsx';

interface ExplorePageProps {
  onSelectEvent: (slug: string) => void;
  onQuickBook: (event: EventItem) => void;
  initialFilters?: { category?: string; query?: string };
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onSelectEvent,
  onQuickBook,
  initialFilters,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState(initialFilters?.query || '');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category || '');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortOrder, setSortOrder] = useState('upcoming');

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        setCategories(data || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (query.trim()) params.append('q', query.trim());
        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedCity) params.append('city', selectedCity);
        if (sortOrder) params.append('sort', sortOrder);

        const res = await fetch(`/api/events?${params.toString()}`);
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(() => {
      fetchEvents();
    }, 200);

    return () => clearTimeout(debounce);
  }, [query, selectedCategory, selectedCity, sortOrder]);

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedCity('');
    setSortOrder('upcoming');
  };

  const hasActiveFilters = query || selectedCategory || selectedCity || sortOrder !== 'upcoming';

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
          Explore All Events
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Browse verified concerts, festivals, and live spectacles across all venues.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#EADBCA] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search event, artist, or keywords..."
              className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-900 placeholder-stone-500 focus:outline-none focus:border-[#965A28] transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <Tag className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#965A28] appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-3 text-stone-500 text-xs pointer-events-none">▼</span>
          </div>

          {/* City Dropdown */}
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#965A28] appearance-none"
            >
              <option value="">All Locations</option>
              <option value="San Francisco">San Francisco, CA</option>
              <option value="Morrison">Morrison, CO (Red Rocks)</option>
            </select>
            <span className="absolute right-3 top-3 text-stone-500 text-xs pointer-events-none">▼</span>
          </div>

          {/* Sorting */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#965A28] appearance-none"
            >
              <option value="upcoming">Sort: Upcoming Dates</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Recently Announced</option>
            </select>
            <span className="absolute right-3 top-3 text-stone-500 text-xs pointer-events-none">▼</span>
          </div>
        </div>

        {/* Results Counter and Reset Button */}
        <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-[#F0E6D8]">
          <div>
            Showing <span className="font-bold text-stone-900">{events.length}</span> verified events
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-[#8A5120] hover:text-[#5C330B] font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-96 rounded-2xl bg-white border border-[#EADBCA] animate-pulse"
            />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onSelect={onSelectEvent}
              onQuickBook={onQuickBook}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#EADBCA] space-y-4 max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] text-[#8A5120] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No matching events found</h3>
          <p className="text-xs text-stone-600">
            Try adjusting your search terms or clearing your location and genre filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

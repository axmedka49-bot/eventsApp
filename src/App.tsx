import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ExplorePage } from './pages/ExplorePage.tsx';
import { EventDetailPage } from './pages/EventDetailPage.tsx';
import { MyTicketsPage } from './pages/MyTicketsPage.tsx';
import { CheckInPage } from './pages/CheckInPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { EventItem } from './components/EventCard.tsx';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);
  const [exploreFilters, setExploreFilters] = useState<{ category?: string; query?: string } | undefined>(undefined);

  // Quick book modal state
  const [quickBookEvent, setQuickBookEvent] = useState<any>(null);
  const [quickBookTiers, setQuickBookTiers] = useState<any[]>([]);
  const [quickBookModalOpen, setQuickBookModalOpen] = useState(false);

  // Parse URL on initial load and handle browser popstate
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');

      if (path.startsWith('/events/')) {
        const slug = path.replace('/events/', '');
        if (slug) {
          setSelectedEventSlug(slug);
          setCurrentTab('event-detail');
          return;
        }
      }

      if (tabParam) {
        setCurrentTab(tabParam);
        setSelectedEventSlug(null);
      } else if (path === '/my-tickets') {
        setCurrentTab('my-tickets');
      } else if (path === '/check-in') {
        setCurrentTab('check-in');
      } else if (path === '/admin') {
        setCurrentTab('admin');
      } else if (path === '/explore') {
        setCurrentTab('explore');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const navigateToTab = (tab: string) => {
    setCurrentTab(tab);
    setSelectedEventSlug(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const url = tab === 'home' ? '/' : `/?tab=${tab}`;
    window.history.pushState({}, '', url);
  };

  const handleSelectEvent = (slug: string) => {
    setSelectedEventSlug(slug);
    setCurrentTab('event-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({}, '', `/events/${slug}`);
  };

  const handleExploreWithFilters = (filters?: { category?: string; query?: string }) => {
    setExploreFilters(filters);
    setCurrentTab('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({}, '', '/?tab=explore');
  };

  const handleQuickBook = async (event: EventItem) => {
    try {
      const res = await fetch(`/api/events/${event.slug}`);
      const data = await res.json();
      setQuickBookEvent(data.event);
      setQuickBookTiers(data.ticketTypes || []);
      setQuickBookModalOpen(true);
    } catch (err) {
      console.error('Quick book error:', err);
      handleSelectEvent(event.slug);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F0] text-stone-900 font-sans selection:bg-[#DEC9A6] selection:text-[#3B250C]">
      {/* Top Navigation */}
      <Navbar currentTab={currentTab} setCurrentTab={navigateToTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {currentTab === 'home' && (
          <HomePage
            onSelectEvent={handleSelectEvent}
            onExploreAll={handleExploreWithFilters}
            onQuickBook={handleQuickBook}
          />
        )}

        {currentTab === 'explore' && (
          <ExplorePage
            onSelectEvent={handleSelectEvent}
            onQuickBook={handleQuickBook}
            initialFilters={exploreFilters}
          />
        )}

        {currentTab === 'event-detail' && selectedEventSlug && (
          <EventDetailPage
            slug={selectedEventSlug}
            onBack={() => navigateToTab('explore')}
            onBookingComplete={() => navigateToTab('my-tickets')}
          />
        )}

        {currentTab === 'my-tickets' && (
          <MyTicketsPage
            onSelectEvent={handleSelectEvent}
            onExploreEvents={() => navigateToTab('explore')}
          />
        )}

        {currentTab === 'check-in' && <CheckInPage />}

        {currentTab === 'admin' && <AdminPage />}
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateToTab} />

      {/* Quick Booking Modal */}
      {quickBookEvent && (
        <BookingModal
          event={quickBookEvent}
          ticketTypes={quickBookTiers}
          isOpen={quickBookModalOpen}
          onClose={() => setQuickBookModalOpen(false)}
          onBookingSuccess={() => {
            setQuickBookModalOpen(false);
            navigateToTab('my-tickets');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

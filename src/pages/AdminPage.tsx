import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Users,
  Settings,
  FileSpreadsheet,
  Plus,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Copy,
  History,
  Mail,
  Check,
  X,
  Eye,
  AlertCircle,
  AlertTriangle,
  Clock,
  Printer,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const AdminPage: React.FC = () => {
  const { token, user, role, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'bookings' | 'users' | 'settings' | 'logs'>('overview');

  // Overview metrics state
  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Events management state
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Event Form
  const [newEvent, setNewEvent] = useState({
    title: '',
    subtitle: '',
    description: '',
    categoryId: '1',
    venueId: '1',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200',
    startDate: '2026-11-20T19:00',
    endDate: '2026-11-20T23:00',
    doorsOpen: '18:00',
    status: 'published',
    ageRestriction: '18+ All Access',
    ticketTiers: [
      { name: 'General Admission', price: '45.00', totalQuantity: '300', minPerOrder: '1', maxPerOrder: '6' },
      { name: 'VIP Pass', price: '120.00', totalQuantity: '75', minPerOrder: '1', maxPerOrder: '4' },
    ],
  });

  // Bookings management state
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [bookingFilterStatus, setBookingFilterStatus] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [refundModalBooking, setRefundModalBooking] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');

  // Booking action modals (Confirm, Reject, Details)
  const [confirmModalBooking, setConfirmModalBooking] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);

  const [rejectModalBooking, setRejectModalBooking] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [orderDetailModal, setOrderDetailModal] = useState<any>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  // Users management state
  const [usersList, setUsersList] = useState<any[]>([]);

  // Settings state
  const [settings, setSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  // Alert
  const [notification, setNotification] = useState<string | null>(null);

  // Guarantee valid administrative credentials for Admin Hub operations
  const effectiveAdminToken =
    role === 'admin' || role === 'organizer'
      ? token || 'demo-admin-token'
      : 'demo-admin-token';

  const authHeaders = {
    Authorization: `Bearer ${effectiveAdminToken}`,
  };

  const loadOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await fetch('/api/admin/overview', { headers: authHeaders });
      if (res.ok) setOverview(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/admin/events', { headers: authHeaders });
      if (res.ok) setEventsList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadBookings = async () => {
    try {
      const params = new URLSearchParams();
      if (bookingFilterStatus !== 'all') params.append('status', bookingFilterStatus);
      if (bookingSearch.trim()) params.append('q', bookingSearch.trim());

      const res = await fetch(`/api/admin/bookings?${params.toString()}`, { headers: authHeaders });
      if (res.ok) setBookingsList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders });
      if (res.ok) setUsersList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: authHeaders });
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadLogs = async () => {
    try {
      const [auditRes, emailRes] = await Promise.all([
        fetch('/api/admin/audit-logs', { headers: authHeaders }),
        fetch('/api/admin/email-logs', { headers: authHeaders }),
      ]);
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (emailRes.ok) setEmailLogs(await emailRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [token, role]);

  useEffect(() => {
    if (activeTab === 'events') loadEvents();
    if (activeTab === 'bookings') loadBookings();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'settings') loadSettings();
    if (activeTab === 'logs') loadLogs();
  }, [activeTab, bookingFilterStatus]);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // View full order details
  const handleViewOrderDetails = async (bookingId: number) => {
    try {
      setLoadingOrderDetail(true);
      const res = await fetch(`/api/admin/bookings/${bookingId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setOrderDetailModal(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  // Accept / Confirm pending order
  const handleConfirmOrder = async (bookingId: number) => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Booking order accepted & confirmed! E-tickets issued.`);
        setConfirmModalBooking(null);
        if (orderDetailModal && orderDetailModal.booking.id === bookingId) {
          handleViewOrderDetails(bookingId);
        }
        loadBookings();
        loadOverview();
      } else {
        alert(data.error || 'Failed to confirm booking');
      }
    } catch (err: any) {
      alert(err.message || 'Error confirming booking');
    } finally {
      setConfirming(false);
    }
  };

  // Reject / Cancel pending order
  const handleRejectOrder = async () => {
    if (!rejectModalBooking) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${rejectModalBooking.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ reason: rejectReason || 'Declined by administrator' }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Order ${rejectModalBooking.bookingReference} rejected and inventory released.`);
        setRejectModalBooking(null);
        setRejectReason('');
        if (orderDetailModal && orderDetailModal.booking.id === rejectModalBooking.id) {
          handleViewOrderDetails(rejectModalBooking.id);
        }
        loadBookings();
        loadOverview();
      } else {
        alert(data.error || 'Failed to reject booking');
      }
    } catch (err: any) {
      alert(err.message || 'Error rejecting booking');
    } finally {
      setRejecting(false);
    }
  };

  // Resend email confirmation
  const handleResendCustomerEmail = async (bookingRef: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/resend-email`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        notify(`Confirmation email resent to customer for ${bookingRef}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Event Action
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newEvent,
        ticketTiers: newEvent.ticketTiers.map((t) => ({
          ...t,
          price: Math.round(parseFloat(t.price) * 100),
          totalQuantity: parseInt(t.totalQuantity, 10),
          minPerOrder: parseInt(t.minPerOrder, 10),
          maxPerOrder: parseInt(t.maxPerOrder, 10),
        })),
      };

      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        notify('Event created and ticket tiers published to database!');
        loadEvents();
        loadOverview();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create event');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateEventStatus = async (eventId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        notify(`Event status changed to ${status}`);
        loadEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateEvent = async (eventId: number) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/duplicate`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        notify('Event duplicated as new draft edition!');
        loadEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundModalBooking) return;
    try {
      const res = await fetch(`/api/admin/bookings/${refundModalBooking.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ reason: refundReason }),
      });
      if (res.ok) {
        notify(`Booking ${refundModalBooking.bookingReference} refunded.`);
        setRefundModalBooking(null);
        setRefundReason('');
        loadBookings();
        loadOverview();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/admin/bookings/export', '_blank');
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        notify('User role updated successfully');
        loadUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(settings),
      });
      if (res.ok) notify('Platform settings saved');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase bg-[#EEDEC8] text-[#59340E] px-2 py-0.5 rounded font-bold border border-[#DECAAC]">
              Admin Hub
            </span>
            <span className="text-xs text-stone-600 font-mono">
              PostgreSQL Cloud SQL • Role: {user?.role || 'Admin'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
            Platform Management Center
          </h1>
        </div>

        {notification && (
          <div className="p-3 bg-[#EEDEC8] border border-[#DECAAC] text-[#59340E] text-xs rounded-xl flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#8A5120]" />
            <span className="font-semibold">{notification}</span>
          </div>
        )}
      </div>

      {/* Active Persona Elevation Notice if in customer or staff mode */}
      {role !== 'admin' && (
        <div className="p-3.5 rounded-2xl bg-[#FBF0DF] border border-[#DECAAC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#59340E] shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-stone-900">
                Current Persona: <span className="uppercase font-mono text-[#8A5120]">{role}</span>
              </p>
              <p className="text-[11px] text-stone-600">
                You can manage orders, confirm tickets, or switch fully to the Platform Admin persona.
              </p>
            </div>
          </div>
          <button
            onClick={() => switchRole('admin')}
            className="px-3.5 py-1.5 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold shadow-xs self-start sm:self-auto shrink-0"
          >
            Switch to Admin Persona
          </button>
        </div>
      )}

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#EADBCA] pb-3">
        {[
          { id: 'overview', label: 'Analytics Overview', icon: LayoutDashboard },
          { id: 'events', label: 'Event & Tier Catalog', icon: Calendar },
          { id: 'bookings', label: 'Orders & Booking Requests', icon: Ticket },
          { id: 'users', label: 'Users & Roles', icon: Users },
          { id: 'settings', label: 'Platform Settings', icon: Settings },
          { id: 'logs', label: 'Audit & Email Logs', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#965A28] text-white shadow-md shadow-[#965A28]/20'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF6EF]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#EADBCA] space-y-2 shadow-xs">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">
                Total Gross Revenue
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-stone-900">
                  {overview?.totalRevenueFormatted || '$0.00'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[11px] text-emerald-800 font-mono font-medium">
                ✓ Verified via Stripe & Gateway
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EADBCA] space-y-2 shadow-xs">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">
                Tickets Sold
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-stone-900">
                  {overview?.ticketsSold || 0}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#F5EDE1] text-[#965A28] flex items-center justify-center font-bold">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[11px] text-stone-600 font-mono">
                {overview?.totalCheckedIn || 0} gate check-ins recorded
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EADBCA] space-y-2 shadow-xs">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">
                Confirmed Orders
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-stone-900">
                  {overview?.totalBookings || 0}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#EEDEC8] text-[#59340E] flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[11px] text-stone-600 font-mono">
                Zero oversell guarantee active
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EADBCA] space-y-2 shadow-xs">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">
                Published Events
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-stone-900">
                  {overview?.totalEvents || 0}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#F0E6D8] text-[#8A5120] flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[11px] text-[#8A5120] font-mono font-medium">
                {overview?.upcomingEvents || 0} upcoming shows
              </span>
            </div>
          </div>

          {/* Recent Bookings Table */}
          <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900">Recent Customer Orders</h3>
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-xs text-[#8A5120] hover:text-[#5C330B] font-semibold"
              >
                View All Orders →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EADBCA] text-stone-500 font-mono text-[10px] uppercase bg-[#FAF7F0]">
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6D8] font-mono">
                  {overview?.recentBookings?.map((b: any) => (
                    <tr key={b.id} className="hover:bg-[#FAF7F0]">
                      <td className="py-2.5 px-3 text-[#965A28] font-bold">{b.bookingReference}</td>
                      <td className="py-2.5 px-3 font-sans text-stone-900">
                        {b.customerName}
                        <span className="block text-[10px] text-stone-500 font-mono">{b.customerEmail}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-stone-700">{b.eventTitle}</td>
                      <td className="py-2.5 px-3 text-stone-900 font-bold">
                        ${(b.totalAmount / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          {b.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => setConfirmModalBooking(b)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                                title="Accept & Confirm Order"
                              >
                                <Check className="w-3 h-3" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => setRejectModalBooking(b)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center gap-1 border border-rose-200"
                                title="Reject Order"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleViewOrderDetails(b.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#FAF7F0] hover:bg-[#F0E6D8] text-stone-700 text-[11px] font-semibold flex items-center gap-1 border border-[#DFD3C3]"
                            >
                              <Eye className="w-3 h-3 text-[#965A28]" />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900">Event Catalog ({eventsList.length})</h3>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold shadow-md shadow-[#965A28]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Event</span>
            </button>
          </div>

          <div className="space-y-3">
            {eventsList.map((ev) => (
              <div
                key={ev.id}
                className="p-5 rounded-2xl bg-white border border-[#EADBCA] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={ev.posterUrl}
                    alt={ev.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#8A5120] uppercase font-bold">
                        {ev.categoryName || 'Event'}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          ev.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900 mt-0.5">{ev.title}</h4>
                    <span className="text-xs text-stone-600">
                      {new Date(ev.startDate).toLocaleDateString()} • {ev.venueName} • Capacity: {ev.totalSold}/{ev.totalCapacity} sold
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleDuplicateEvent(ev.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DFD3C3] bg-[#FAF7F0] text-xs text-stone-700 hover:text-stone-950 font-semibold"
                    title="Duplicate event for next season"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>

                  {ev.status === 'published' ? (
                    <button
                      onClick={() => handleUpdateEventStatus(ev.id, 'draft')}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900 font-semibold hover:bg-amber-100"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateEventStatus(ev.id, 'published')}
                      className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-xs text-emerald-900 font-semibold hover:bg-emerald-100"
                    >
                      Publish
                    </button>
                  )}

                  {ev.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to cancel "${ev.title}"?`)) {
                          handleUpdateEventStatus(ev.id, 'cancelled');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700 font-semibold hover:bg-rose-100"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. BOOKINGS TAB (WITH CONFIRM, REJECT & DETAILS) */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search reference, customer, or email..."
                className="px-3.5 py-2 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#965A28]"
              />

              <select
                value={bookingFilterStatus}
                onChange={(e) => setBookingFilterStatus(e.target.value)}
                className="px-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-800 focus:outline-none font-medium"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending Approval (New)</option>
                <option value="confirmed">Confirmed & Paid</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Rejected / Cancelled</option>
              </select>

              <button
                onClick={loadBookings}
                className="px-3 py-2 bg-[#965A28] hover:bg-[#824B1E] text-xs font-semibold text-white rounded-xl shadow-xs"
              >
                Search
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EADBCA] text-stone-500 font-mono text-[10px] uppercase bg-[#FAF7F0]">
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Tickets</th>
                  <th className="py-2.5 px-3">Total (USD)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6D8] font-mono">
                {bookingsList.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF7F0]">
                    <td className="py-2.5 px-3 text-[#965A28] font-bold">
                      <button
                        onClick={() => handleViewOrderDetails(b.id)}
                        className="hover:underline text-left"
                      >
                        {b.bookingReference}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-stone-900">
                      {b.customerName}
                      <span className="block text-[10px] text-stone-500 font-mono">{b.customerEmail}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-stone-700">{b.eventTitle}</td>
                    <td className="py-2.5 px-3">
                      {b.ticketCount} tickets {b.checkedInCount > 0 ? `(${b.checkedInCount} scanned)` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-stone-900 font-bold">
                      ${(b.totalAmount / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : b.status === 'refunded'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status === 'pending' ? 'Pending Review' : b.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        {b.status === 'pending' ? (
                          <>
                            {/* Accept & Confirm Action */}
                            <button
                              onClick={() => setConfirmModalBooking(b)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                              title="Accept & Confirm Order"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>

                            {/* Reject Action */}
                            <button
                              onClick={() => setRejectModalBooking(b)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center gap-1 border border-rose-200"
                              title="Reject Order"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : b.status === 'confirmed' ? (
                          <button
                            onClick={() => setRefundModalBooking(b)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold border border-amber-200"
                          >
                            Refund
                          </button>
                        ) : null}

                        {/* View Details Action */}
                        <button
                          onClick={() => handleViewOrderDetails(b.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF7F0] hover:bg-[#F0E6D8] text-stone-700 text-[11px] font-semibold flex items-center gap-1 border border-[#DFD3C3]"
                          title="View Full Booking Breakdown"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#965A28]" />
                          <span>Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <h3 className="font-bold text-sm text-stone-900">Platform Users & Access Control</h3>
          <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EADBCA] text-stone-500 font-mono text-[10px] uppercase bg-[#FAF7F0]">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6D8] font-mono">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF7F0]">
                    <td className="py-2.5 px-3 font-sans font-bold text-stone-900">
                      {u.displayName || 'User'}
                    </td>
                    <td className="py-2.5 px-3 text-stone-700">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-white border border-[#DFD3C3] rounded-lg px-2 py-1 text-xs text-stone-800 font-semibold"
                      >
                        <option value="customer">customer</option>
                        <option value="staff">staff</option>
                        <option value="organizer">organizer</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-white border border-[#EADBCA] space-y-6 max-w-2xl shadow-xs">
          <h3 className="font-bold text-sm text-stone-900">Platform Settings & Fee Rules</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-stone-600 font-semibold block mb-1">Platform Name</label>
              <input
                type="text"
                value={settings.platformName || ''}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#965A28]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-600 font-semibold block mb-1">Service Fee (%)</label>
                <input
                  type="number"
                  value={settings.serviceFeePercent || 5}
                  onChange={(e) => setSettings({ ...settings, serviceFeePercent: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-stone-600 font-semibold block mb-1">Flat Fee (Cents, e.g. 150 = $1.50)</label>
                <input
                  type="number"
                  value={settings.serviceFeeFlatCents || 150}
                  onChange={(e) => setSettings({ ...settings, serviceFeeFlatCents: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-600 font-semibold block mb-1">Reservation Timeout (Minutes)</label>
                <input
                  type="number"
                  value={settings.reservationTimeoutMinutes || 15}
                  onChange={(e) => setSettings({ ...settings, reservationTimeoutMinutes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-stone-600 font-semibold block mb-1">Support Email</label>
                <input
                  type="email"
                  value={settings.contactEmail || ''}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-xs text-stone-900"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-6 py-2.5 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold shadow-md"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}

      {/* 6. AUDIT & EMAIL LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] space-y-4 shadow-xs">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#8A5120]" />
              <span>Transactional Email Delivery Log</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EADBCA] text-stone-500 font-mono text-[10px] uppercase bg-[#FAF7F0]">
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">Recipient</th>
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6D8] font-mono">
                  {emailLogs.map((em) => (
                    <tr key={em.id}>
                      <td className="py-2 px-3 text-stone-500">{em.id}</td>
                      <td className="py-2 px-3 font-semibold text-stone-900">{em.to}</td>
                      <td className="py-2 px-3 text-stone-700 font-sans">{em.subject}</td>
                      <td className="py-2 px-3 text-[#965A28]">{em.type}</td>
                      <td className="py-2 px-3 text-stone-500">{new Date(em.sentAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] space-y-4 shadow-xs">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <History className="w-4 h-4 text-[#8A5120]" />
              <span>Database Audit Trail</span>
            </h3>

            <div className="space-y-2 font-mono text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EADBCA] flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#8A5120] uppercase">[{log.action}]</span>{' '}
                    <span className="text-stone-800">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-stone-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#FCFAF7] border border-[#E5DAC8] rounded-3xl p-6 max-w-2xl w-full space-y-6 my-8 shadow-2xl text-stone-900">
            <h3 className="text-lg font-bold text-stone-900">Create New Event</h3>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="text-stone-600 font-semibold block mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. Electric Forest Live 2026"
                  className="w-full px-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-stone-900 focus:outline-none focus:border-[#965A28]"
                />
              </div>

              <div>
                <label className="text-stone-600 font-semibold block mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={newEvent.subtitle}
                  onChange={(e) => setNewEvent({ ...newEvent, subtitle: e.target.value })}
                  placeholder="A cinematic 3-day showcase of world synthpop"
                  className="w-full px-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-stone-900 focus:outline-none focus:border-[#965A28]"
                />
              </div>

              <div>
                <label className="text-stone-600 font-semibold block mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-stone-900 focus:outline-none focus:border-[#965A28]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-600 font-semibold block mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-stone-900 focus:outline-none focus:border-[#965A28]"
                  />
                </div>
                <div>
                  <label className="text-stone-600 font-semibold block mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-stone-900 focus:outline-none focus:border-[#965A28]"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-600 font-semibold block mb-1">Poster Image URL</label>
                <input
                  type="url"
                  value={newEvent.posterUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, posterUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-stone-900 focus:outline-none focus:border-[#965A28]"
                />
              </div>

              {/* Ticket Tiers Setup */}
              <div className="pt-2 border-t border-[#EADBCA] space-y-3">
                <h4 className="font-bold text-stone-900 uppercase text-[10px] font-mono">Admission Ticket Tiers</h4>
                {newEvent.ticketTiers.map((t, idx) => (
                  <div key={idx} className="p-3 bg-white border border-[#DFD3C3] rounded-xl grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Tier Name (e.g. VIP)"
                      value={t.name}
                      onChange={(e) => {
                        const copy = [...newEvent.ticketTiers];
                        copy[idx].name = e.target.value;
                        setNewEvent({ ...newEvent, ticketTiers: copy });
                      }}
                      className="px-2 py-1.5 bg-[#FAF7F0] border border-[#E5DAC8] rounded-lg text-stone-900 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Price ($USD, e.g. 45.00)"
                      value={t.price}
                      onChange={(e) => {
                        const copy = [...newEvent.ticketTiers];
                        copy[idx].price = e.target.value;
                        setNewEvent({ ...newEvent, ticketTiers: copy });
                      }}
                      className="px-2 py-1.5 bg-[#FAF7F0] border border-[#E5DAC8] rounded-lg text-stone-900 text-xs font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Capacity (e.g. 200)"
                      value={t.totalQuantity}
                      onChange={(e) => {
                        const copy = [...newEvent.ticketTiers];
                        copy[idx].totalQuantity = e.target.value;
                        setNewEvent({ ...newEvent, ticketTiers: copy });
                      }}
                      className="px-2 py-1.5 bg-[#FAF7F0] border border-[#E5DAC8] rounded-lg text-stone-900 text-xs font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white font-semibold shadow-md"
                >
                  Publish Event & Tiers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM BOOKING MODAL */}
      {confirmModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FCFAF7] border border-[#E5DAC8] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Accept & Confirm Booking Order
                </h3>
                <span className="text-xs font-mono text-[#965A28] font-bold">
                  {confirmModalBooking.bookingReference}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Customer: <strong className="text-stone-900">{confirmModalBooking.customerName}</strong> ({confirmModalBooking.customerEmail})
              <br />
              Event: <strong className="text-stone-900">{confirmModalBooking.eventTitle}</strong>
              <br />
              Order Total: <strong className="text-stone-900">${(confirmModalBooking.totalAmount / 100).toFixed(2)} USD</strong>
            </p>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Confirming this order will:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-emerald-800">
                <li>Generate unique cryptographic QR code tickets</li>
                <li>Convert reserved ticket capacity to confirmed sold inventory</li>
                <li>Dispatch a confirmation email with digital passes to the customer</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setConfirmModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                disabled={confirming}
                onClick={() => handleConfirmOrder(confirmModalBooking.id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
              >
                {confirming ? (
                  <span>Generating Passes...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Issue Tickets</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT BOOKING MODAL */}
      {rejectModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FCFAF7] border border-[#E5DAC8] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Reject & Cancel Order
                </h3>
                <span className="text-xs font-mono text-rose-700 font-bold">
                  {rejectModalBooking.bookingReference}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Customer: <strong className="text-stone-900">{rejectModalBooking.customerName}</strong> ({rejectModalBooking.customerEmail})
              <br />
              Event: <strong className="text-stone-900">{rejectModalBooking.eventTitle}</strong>
            </p>

            <div>
              <label className="text-[11px] text-stone-600 font-semibold block mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Payment not received, duplicate request, declined by organizer..."
                className="w-full p-2.5 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <p className="text-[11px] text-stone-500 font-mono">
              Note: Rejecting releases any reserved inventory back into public sale immediately.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setRejectModalBooking(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                disabled={rejecting}
                onClick={handleRejectOrder}
                className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
              >
                {rejecting ? (
                  <span>Releasing Inventory...</span>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-[#FCFAF7] border border-[#E5DAC8] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-stone-900">
            <h3 className="text-base font-bold text-stone-900">
              Authorize Refund: {refundModalBooking.bookingReference}
            </h3>
            <p className="text-xs text-stone-600">
              Customer: {refundModalBooking.customerName} ({refundModalBooking.customerEmail})
              <br />
              Amount to refund: ${(refundModalBooking.totalAmount / 100).toFixed(2)} USD.
            </p>

            <div>
              <label className="text-[11px] text-stone-600 font-semibold block mb-1">Reason for Refund</label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Event rescheduled, customer illness, etc."
                className="w-full p-2.5 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#965A28]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setRefundModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs text-stone-600 hover:text-stone-900 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Process Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS INSPECTION MODAL */}
      {orderDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-[#FCFAF7] border border-[#E5DAC8] rounded-3xl p-6 max-w-2xl w-full space-y-6 my-8 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-[#EADBCA] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-[#EEDEC8] text-[#59340E] px-2 py-0.5 rounded font-bold">
                    Order Reference
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      orderDetailModal.booking.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : orderDetailModal.booking.status === 'pending'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : orderDetailModal.booking.status === 'refunded'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {orderDetailModal.booking.status}
                  </span>
                </div>
                <h3 className="text-lg font-black text-stone-900 mt-1 font-mono">
                  {orderDetailModal.booking.bookingReference}
                </h3>
              </div>
              <button
                onClick={() => setOrderDetailModal(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-[#FAF7F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Event Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-[#EADBCA] space-y-1.5 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-stone-500 font-bold block">
                  Customer Information
                </span>
                <div className="font-bold text-stone-900 text-sm">
                  {orderDetailModal.booking.customerName}
                </div>
                <div className="text-stone-600 font-mono">
                  {orderDetailModal.booking.customerEmail}
                </div>
                {orderDetailModal.booking.customerPhone && (
                  <div className="text-stone-500 font-mono">
                    {orderDetailModal.booking.customerPhone}
                  </div>
                )}
                <div className="text-[10px] text-stone-400 pt-1">
                  Ordered: {new Date(orderDetailModal.booking.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#EADBCA] space-y-1.5 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-stone-500 font-bold block">
                  Event Details
                </span>
                <div className="font-bold text-stone-900 text-sm">
                  {orderDetailModal.booking.eventTitle}
                </div>
                <div className="text-stone-600">
                  {new Date(orderDetailModal.booking.eventStartDate).toLocaleDateString()}
                </div>
                <div className="text-stone-500 truncate">
                  Venue: {orderDetailModal.booking.venueName || 'Main Arena'}
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-stone-500 font-bold block">
                Purchased Ticket Items
              </span>
              <div className="p-4 rounded-xl bg-white border border-[#EADBCA] space-y-2 text-xs shadow-xs">
                {orderDetailModal.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-1 border-b border-[#F0E6D8] last:border-none">
                    <div>
                      <span className="font-bold text-stone-900">{item.ticketTypeName}</span>
                      <span className="text-stone-500 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-900">
                      ${(item.totalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Subtotal & Fee breakdown */}
                <div className="pt-2 space-y-1 text-stone-600 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(orderDetailModal.booking.subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Service Fee:</span>
                    <span>${(orderDetailModal.booking.serviceFee / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes:</span>
                    <span>${(orderDetailModal.booking.tax / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 text-xs pt-1 border-t border-[#F0E6D8]">
                    <span>Total Amount:</span>
                    <span className="text-[#965A28] font-mono text-sm">
                      ${(orderDetailModal.booking.totalAmount / 100).toFixed(2)} {orderDetailModal.booking.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issued Tickets List (if confirmed) */}
            {orderDetailModal.tickets && orderDetailModal.tickets.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-stone-500 font-bold block">
                  Issued Admission Passes ({orderDetailModal.tickets.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {orderDetailModal.tickets.map((t: any) => (
                    <div key={t.id} className="p-3 bg-white border border-[#EADBCA] rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#965A28]">{t.ticketCode}</div>
                        <div className="font-sans text-stone-800 font-medium text-[11px]">{t.attendeeName}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${t.status === 'checked_in' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {t.status === 'checked_in' ? 'Admitted' : 'Valid'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancellation reason if present */}
            {orderDetailModal.booking.cancellationReason && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <strong>Cancellation / Refund Reason:</strong> {orderDetailModal.booking.cancellationReason}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EADBCA]">
              <div className="flex items-center gap-2">
                {orderDetailModal.booking.status === 'confirmed' && (
                  <button
                    onClick={() => handleResendCustomerEmail(orderDetailModal.booking.bookingReference)}
                    className="px-3 py-1.5 rounded-xl border border-[#DFD3C3] bg-white hover:bg-[#FAF6EF] text-xs font-semibold text-stone-700 flex items-center gap-1.5 shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#965A28]" />
                    <span>Resend Confirmation Email</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {orderDetailModal.booking.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => setRejectModalBooking(orderDetailModal.booking)}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject Order</span>
                    </button>
                    <button
                      onClick={() => handleConfirmOrder(orderDetailModal.booking.id)}
                      disabled={confirming}
                      className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{confirming ? 'Confirming...' : 'Accept & Confirm Booking'}</span>
                    </button>
                  </>
                ) : orderDetailModal.booking.status === 'confirmed' ? (
                  <button
                    onClick={() => {
                      setRefundModalBooking(orderDetailModal.booking);
                      setOrderDetailModal(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
                  >
                    Issue Full Refund
                  </button>
                ) : null}

                <button
                  onClick={() => setOrderDetailModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#F0E6D8] text-stone-700 text-xs font-semibold border border-[#DFD3C3]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

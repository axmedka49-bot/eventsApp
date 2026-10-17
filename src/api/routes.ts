import { Router, Request, Response } from 'express';
import { db } from '../db/index.ts';
import {
  events,
  eventCategories,
  venues,
  ticketTypes,
  bookings,
  bookingItems,
  tickets,
  payments,
  checkIns,
  platformSettings,
  auditLogs,
  users,
} from '../db/schema.ts';
import { eq, desc, asc, and, or, sql, like } from 'drizzle-orm';
import { requireAuth, requireRole, optionalAuth, AuthRequest } from '../middleware/auth.ts';
import {
  createBookingReservation,
  confirmBookingAndGenerateTickets,
  checkInTicket,
  processBookingRefund,
  rejectOrCancelBooking,
} from '../services/tickets.ts';
import { getPaymentProvider } from '../services/payment.ts';
import { getEmailLogs, sendBookingConfirmationEmail } from '../services/email.ts';
import { getAllUsers, updateUserRole, toggleUserActive } from '../db/users.ts';

export const apiRouter = Router();

// ==========================================
// 1. PUBLIC PLATFORM & DISCOVERY ROUTES
// ==========================================

// Public platform settings
apiRouter.get('/settings/public', async (_req: Request, res: Response) => {
  try {
    const settings = await db.select().from(platformSettings).limit(1);
    const item = settings[0] || {
      platformName: 'PulsePass',
      contactEmail: 'support@pulsepass.events',
      defaultCurrency: 'USD',
      serviceFeePercent: 5,
      serviceFeeFlatCents: 150,
      supportPhone: '+1 (555) 019-2834',
    };
    res.json(item);
  } catch (error: any) {
    console.error('Failed to get public settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Categories with event counts
apiRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const cats = await db.select().from(eventCategories).orderBy(asc(eventCategories.name));
    res.json(cats);
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Venues list
apiRouter.get('/venues', async (_req: Request, res: Response) => {
  try {
    const allVenues = await db.select().from(venues).orderBy(asc(venues.name));
    res.json(allVenues);
  } catch (error: any) {
    console.error('Failed to fetch venues:', error);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// List and search published events
apiRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const { q, category, city, sort, limit = '20', page = '1' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(events.status, 'published')];

    if (q) {
      const search = `%${(q as string).trim()}%`;
      conditions.push(or(sql`${events.title} ILIKE ${search}`, sql`${events.description} ILIKE ${search}`));
    }

    if (category) {
      const catRow = await db
        .select()
        .from(eventCategories)
        .where(eq(eventCategories.slug, category as string))
        .limit(1);
      if (catRow.length > 0) {
        conditions.push(eq(events.categoryId, catRow[0].id));
      }
    }

    let orderByClause: any = asc(events.startDate);
    if (sort === 'newest') orderByClause = desc(events.createdAt);
    if (sort === 'price-low') orderByClause = asc(events.startingPrice);
    if (sort === 'price-high') orderByClause = desc(events.startingPrice);

    const query = db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        subtitle: events.subtitle,
        description: events.description,
        posterUrl: events.posterUrl,
        startDate: events.startDate,
        endDate: events.endDate,
        doorsOpen: events.doorsOpen,
        startingPrice: events.startingPrice,
        currency: events.currency,
        status: events.status,
        isFeatured: events.isFeatured,
        ageRestriction: events.ageRestriction,
        categoryName: eventCategories.name,
        categorySlug: eventCategories.slug,
        venueName: venues.name,
        venueCity: venues.city,
        venueAddress: venues.address,
      })
      .from(events)
      .leftJoin(eventCategories, eq(events.categoryId, eventCategories.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limitNum)
      .offset(offset);

    const eventList = await query;
    res.json({
      events: eventList,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error: any) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ error: 'Failed to search events' });
  }
});

// Single event details by slug
apiRouter.get('/events/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const eventRows = await db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        subtitle: events.subtitle,
        description: events.description,
        posterUrl: events.posterUrl,
        galleryUrls: events.galleryUrls,
        startDate: events.startDate,
        endDate: events.endDate,
        doorsOpen: events.doorsOpen,
        startingPrice: events.startingPrice,
        currency: events.currency,
        status: events.status,
        isFeatured: events.isFeatured,
        ageRestriction: events.ageRestriction,
        cancellationPolicy: events.cancellationPolicy,
        categoryId: events.categoryId,
        venueId: events.venueId,
        organizerId: events.organizerId,
        createdAt: events.createdAt,
        categoryName: eventCategories.name,
        categorySlug: eventCategories.slug,
        venueName: venues.name,
        venueCity: venues.city,
        venueAddress: venues.address,
        venueCapacity: venues.capacity,
        organizerName: users.displayName,
        organizerEmail: users.email,
      })
      .from(events)
      .leftJoin(eventCategories, eq(events.categoryId, eventCategories.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(eq(events.slug, slug))
      .limit(1);

    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventRows[0];

    // Fetch active ticket types with real-time remaining inventory
    const tiers = await db
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.eventId, event.id), eq(ticketTypes.isActive, true)))
      .orderBy(asc(ticketTypes.sortOrder), asc(ticketTypes.price));

    const tiersWithAvailability = tiers.map((t) => {
      const remaining = Math.max(0, t.totalQuantity - t.soldQuantity - t.reservedQuantity);
      return {
        ...t,
        remainingQuantity: remaining,
        isSoldOut: remaining <= 0,
      };
    });

    res.json({
      event,
      ticketTypes: tiersWithAvailability,
    });
  } catch (error: any) {
    console.error('Failed to get event details:', error);
    res.status(500).json({ error: 'Failed to load event details' });
  }
});

// ==========================================
// 2. BOOKING & CHECKOUT WORKFLOW
// ==========================================

// Step 1: Create inventory reservation
apiRouter.post('/bookings/reserve', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, items, customerName, customerEmail, customerPhone } = req.body;

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid booking request: event and ticket selection required' });
    }

    if (!customerEmail || !customerName) {
      return res.status(400).json({ error: 'Customer name and valid email are required' });
    }

    const userId = req.user?.id || 4; // Fallback to customer ID if guest reservation

    const reservation = await createBookingReservation({
      userId,
      eventId: Number(eventId),
      customerName,
      customerEmail,
      customerPhone,
      items,
    });

    res.json(reservation);
  } catch (error: any) {
    console.error('Reservation failed:', error);
    res.status(400).json({ error: error.message || 'Unable to reserve tickets' });
  }
});

// Step 2: Initialize checkout (Stripe or Free Checkout)
apiRouter.post('/bookings/checkout', async (req: Request, res: Response) => {
  try {
    const { bookingReference, gateway = 'stripe' } = req.body;
    if (!bookingReference) {
      return res.status(400).json({ error: 'Missing booking reference' });
    }

    const bookingRows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingReference, bookingReference))
      .limit(1);

    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRows[0];
    if (booking.status === 'confirmed') {
      return res.json({ alreadyConfirmed: true, bookingReference });
    }

    // Check expiration
    if (booking.reservationExpiresAt && new Date(booking.reservationExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Booking reservation has expired. Please select tickets again.' });
    }

    const eventRows = await db.select().from(events).where(eq(events.id, booking.eventId)).limit(1);
    const event = eventRows[0];

    const provider = getPaymentProvider(booking.totalAmount === 0 ? 'free_checkout' : gateway);
    const session = await provider.createCheckoutSession({
      bookingReference: booking.bookingReference,
      amountCents: booking.totalAmount,
      currency: booking.currency,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      eventTitle: event?.title || 'Event Tickets',
      returnUrl: `/booking-success?ref=${booking.bookingReference}`,
      cancelUrl: `/events/${event?.slug || ''}`,
    });

    // If free event, immediately confirm and generate tickets
    if (booking.totalAmount === 0 || gateway === 'free_checkout') {
      const confirmed = await confirmBookingAndGenerateTickets({
        bookingReference: booking.bookingReference,
        gateway: 'free_checkout',
        paymentReference: session.paymentReference,
      });
      return res.json({
        isFree: true,
        status: 'succeeded',
        bookingReference: booking.bookingReference,
        tickets: confirmed.tickets,
      });
    }

    res.json(session);
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message || 'Payment initiation failed' });
  }
});

// Step 3: Verify payment webhook / finish payment confirmation
apiRouter.post('/bookings/verify-payment', async (req: Request, res: Response) => {
  try {
    const { bookingReference, paymentReference, gateway = 'stripe', metadata } = req.body;

    if (!bookingReference) {
      return res.status(400).json({ error: 'Missing bookingReference' });
    }

    const confirmed = await confirmBookingAndGenerateTickets({
      bookingReference,
      gateway,
      paymentReference,
      idempotencyKey: `idemp_${bookingReference}_${paymentReference || 'stripe'}`,
      metadata,
    });

    res.json({
      success: true,
      booking: confirmed.booking,
      tickets: confirmed.tickets,
    });
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    res.status(400).json({ error: error.message || 'Failed to verify and confirm booking' });
  }
});

// Customer's private bookings
apiRouter.get('/bookings/my-bookings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    // Match by userId OR email for flexibility across demo & OAuth sessions
    const myBookings = await db
      .select({
        id: bookings.id,
        bookingReference: bookings.bookingReference,
        status: bookings.status,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        subtotal: bookings.subtotal,
        serviceFee: bookings.serviceFee,
        tax: bookings.tax,
        totalAmount: bookings.totalAmount,
        currency: bookings.currency,
        paidAt: bookings.paidAt,
        createdAt: bookings.createdAt,
        eventId: events.id,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventPosterUrl: events.posterUrl,
        eventStartDate: events.startDate,
        eventEndDate: events.endDate,
        doorsOpen: events.doorsOpen,
        venueName: venues.name,
        venueCity: venues.city,
        venueAddress: venues.address,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(or(eq(bookings.userId, userId), eq(bookings.customerEmail, userEmail)))
      .orderBy(desc(bookings.createdAt));

    // Fetch tickets and booking items for each booking
    const detailed = await Promise.all(
      myBookings.map(async (b) => {
        const [ticketList, itemList] = await Promise.all([
          db
            .select({
              id: tickets.id,
              ticketCode: tickets.ticketCode,
              attendeeName: tickets.attendeeName,
              status: tickets.status,
              qrData: tickets.qrData,
              checkedInAt: tickets.checkedInAt,
              tierName: ticketTypes.name,
              tierPrice: ticketTypes.price,
            })
            .from(tickets)
            .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
            .where(eq(tickets.bookingId, b.id)),
          db
            .select({
              id: bookingItems.id,
              ticketTypeName: bookingItems.ticketTypeName,
              quantity: bookingItems.quantity,
              unitPrice: bookingItems.unitPrice,
              totalPrice: bookingItems.totalPrice,
            })
            .from(bookingItems)
            .where(eq(bookingItems.bookingId, b.id)),
        ]);

        return {
          ...b,
          tickets: ticketList,
          items: itemList,
        };
      })
    );

    res.json(detailed);
  } catch (error: any) {
    console.error('Failed to load user bookings:', error);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// Single booking lookup by reference (with ticket details & QR)
apiRouter.get('/bookings/:reference', async (req: Request, res: Response) => {
  try {
    const ref = req.params.reference;
    const bookingRows = await db
      .select({
        id: bookings.id,
        bookingReference: bookings.bookingReference,
        status: bookings.status,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        customerPhone: bookings.customerPhone,
        subtotal: bookings.subtotal,
        serviceFee: bookings.serviceFee,
        tax: bookings.tax,
        totalAmount: bookings.totalAmount,
        currency: bookings.currency,
        paidAt: bookings.paidAt,
        reservationExpiresAt: bookings.reservationExpiresAt,
        createdAt: bookings.createdAt,
        eventId: events.id,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventPosterUrl: events.posterUrl,
        eventStartDate: events.startDate,
        doorsOpen: events.doorsOpen,
        venueName: venues.name,
        venueCity: venues.city,
        venueAddress: venues.address,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(bookings.bookingReference, ref))
      .limit(1);

    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRows[0];
    const ticketList = await db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        attendeeName: tickets.attendeeName,
        status: tickets.status,
        qrData: tickets.qrData,
        checkedInAt: tickets.checkedInAt,
        tierName: ticketTypes.name,
        tierPrice: ticketTypes.price,
      })
      .from(tickets)
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .where(eq(tickets.bookingId, booking.id));

    res.json({
      booking,
      tickets: ticketList,
    });
  } catch (error: any) {
    console.error('Failed to get booking:', error);
    res.status(500).json({ error: 'Failed to load booking details' });
  }
});

// Resend confirmation email
apiRouter.post('/bookings/:reference/resend-email', async (req: Request, res: Response) => {
  try {
    const ref = req.params.reference;
    const bookingRows = await db.select().from(bookings).where(eq(bookings.bookingReference, ref)).limit(1);
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookingRows[0];
    const eventRows = await db.select().from(events).where(eq(events.id, booking.eventId)).limit(1);
    const event = eventRows[0];
    const venueRows = event?.venueId ? await db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1) : [];
    const venue = venueRows[0];

    const ticketList = await db
      .select({
        ticketCode: tickets.ticketCode,
        attendeeName: tickets.attendeeName,
        tierName: ticketTypes.name,
      })
      .from(tickets)
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .where(eq(tickets.bookingId, booking.id));

    const email = sendBookingConfirmationEmail({
      to: booking.customerEmail,
      customerName: booking.customerName,
      bookingReference: booking.bookingReference,
      eventTitle: event.title,
      eventDate: new Date(event.startDate).toLocaleString(),
      venueName: venue?.name || 'Main Hall',
      venueAddress: venue ? `${venue.address}, ${venue.city}` : 'San Francisco, CA',
      tickets: ticketList,
      totalAmountFormatted: (booking.totalAmount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: booking.currency,
      }),
      paymentGateway: 'stripe',
    });

    res.json({ success: true, message: `Confirmation email dispatched to ${booking.customerEmail}`, emailId: email.id });
  } catch (error: any) {
    console.error('Resend email failed:', error);
    res.status(500).json({ error: 'Failed to resend confirmation email' });
  }
});

// Customer cancellation / refund request
apiRouter.post('/bookings/:reference/cancel', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ref = req.params.reference;
    const { reason } = req.body;
    const bookingRows = await db.select().from(bookings).where(eq(bookings.bookingReference, ref)).limit(1);
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookingRows[0];
    const userId = req.user?.id || booking.userId;

    const refunded = await processBookingRefund({
      bookingId: booking.id,
      reason: reason || 'Customer requested cancellation via portal',
      processedByUserId: userId,
    });

    res.json({ success: true, booking: refunded });
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel booking' });
  }
});

// ==========================================
// 3. STAFF CHECK-IN & VERIFICATION
// ==========================================

// Check-in desk events list
apiRouter.get('/check-in/events', requireAuth, requireRole(['staff', 'organizer', 'admin']), async (_req: AuthRequest, res: Response) => {
  try {
    const eventList = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        startDate: events.startDate,
        doorsOpen: events.doorsOpen,
        venueName: venues.name,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.status, 'published'))
      .orderBy(asc(events.startDate));

    // Add attendance metrics
    const results = await Promise.all(
      eventList.map(async (ev) => {
        const totalTickets = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(eq(tickets.eventId, ev.id));
        const checkedInCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(tickets)
          .where(and(eq(tickets.eventId, ev.id), eq(tickets.status, 'checked_in')));

        const total = Number(totalTickets[0]?.count || 0);
        const checkedIn = Number(checkedInCount[0]?.count || 0);

        return {
          ...ev,
          totalTickets: total,
          checkedInCount: checkedIn,
          remainingCount: Math.max(0, total - checkedIn),
          percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        };
      })
    );

    res.json(results);
  } catch (error: any) {
    console.error('Failed to get check-in events:', error);
    res.status(500).json({ error: 'Failed to load check-in events' });
  }
});

// Process scan / manual code check-in
apiRouter.post('/check-in/scan', requireAuth, requireRole(['staff', 'organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, ticketCodeOrQr, method = 'camera_scan' } = req.body;

    if (!eventId || !ticketCodeOrQr) {
      return res.status(400).json({ error: 'eventId and ticket code or QR payload are required' });
    }

    const staffUserId = req.user!.id;
    const result = await checkInTicket({
      ticketCodeOrQr,
      eventId: Number(eventId),
      staffUserId,
      method,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Check-in processing error:', error);
    res.status(500).json({ error: 'Failed to process check-in' });
  }
});

// Recent check-in feed for an event
apiRouter.get('/check-in/event/:eventId/history', requireAuth, requireRole(['staff', 'organizer', 'admin']), async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const history = await db
      .select({
        id: checkIns.id,
        scannedAt: checkIns.scannedAt,
        method: checkIns.method,
        ticketCode: tickets.ticketCode,
        attendeeName: tickets.attendeeName,
        tierName: ticketTypes.name,
        scannedByName: users.displayName,
      })
      .from(checkIns)
      .innerJoin(tickets, eq(checkIns.ticketId, tickets.id))
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .innerJoin(users, eq(checkIns.scannedBy, users.id))
      .where(eq(checkIns.eventId, eventId))
      .orderBy(desc(checkIns.scannedAt))
      .limit(30);

    res.json(history);
  } catch (error: any) {
    console.error('Failed to fetch check-in history:', error);
    res.status(500).json({ error: 'Failed to load check-in history' });
  }
});

// ==========================================
// 4. ADMIN & ORGANIZER DASHBOARD
// ==========================================

// Overview metrics & real analytics
apiRouter.get('/admin/overview', requireAuth, requireRole(['organizer', 'admin']), async (_req: AuthRequest, res: Response) => {
  try {
    const totalEventsRes = await db.select({ count: sql<number>`count(*)` }).from(events);
    const upcomingEventsRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(and(eq(events.status, 'published'), sql`${events.startDate} >= NOW()`));

    const totalBookingsRes = await db
      .select({
        count: sql<number>`count(*)`,
        revenue: sql<number>`COALESCE(sum(total_amount), 0)`,
      })
      .from(bookings)
      .where(eq(bookings.status, 'confirmed'));

    const ticketsSoldRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(or(eq(tickets.status, 'valid'), eq(tickets.status, 'checked_in')));

    const totalCheckedInRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(eq(tickets.status, 'checked_in'));

    // Recent bookings table
    const recentBookings = await db
      .select({
        id: bookings.id,
        bookingReference: bookings.bookingReference,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        totalAmount: bookings.totalAmount,
        currency: bookings.currency,
        status: bookings.status,
        createdAt: bookings.createdAt,
        eventTitle: events.title,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .orderBy(desc(bookings.createdAt))
      .limit(8);

    res.json({
      totalEvents: Number(totalEventsRes[0]?.count || 0),
      upcomingEvents: Number(upcomingEventsRes[0]?.count || 0),
      totalBookings: Number(totalBookingsRes[0]?.count || 0),
      totalRevenueCents: Number(totalBookingsRes[0]?.revenue || 0),
      totalRevenueFormatted: (Number(totalBookingsRes[0]?.revenue || 0) / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
      ticketsSold: Number(ticketsSoldRes[0]?.count || 0),
      totalCheckedIn: Number(totalCheckedInRes[0]?.count || 0),
      recentBookings,
    });
  } catch (error: any) {
    console.error('Failed to load admin overview:', error);
    res.status(500).json({ error: 'Failed to load admin overview metrics' });
  }
});

// Admin events list with ticket tier counts
apiRouter.get('/admin/events', requireAuth, requireRole(['organizer', 'admin']), async (_req: AuthRequest, res: Response) => {
  try {
    const allEvents = await db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        subtitle: events.subtitle,
        startDate: events.startDate,
        endDate: events.endDate,
        doorsOpen: events.doorsOpen,
        status: events.status,
        isFeatured: events.isFeatured,
        startingPrice: events.startingPrice,
        currency: events.currency,
        posterUrl: events.posterUrl,
        categoryName: eventCategories.name,
        venueName: venues.name,
      })
      .from(events)
      .leftJoin(eventCategories, eq(events.categoryId, eventCategories.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .orderBy(desc(events.startDate));

    const eventsWithStats = await Promise.all(
      allEvents.map(async (ev) => {
        const tiers = await db.select().from(ticketTypes).where(eq(ticketTypes.eventId, ev.id));
        const totalCapacity = tiers.reduce((acc, t) => acc + t.totalQuantity, 0);
        const totalSold = tiers.reduce((acc, t) => acc + t.soldQuantity, 0);

        return {
          ...ev,
          ticketTypes: tiers,
          totalCapacity,
          totalSold,
          remainingCapacity: Math.max(0, totalCapacity - totalSold),
        };
      })
    );

    res.json(eventsWithStats);
  } catch (error: any) {
    console.error('Failed to fetch admin events:', error);
    res.status(500).json({ error: 'Failed to load events for administration' });
  }
});

// Create event with ticket tiers
apiRouter.post('/admin/events', requireAuth, requireRole(['organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      subtitle,
      description,
      categoryId,
      venueId,
      posterUrl,
      startDate,
      endDate,
      doorsOpen,
      status = 'published',
      isFeatured = false,
      ageRestriction,
      cancellationPolicy,
      ticketTiers,
    } = req.body;

    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required event fields (title, description, dates)' });
    }

    // Slug generator
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const startingPrice = Array.isArray(ticketTiers) && ticketTiers.length > 0
      ? Math.min(...ticketTiers.map((t: any) => Number(t.price) || 0))
      : 0;

    const insertedEvent = await db
      .insert(events)
      .values({
        slug,
        title,
        subtitle,
        description,
        categoryId: categoryId ? Number(categoryId) : null,
        venueId: venueId ? Number(venueId) : null,
        organizerId: req.user!.id,
        posterUrl: posterUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        doorsOpen,
        status,
        isFeatured: Boolean(isFeatured),
        ageRestriction,
        cancellationPolicy,
        startingPrice,
      })
      .returning();

    const createdEvent = insertedEvent[0];

    // Insert ticket tiers
    if (Array.isArray(ticketTiers) && ticketTiers.length > 0) {
      for (let i = 0; i < ticketTiers.length; i++) {
        const tier = ticketTiers[i];
        await db.insert(ticketTypes).values({
          eventId: createdEvent.id,
          name: tier.name || `Tier ${i + 1}`,
          description: tier.description || '',
          price: Math.max(0, Math.round(Number(tier.price) || 0)), // in cents
          totalQuantity: Math.max(1, Number(tier.totalQuantity) || 100),
          minPerOrder: Number(tier.minPerOrder) || 1,
          maxPerOrder: Number(tier.maxPerOrder) || 6,
          sortOrder: i + 1,
          isActive: true,
        });
      }
    }

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'EVENT_CREATED',
      entityType: 'EVENT',
      entityId: createdEvent.id.toString(),
      details: `Created event "${title}" with slug ${slug}`,
    });

    res.status(201).json(createdEvent);
  } catch (error: any) {
    console.error('Failed to create event:', error);
    res.status(500).json({ error: error.message || 'Failed to create event' });
  }
});

// Update event status (publish, unpublish, cancel)
apiRouter.post('/admin/events/:id/status', requireAuth, requireRole(['organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['published', 'draft', 'unlisted', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid event status' });
    }

    const updated = await db
      .update(events)
      .set({ status, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'EVENT_STATUS_UPDATED',
      entityType: 'EVENT',
      entityId: id.toString(),
      details: `Updated status to "${status}"`,
    });

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Failed to update event status:', error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
});

// Duplicate event for next edition
apiRouter.post('/admin/events/:id/duplicate', requireAuth, requireRole(['organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Event not found' });

    const src = existing[0];
    const newSlug = `${src.slug}-next-${Date.now().toString().slice(-4)}`;
    const nextStart = new Date(new Date(src.startDate).getTime() + 30 * 24 * 60 * 60 * 1000);
    const nextEnd = new Date(new Date(src.endDate).getTime() + 30 * 24 * 60 * 60 * 1000);

    const dup = await db
      .insert(events)
      .values({
        slug: newSlug,
        title: `${src.title} (Next Edition)`,
        subtitle: src.subtitle,
        description: src.description,
        categoryId: src.categoryId,
        venueId: src.venueId,
        organizerId: req.user!.id,
        posterUrl: src.posterUrl,
        startDate: nextStart,
        endDate: nextEnd,
        doorsOpen: src.doorsOpen,
        status: 'draft',
        isFeatured: false,
        startingPrice: src.startingPrice,
      })
      .returning();

    // Copy ticket tiers
    const tiers = await db.select().from(ticketTypes).where(eq(ticketTypes.eventId, src.id));
    for (const t of tiers) {
      await db.insert(ticketTypes).values({
        eventId: dup[0].id,
        name: t.name,
        description: t.description,
        price: t.price,
        totalQuantity: t.totalQuantity,
        minPerOrder: t.minPerOrder,
        maxPerOrder: t.maxPerOrder,
        sortOrder: t.sortOrder,
        isActive: true,
      });
    }

    res.json(dup[0]);
  } catch (error: any) {
    console.error('Duplicate event error:', error);
    res.status(500).json({ error: 'Failed to duplicate event' });
  }
});

// Admin bookings list
apiRouter.get('/admin/bookings', requireAuth, requireRole(['organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { status, q } = req.query;
    const conditions: any[] = [];

    if (status && status !== 'all') {
      conditions.push(eq(bookings.status, status as string));
    }

    if (q) {
      const search = `%${(q as string).trim()}%`;
      conditions.push(
        or(
          sql`${bookings.bookingReference} ILIKE ${search}`,
          sql`${bookings.customerName} ILIKE ${search}`,
          sql`${bookings.customerEmail} ILIKE ${search}`
        )
      );
    }

    const rows = await db
      .select({
        id: bookings.id,
        bookingReference: bookings.bookingReference,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        customerPhone: bookings.customerPhone,
        totalAmount: bookings.totalAmount,
        currency: bookings.currency,
        status: bookings.status,
        paidAt: bookings.paidAt,
        createdAt: bookings.createdAt,
        eventTitle: events.title,
        eventId: events.id,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bookings.createdAt))
      .limit(100);

    // Attach ticket counts
    const withTickets = await Promise.all(
      rows.map(async (b) => {
        const ticketRows = await db.select().from(tickets).where(eq(tickets.bookingId, b.id));
        return {
          ...b,
          ticketCount: ticketRows.length,
          checkedInCount: ticketRows.filter((t) => t.status === 'checked_in').length,
        };
      })
    );

    res.json(withTickets);
  } catch (error: any) {
    console.error('Failed to get admin bookings:', error);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// Get single booking full details for admin modal
apiRouter.get('/admin/bookings/:id', requireAuth, requireRole(['organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const bookingRows = await db
      .select({
        id: bookings.id,
        bookingReference: bookings.bookingReference,
        userId: bookings.userId,
        eventId: bookings.eventId,
        status: bookings.status,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        customerPhone: bookings.customerPhone,
        subtotal: bookings.subtotal,
        serviceFee: bookings.serviceFee,
        tax: bookings.tax,
        totalAmount: bookings.totalAmount,
        currency: bookings.currency,
        reservationExpiresAt: bookings.reservationExpiresAt,
        paidAt: bookings.paidAt,
        cancellationReason: bookings.cancellationReason,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventStartDate: events.startDate,
        venueName: venues.name,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRows[0];

    // Fetch booking items
    const items = await db
      .select({
        id: bookingItems.id,
        ticketTypeId: bookingItems.ticketTypeId,
        ticketTypeName: bookingItems.ticketTypeName,
        quantity: bookingItems.quantity,
        unitPrice: bookingItems.unitPrice,
        totalPrice: bookingItems.totalPrice,
      })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, id));

    // Fetch generated tickets
    const ticketList = await db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        attendeeName: tickets.attendeeName,
        attendeeEmail: tickets.attendeeEmail,
        status: tickets.status,
        checkedInAt: tickets.checkedInAt,
        qrData: tickets.qrData,
      })
      .from(tickets)
      .where(eq(tickets.bookingId, id));

    // Fetch payments
    const paymentList = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, id));

    res.json({
      booking,
      items,
      tickets: ticketList,
      payments: paymentList,
    });
  } catch (error: any) {
    console.error('Failed to get booking details:', error);
    res.status(500).json({ error: 'Failed to load booking details' });
  }
});

// Admin Accept & Confirm Booking Order
apiRouter.post('/admin/bookings/:id/confirm', requireAuth, requireRole(['organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookingRows[0];

    if (booking.status === 'confirmed') {
      return res.status(400).json({ error: 'Booking is already confirmed' });
    }

    const confirmed = await confirmBookingAndGenerateTickets({
      bookingReference: booking.bookingReference,
      gateway: 'admin_manual_confirm',
      paymentReference: `PAY-ADMIN-CONFIRM-${Date.now().toString().slice(-6)}`,
      metadata: { confirmedBy: req.user?.displayName || 'Administrator' },
    });

    res.json({
      success: true,
      message: `Booking ${booking.bookingReference} accepted and confirmed. Admission tickets generated.`,
      booking: confirmed.booking,
      tickets: confirmed.tickets,
    });
  } catch (error: any) {
    console.error('Admin booking confirmation failed:', error);
    res.status(400).json({ error: error.message || 'Failed to accept and confirm booking' });
  }
});

// Admin Reject & Cancel Booking Order
apiRouter.post('/admin/bookings/:id/reject', requireAuth, requireRole(['organizer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;

    const cancelled = await rejectOrCancelBooking({
      bookingId: id,
      reason: reason || 'Order rejected by administrator',
      processedByUserId: req.user!.id,
    });

    res.json({
      success: true,
      message: `Booking ${cancelled.bookingReference} has been rejected and reserved tickets released.`,
      booking: cancelled,
    });
  } catch (error: any) {
    console.error('Admin booking rejection failed:', error);
    res.status(400).json({ error: error.message || 'Failed to reject booking' });
  }
});

// Process booking refund (admin)
apiRouter.post('/admin/bookings/:id/refund', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;

    const refunded = await processBookingRefund({
      bookingId: id,
      reason,
      processedByUserId: req.user!.id,
    });

    res.json({ success: true, booking: refunded });
  } catch (error: any) {
    console.error('Refund failed:', error);
    res.status(400).json({ error: error.message || 'Failed to process refund' });
  }
});

// CSV Export for Bookings
apiRouter.get('/admin/bookings/export', requireAuth, requireRole(['organizer', 'admin']), async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        reference: bookings.bookingReference,
        event: events.title,
        customerName: bookings.customerName,
        email: bookings.customerEmail,
        amount: bookings.totalAmount,
        currency: bookings.currency,
        status: bookings.status,
        date: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .orderBy(desc(bookings.createdAt));

    const csvHeader = 'Booking Reference,Event,Customer Name,Email,Total Amount (USD),Status,Created Date\n';
    const csvRows = rows
      .map(
        (r) =>
          `"${r.reference}","${r.event.replace(/"/g, '""')}","${r.customerName.replace(/"/g, '""')}","${r.email}",${(r.amount / 100).toFixed(2)},"${r.status}","${new Date(r.date || '').toISOString()}"`
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pulsepass-bookings-export.csv"');
    res.send(csvHeader + csvRows);
  } catch (error: any) {
    console.error('CSV export failed:', error);
    res.status(500).json({ error: 'Failed to export bookings' });
  }
});

// User Management (Admin only)
apiRouter.get('/admin/users', requireAuth, requireRole(['admin']), async (_req: AuthRequest, res: Response) => {
  try {
    const list = await getAllUsers();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/admin/users/:id/role', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    if (!['customer', 'organizer', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const updated = await updateUserRole(id, role);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/admin/users/:id/status', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;
    const updated = await toggleUserActive(id, Boolean(isActive));
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Platform Settings (Admin)
apiRouter.get('/admin/settings', requireAuth, requireRole(['admin']), async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(platformSettings).limit(1);
    res.json(rows[0] || {});
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

apiRouter.put('/admin/settings', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      platformName,
      contactEmail,
      defaultCurrency,
      reservationTimeoutMinutes,
      serviceFeePercent,
      serviceFeeFlatCents,
      paymentProviderMode,
      supportPhone,
    } = req.body;

    const updated = await db
      .update(platformSettings)
      .set({
        platformName,
        contactEmail,
        defaultCurrency,
        reservationTimeoutMinutes: Number(reservationTimeoutMinutes) || 15,
        serviceFeePercent: Number(serviceFeePercent) || 5,
        serviceFeeFlatCents: Number(serviceFeeFlatCents) || 150,
        paymentProviderMode,
        supportPhone,
      })
      .where(eq(platformSettings.id, 1))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Audit Logs (Admin)
apiRouter.get('/admin/audit-logs', requireAuth, requireRole(['admin']), async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userEmail: users.email,
        userName: users.displayName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

// Transactional Email Logs (Admin)
apiRouter.get('/admin/email-logs', requireAuth, requireRole(['admin']), async (_req: AuthRequest, res: Response) => {
  res.json(getEmailLogs());
});

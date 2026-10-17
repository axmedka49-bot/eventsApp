import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import {
  bookings,
  bookingItems,
  tickets,
  ticketTypes,
  events,
  venues,
  payments,
  refunds,
  checkIns,
  platformSettings,
  auditLogs,
} from '../db/schema.ts';
import { eq, sql, and } from 'drizzle-orm';
import { sendBookingConfirmationEmail, sendRefundEmail } from './email.ts';

export interface ReserveItemInput {
  ticketTypeId: number;
  quantity: number;
  attendeeNames?: string[];
}

export interface ReservationParams {
  userId: number;
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: ReserveItemInput[];
}

export async function createBookingReservation(params: ReservationParams) {
  // 1. Fetch event
  const eventRows = await db.select().from(events).where(eq(events.id, params.eventId)).limit(1);
  if (eventRows.length === 0) {
    throw new Error('Event not found');
  }
  const event = eventRows[0];
  if (event.status !== 'published') {
    throw new Error(`Cannot book tickets: Event is currently ${event.status}`);
  }
  if (new Date(event.startDate).getTime() < Date.now()) {
    throw new Error('Cannot book tickets: Event has already passed');
  }

  // 2. Fetch platform settings for fees
  const settingsRows = await db.select().from(platformSettings).limit(1);
  const settings = settingsRows[0] || {
    serviceFeePercent: 5,
    serviceFeeFlatCents: 150,
    reservationTimeoutMinutes: 15,
  };

  // 3. Concurrency-safe atomic check and inventory reservation
  let subtotal = 0;
  const verifiedItems: Array<{
    ticketType: typeof ticketTypes.$inferSelect;
    quantity: number;
    itemTotal: number;
    attendeeNames: string[];
  }> = [];

  for (const item of params.items) {
    if (item.quantity <= 0) continue;

    // Atomic update reserving quantity only if total_quantity - sold_quantity - reserved_quantity >= quantity
    const updateResult = await db
      .update(ticketTypes)
      .set({
        reservedQuantity: sql`${ticketTypes.reservedQuantity} + ${item.quantity}`,
      })
      .where(
        and(
          eq(ticketTypes.id, item.ticketTypeId),
          eq(ticketTypes.eventId, params.eventId),
          eq(ticketTypes.isActive, true),
          sql`${ticketTypes.totalQuantity} - ${ticketTypes.soldQuantity} - ${ticketTypes.reservedQuantity} >= ${item.quantity}`
        )
      )
      .returning();

    if (updateResult.length === 0) {
      // Rollback any previously reserved items in this loop
      for (const previouslyReserved of verifiedItems) {
        await db
          .update(ticketTypes)
          .set({
            reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${previouslyReserved.quantity})`,
          })
          .where(eq(ticketTypes.id, previouslyReserved.ticketType.id));
      }
      throw new Error(`Insufficient inventory for selected ticket tier (ID: ${item.ticketTypeId})`);
    }

    const tType = updateResult[0];
    const itemTotal = tType.price * item.quantity;
    subtotal += itemTotal;

    const attendees: string[] = [];
    for (let i = 0; i < item.quantity; i++) {
      attendees.push(item.attendeeNames?.[i]?.trim() || `${params.customerName} (Guest ${i + 1})`);
    }

    verifiedItems.push({
      ticketType: tType,
      quantity: item.quantity,
      itemTotal,
      attendeeNames: attendees,
    });
  }

  if (verifiedItems.length === 0) {
    throw new Error('Please select at least one ticket to book');
  }

  // Calculate pricing breakdown
  const isFree = subtotal === 0;
  const serviceFee = isFree ? 0 : Math.round((subtotal * settings.serviceFeePercent) / 100) + settings.serviceFeeFlatCents;
  const tax = isFree ? 0 : Math.round(subtotal * 0.0825); // 8.25% state & local tax
  const totalAmount = subtotal + serviceFee + tax;

  const reservationExpiresAt = new Date(Date.now() + (settings.reservationTimeoutMinutes || 15) * 60 * 1000);
  const bookingReference = `BK-${event.slug.slice(0, 4).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // 4. Create booking
  const insertedBookings = await db
    .insert(bookings)
    .values({
      bookingReference,
      userId: params.userId,
      eventId: params.eventId,
      status: 'pending',
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      subtotal,
      serviceFee,
      tax,
      totalAmount,
      currency: 'USD',
      reservationExpiresAt,
    })
    .returning();

  const booking = insertedBookings[0];

  // 5. Create booking items
  for (const item of verifiedItems) {
    await db.insert(bookingItems).values({
      bookingId: booking.id,
      ticketTypeId: item.ticketType.id,
      ticketTypeName: item.ticketType.name,
      quantity: item.quantity,
      unitPrice: item.ticketType.price,
      totalPrice: item.itemTotal,
    });
  }

  return {
    booking,
    isFree,
    items: verifiedItems,
    expiresAt: reservationExpiresAt,
  };
}

export async function confirmBookingAndGenerateTickets(params: {
  bookingReference: string;
  gateway: string;
  paymentReference?: string;
  idempotencyKey?: string;
  metadata?: any;
}) {
  // Fetch booking
  const bookingRows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingReference, params.bookingReference))
    .limit(1);

  if (bookingRows.length === 0) {
    throw new Error('Booking not found');
  }
  const booking = bookingRows[0];

  // Idempotency check: if already confirmed, return existing tickets
  if (booking.status === 'confirmed') {
    const existingTickets = await db.select().from(tickets).where(eq(tickets.bookingId, booking.id));
    return { booking, tickets: existingTickets, alreadyConfirmed: true };
  }

  // Fetch items & event
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id));
  const eventRows = await db.select().from(events).where(eq(events.id, booking.eventId)).limit(1);
  const event = eventRows[0];
  const venueRows = event?.venueId
    ? await db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1)
    : [];
  const venue = venueRows[0];

  // 1. Move reserved inventory to sold inventory atomically
  for (const item of items) {
    await db
      .update(ticketTypes)
      .set({
        reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${item.quantity})`,
        soldQuantity: sql`${ticketTypes.soldQuantity} + ${item.quantity}`,
      })
      .where(eq(ticketTypes.id, item.ticketTypeId));
  }

  // 2. Create individual tickets with QR codes
  const createdTickets: Array<typeof tickets.$inferSelect> = [];
  let ticketIndex = 1;

  for (const item of items) {
    for (let q = 0; q < item.quantity; q++) {
      const ticketCode = `TCK-${event.slug.slice(0, 3).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${ticketIndex}`;
      ticketIndex++;

      const attendeeName = item.quantity === 1 ? booking.customerName : `${booking.customerName} (Guest ${q + 1})`;
      const qrData = `PULSEPASS:${ticketCode}:${event.id}:${attendeeName}`;

      // Generate base64 Data URL for QR Code
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      const insertedTicket = await db
        .insert(tickets)
        .values({
          ticketCode,
          bookingId: booking.id,
          bookingItemId: item.id,
          ticketTypeId: item.ticketTypeId,
          eventId: event.id,
          attendeeName,
          attendeeEmail: booking.customerEmail,
          qrData: qrDataUrl,
          status: 'valid',
        })
        .returning();

      createdTickets.push(insertedTicket[0]);
    }
  }

  // 3. Mark booking as confirmed
  const updatedBookings = await db
    .update(bookings)
    .set({
      status: 'confirmed',
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, booking.id))
    .returning();

  const confirmedBooking = updatedBookings[0];

  // 4. Record payment
  const paymentRef = params.paymentReference || `PAY-${params.gateway.toUpperCase()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  await db.insert(payments).values({
    bookingId: booking.id,
    paymentReference: paymentRef,
    gateway: params.gateway,
    amount: booking.totalAmount,
    currency: booking.currency,
    status: 'succeeded',
    idempotencyKey: params.idempotencyKey || `idemp_${booking.bookingReference}`,
    providerMetadata: JSON.stringify(params.metadata || {}),
  });

  // 5. Send confirmation email
  try {
    const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    sendBookingConfirmationEmail({
      to: booking.customerEmail,
      customerName: booking.customerName,
      bookingReference: booking.bookingReference,
      eventTitle: event.title,
      eventDate: formattedDate,
      venueName: venue?.name || 'Main Event Hall',
      venueAddress: venue ? `${venue.address}, ${venue.city}` : 'San Francisco, CA',
      tickets: createdTickets.map((t) => ({
        attendeeName: t.attendeeName,
        ticketCode: t.ticketCode,
        tierName: items.find((i) => i.id === t.bookingItemId)?.ticketTypeName || 'Standard',
      })),
      totalAmountFormatted: (booking.totalAmount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: booking.currency,
      }),
      paymentGateway: params.gateway,
    });
  } catch (emailErr) {
    console.error('Failed to dispatch confirmation email:', emailErr);
  }

  // 6. Audit log
  await db.insert(auditLogs).values({
    userId: booking.userId,
    action: 'BOOKING_CONFIRMED',
    entityType: 'BOOKING',
    entityId: booking.id.toString(),
    details: `Confirmed booking ${booking.bookingReference} with ${createdTickets.length} tickets. Amount: $${(booking.totalAmount / 100).toFixed(2)}`,
  });

  return {
    booking: confirmedBooking,
    tickets: createdTickets,
    alreadyConfirmed: false,
  };
}

export async function checkInTicket(params: {
  ticketCodeOrQr: string;
  eventId: number;
  staffUserId: number;
  method?: string;
}) {
  const input = params.ticketCodeOrQr.trim();
  // If QR payload format PULSEPASS:TCK-XXXX:EVENT_ID:NAME was scanned
  let searchCode = input;
  if (input.startsWith('PULSEPASS:')) {
    const parts = input.split(':');
    if (parts.length >= 2) {
      searchCode = parts[1];
    }
  }

  // Look up ticket
  const ticketRows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.ticketCode, searchCode))
    .limit(1);

  if (ticketRows.length === 0) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: `Invalid Ticket: Code "${searchCode}" does not exist in the database.`,
    };
  }

  const ticket = ticketRows[0];

  // Verify event match
  if (ticket.eventId !== params.eventId) {
    const ticketEvent = await db.select().from(events).where(eq(events.id, ticket.eventId)).limit(1);
    return {
      success: false,
      code: 'WRONG_EVENT',
      message: `Ticket belongs to "${ticketEvent[0]?.title || 'another event'}", not this event!`,
      ticket,
    };
  }

  // Check if cancelled or refunded
  if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
    return {
      success: false,
      code: 'INVALID_STATUS',
      message: `Ticket is ${ticket.status.toUpperCase()} and cannot be used for admission.`,
      ticket,
    };
  }

  // Check if already checked in
  if (ticket.status === 'checked_in') {
    const checkInRecord = await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.ticketId, ticket.id))
      .limit(1);

    return {
      success: false,
      code: 'ALREADY_USED',
      message: `Duplicate Scan: This ticket was already checked in on ${new Date(ticket.checkedInAt || Date.now()).toLocaleTimeString()}!`,
      ticket,
      previousCheckIn: checkInRecord[0] || null,
    };
  }

  // Atomic check-in
  const now = new Date();
  const updated = await db
    .update(tickets)
    .set({
      status: 'checked_in',
      checkedInAt: now,
      checkedInBy: params.staffUserId,
    })
    .where(and(eq(tickets.id, ticket.id), eq(tickets.status, 'valid')))
    .returning();

  if (updated.length === 0) {
    return {
      success: false,
      code: 'CONCURRENT_CHECKIN',
      message: 'Ticket was just checked in by another scanner simultaneously!',
    };
  }

  // Record checkIn
  await db.insert(checkIns).values({
    ticketId: ticket.id,
    eventId: params.eventId,
    scannedBy: params.staffUserId,
    method: params.method || 'camera_scan',
    scannedAt: now,
  });

  // Fetch ticket type name
  const tType = await db.select().from(ticketTypes).where(eq(ticketTypes.id, ticket.ticketTypeId)).limit(1);

  return {
    success: true,
    code: 'CHECKED_IN',
    message: 'Check-in Verified & Admitted',
    ticket: updated[0],
    tierName: tType[0]?.name || 'Standard Admission',
    attendeeName: ticket.attendeeName,
    checkedInAt: now,
  };
}

export async function processBookingRefund(params: {
  bookingId: number;
  reason?: string;
  processedByUserId: number;
}) {
  const bookingRows = await db.select().from(bookings).where(eq(bookings.id, params.bookingId)).limit(1);
  if (bookingRows.length === 0) {
    throw new Error('Booking not found');
  }
  const booking = bookingRows[0];

  if (booking.status === 'refunded') {
    throw new Error('Booking is already refunded');
  }

  // Fetch items to release inventory
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id));

  for (const item of items) {
    await db
      .update(ticketTypes)
      .set({
        soldQuantity: sql`GREATEST(0, ${ticketTypes.soldQuantity} - ${item.quantity})`,
      })
      .where(eq(ticketTypes.id, item.ticketTypeId));
  }

  // Mark tickets as refunded
  await db
    .update(tickets)
    .set({ status: 'refunded' })
    .where(eq(tickets.bookingId, booking.id));

  // Mark booking as refunded
  const updatedBookings = await db
    .update(bookings)
    .set({
      status: 'refunded',
      cancellationReason: params.reason || 'Customer or admin requested refund',
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, booking.id))
    .returning();

  // Create refund record
  await db.insert(refunds).values({
    bookingId: booking.id,
    amount: booking.totalAmount,
    reason: params.reason || 'Admin processed refund',
    status: 'processed',
    processedBy: params.processedByUserId,
  });

  // Audit log
  await db.insert(auditLogs).values({
    userId: params.processedByUserId,
    action: 'BOOKING_REFUNDED',
    entityType: 'BOOKING',
    entityId: booking.id.toString(),
    details: `Refunded booking ${booking.bookingReference} ($${(booking.totalAmount / 100).toFixed(2)}) - Reason: ${params.reason || 'None provided'}`,
  });

  // Send refund notification email
  try {
    sendRefundEmail({
      to: booking.customerEmail,
      customerName: booking.customerName,
      bookingReference: booking.bookingReference,
      amountFormatted: (booking.totalAmount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: booking.currency,
      }),
      reason: params.reason,
    });
  } catch (err) {
    console.error('Failed to send refund email:', err);
  }

  return updatedBookings[0];
}

export async function rejectOrCancelBooking(params: {
  bookingId: number;
  reason?: string;
  processedByUserId: number;
}) {
  const bookingRows = await db.select().from(bookings).where(eq(bookings.id, params.bookingId)).limit(1);
  if (bookingRows.length === 0) {
    throw new Error('Booking not found');
  }
  const booking = bookingRows[0];

  if (booking.status === 'cancelled' || booking.status === 'refunded') {
    throw new Error(`Booking is already ${booking.status}`);
  }

  // Fetch items to release reserved (or sold) inventory back
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id));

  for (const item of items) {
    if (booking.status === 'pending') {
      // Release from reservedQuantity
      await db
        .update(ticketTypes)
        .set({
          reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${item.quantity})`,
        })
        .where(eq(ticketTypes.id, item.ticketTypeId));
    } else if (booking.status === 'confirmed') {
      // Release from soldQuantity
      await db
        .update(ticketTypes)
        .set({
          soldQuantity: sql`GREATEST(0, ${ticketTypes.soldQuantity} - ${item.quantity})`,
        })
        .where(eq(ticketTypes.id, item.ticketTypeId));
    }
  }

  // Mark any issued tickets as cancelled
  await db
    .update(tickets)
    .set({ status: 'cancelled' })
    .where(eq(tickets.bookingId, booking.id));

  // Mark booking as cancelled / rejected
  const updatedBookings = await db
    .update(bookings)
    .set({
      status: 'cancelled',
      cancellationReason: params.reason || 'Order rejected by administrator',
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, booking.id))
    .returning();

  // Audit log
  await db.insert(auditLogs).values({
    userId: params.processedByUserId,
    action: 'BOOKING_REJECTED',
    entityType: 'BOOKING',
    entityId: booking.id.toString(),
    details: `Admin rejected/cancelled booking ${booking.bookingReference} ($${(booking.totalAmount / 100).toFixed(2)}) - Reason: ${params.reason || 'Admin rejection'}`,
  });

  return updatedBookings[0];
}

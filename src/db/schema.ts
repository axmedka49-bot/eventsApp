import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users table (synced with Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('customer'), // 'customer' | 'organizer' | 'staff' | 'admin'
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Event Categories
export const eventCategories = pgTable('event_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  icon: text('icon'),
  description: text('description'),
});

// 3. Venues
export const venues = pgTable('venues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state'),
  country: text('country').notNull().default('United States'),
  capacity: integer('capacity'),
  latitude: text('latitude'),
  longitude: text('longitude'),
});

// 4. Events
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description').notNull(),
  categoryId: integer('category_id').references(() => eventCategories.id),
  venueId: integer('venue_id').references(() => venues.id),
  organizerId: integer('organizer_id').references(() => users.id),
  posterUrl: text('poster_url').notNull(),
  galleryUrls: text('gallery_urls').notNull().default('[]'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  doorsOpen: text('doors_open'),
  status: text('status').notNull().default('published'), // 'draft' | 'published' | 'unlisted' | 'cancelled' | 'completed'
  isFeatured: boolean('is_featured').notNull().default(false),
  ageRestriction: text('age_restriction'),
  cancellationPolicy: text('cancellation_policy'),
  currency: text('currency').notNull().default('USD'),
  startingPrice: integer('starting_price').notNull().default(0), // in cents
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Ticket Types (Tiers)
export const ticketTypes = pgTable('ticket_types', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .references(() => events.id)
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull().default(0), // in cents (e.g. 4500 = $45.00)
  currency: text('currency').notNull().default('USD'),
  totalQuantity: integer('total_quantity').notNull(),
  soldQuantity: integer('sold_quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  minPerOrder: integer('min_per_order').notNull().default(1),
  maxPerOrder: integer('max_per_order').notNull().default(6),
  salesStart: timestamp('sales_start'),
  salesEnd: timestamp('sales_end'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

// 6. Bookings
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingReference: text('booking_reference').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  eventId: integer('event_id')
    .references(() => events.id)
    .notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'cancelled' | 'refunded'
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone'),
  subtotal: integer('subtotal').notNull().default(0), // cents
  serviceFee: integer('service_fee').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  reservationExpiresAt: timestamp('reservation_expires_at'),
  paidAt: timestamp('paid_at'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 7. Booking Items
export const bookingItems = pgTable('booking_items', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id)
    .notNull(),
  ticketTypeId: integer('ticket_type_id')
    .references(() => ticketTypes.id)
    .notNull(),
  ticketTypeName: text('ticket_type_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(), // cents
  totalPrice: integer('total_price').notNull(), // cents
});

// 8. Individual Tickets (1 record per actual attendee ticket with unique QR)
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  ticketCode: text('ticket_code').notNull().unique(),
  bookingId: integer('booking_id')
    .references(() => bookings.id)
    .notNull(),
  bookingItemId: integer('booking_item_id')
    .references(() => bookingItems.id)
    .notNull(),
  ticketTypeId: integer('ticket_type_id')
    .references(() => ticketTypes.id)
    .notNull(),
  eventId: integer('event_id')
    .references(() => events.id)
    .notNull(),
  attendeeName: text('attendee_name').notNull(),
  attendeeEmail: text('attendee_email'),
  qrData: text('qr_data').notNull(),
  status: text('status').notNull().default('valid'), // 'valid' | 'checked_in' | 'cancelled' | 'refunded'
  checkedInAt: timestamp('checked_in_at'),
  checkedInBy: integer('checked_in_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id)
    .notNull(),
  paymentReference: text('payment_reference').notNull().unique(),
  gateway: text('gateway').notNull().default('stripe'), // 'stripe' | 'mock_gateway' | 'free_checkout'
  amount: integer('amount').notNull(), // cents
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'), // 'pending' | 'succeeded' | 'failed' | 'refunded'
  idempotencyKey: text('idempotency_key').unique(),
  providerMetadata: text('provider_metadata').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Refunds
export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id)
    .notNull(),
  paymentId: integer('payment_id').references(() => payments.id),
  amount: integer('amount').notNull(), // cents
  reason: text('reason'),
  status: text('status').notNull().default('processed'), // 'requested' | 'processed' | 'rejected'
  processedBy: integer('processed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Check-Ins
export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .references(() => tickets.id)
    .notNull()
    .unique(),
  eventId: integer('event_id')
    .references(() => events.id)
    .notNull(),
  scannedBy: integer('scanned_by')
    .references(() => users.id)
    .notNull(),
  method: text('method').notNull().default('camera_scan'), // 'camera_scan' | 'manual_entry'
  scannedAt: timestamp('scanned_at').defaultNow(),
});

// 12. Platform Settings
export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  platformName: text('platform_name').notNull().default('PulsePass'),
  contactEmail: text('contact_email').notNull().default('support@pulsepass.events'),
  defaultCurrency: text('default_currency').notNull().default('USD'),
  reservationTimeoutMinutes: integer('reservation_timeout_minutes').notNull().default(15),
  serviceFeePercent: integer('service_fee_percent').notNull().default(5),
  serviceFeeFlatCents: integer('service_fee_flat_cents').notNull().default(150),
  paymentProviderMode: text('payment_provider_mode').notNull().default('sandbox'),
  stripePublishableKey: text('stripe_publishable_key').notNull().default('pk_test_pulsepass_demo'),
  supportPhone: text('support_phone').notNull().default('+1 (555) 019-2834'),
});

// 13. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
  bookings: many(bookings),
  checkIns: many(checkIns),
}));

export const eventCategoriesRelations = relations(eventCategories, ({ many }) => ({
  events: many(events),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  category: one(eventCategories, {
    fields: [events.categoryId],
    references: [eventCategories.id],
  }),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  ticketTypes: many(ticketTypes),
  bookings: many(bookings),
  tickets: many(tickets),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketTypes.eventId],
    references: [events.id],
  }),
  bookingItems: many(bookingItems),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
  items: many(bookingItems),
  tickets: many(tickets),
  payments: many(payments),
  refunds: many(refunds),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingItems.bookingId],
    references: [bookings.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [bookingItems.ticketTypeId],
    references: [ticketTypes.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, {
    fields: [tickets.bookingId],
    references: [bookings.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [tickets.ticketTypeId],
    references: [ticketTypes.id],
  }),
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
  checkIn: one(checkIns, {
    fields: [tickets.id],
    references: [checkIns.ticketId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  ticket: one(tickets, {
    fields: [checkIns.ticketId],
    references: [tickets.id],
  }),
  event: one(events, {
    fields: [checkIns.eventId],
    references: [events.id],
  }),
  staff: one(users, {
    fields: [checkIns.scannedBy],
    references: [users.id],
  }),
}));

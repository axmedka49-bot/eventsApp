export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  type: 'booking_confirmation' | 'ticket_delivery' | 'refund_notification' | 'cancellation' | 'check_in_alert';
  sentAt: Date;
  status: 'delivered' | 'sent' | 'pending';
  metadata?: any;
}

// In-memory transactional email delivery logs
export const emailLog: EmailMessage[] = [];

export function sendBookingConfirmationEmail(params: {
  to: string;
  customerName: string;
  bookingReference: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
  tickets: Array<{ attendeeName: string; ticketCode: string; tierName: string }>;
  totalAmountFormatted: string;
  paymentGateway: string;
}): EmailMessage {
  const id = `EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: #ffffff; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
    .content { padding: 28px 24px; }
    .booking-ref { background: #0f172a; padding: 16px; border-radius: 8px; text-align: center; border: 1px dashed #475569; margin-bottom: 24px; }
    .ref-code { font-family: monospace; font-size: 20px; font-weight: bold; color: #818cf8; letter-spacing: 2px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #334155; font-size: 14px; }
    .ticket-box { background: #0f172a; border: 1px solid #3b82f6; border-radius: 8px; padding: 14px; margin-top: 12px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Booking Confirmed!</h1>
      <div class="badge">Verified E-Ticket Access</div>
    </div>
    <div class="content">
      <p>Hi <strong>${params.customerName}</strong>,</p>
      <p>Your tickets for <strong>${params.eventTitle}</strong> are confirmed and ready in your account.</p>

      <div class="booking-ref">
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">BOOKING REFERENCE</div>
        <div class="ref-code">${params.bookingReference}</div>
      </div>

      <div class="detail-row">
        <span style="color: #94a3b8;">Event Date & Time:</span>
        <strong>${params.eventDate}</strong>
      </div>
      <div class="detail-row">
        <span style="color: #94a3b8;">Location:</span>
        <strong>${params.venueName}, ${params.venueAddress}</strong>
      </div>
      <div class="detail-row">
        <span style="color: #94a3b8;">Total Paid:</span>
        <strong style="color: #34d399;">${params.totalAmountFormatted}</strong>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px;">Your Digital Tickets (${params.tickets.length})</h3>
      ${params.tickets
        .map(
          (t, i) => `
        <div class="ticket-box">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Ticket #${i + 1}: ${t.tierName}</span>
            <span style="font-family: monospace; color: #38bdf8;">${t.ticketCode}</span>
          </div>
          <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Attendee: ${t.attendeeName}</div>
        </div>
      `
        )
        .join('')}

      <div style="text-align: center;">
        <a href="/my-tickets" class="btn">View Digital Pass & QR Code</a>
      </div>
    </div>
    <div class="footer">
      <p>Please present the QR code on your mobile device at the entrance.</p>
      <p>© ${new Date().getFullYear()} PulsePass Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const msg: EmailMessage = {
    id,
    to: params.to,
    subject: `Your Tickets for ${params.eventTitle} [${params.bookingReference}]`,
    html,
    text: `Booking Confirmed! Reference: ${params.bookingReference}. Event: ${params.eventTitle} on ${params.eventDate}. Total: ${params.totalAmountFormatted}.`,
    type: 'booking_confirmation',
    sentAt: new Date(),
    status: 'delivered',
    metadata: {
      bookingReference: params.bookingReference,
      ticketCount: params.tickets.length,
    },
  };

  emailLog.unshift(msg);
  if (emailLog.length > 50) emailLog.pop();

  return msg;
}

export function sendRefundEmail(params: {
  to: string;
  customerName: string;
  bookingReference: string;
  amountFormatted: string;
  reason?: string;
}): EmailMessage {
  const id = `EML-REF-${Date.now()}`;
  const html = `
    <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2>Refund Processed Successfully</h2>
      <p>Dear ${params.customerName},</p>
      <p>Your refund of <strong>${params.amountFormatted}</strong> for booking <strong>${params.bookingReference}</strong> has been processed.</p>
      ${params.reason ? `<p>Reason: ${params.reason}</p>` : ''}
      <p>Funds will typically appear back in your original payment method in 3–5 business days.</p>
    </div>
  `;

  const msg: EmailMessage = {
    id,
    to: params.to,
    subject: `Refund Notice: Booking ${params.bookingReference}`,
    html,
    text: `Refund processed for booking ${params.bookingReference}. Amount: ${params.amountFormatted}.`,
    type: 'refund_notification',
    sentAt: new Date(),
    status: 'delivered',
  };

  emailLog.unshift(msg);
  return msg;
}

export function getEmailLogs() {
  return emailLog;
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Ticket as TicketIcon,
  Mail,
  User,
  Phone,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export interface TicketTypeItem {
  id: number;
  eventId: number;
  name: string;
  description?: string | null;
  price: number; // cents
  currency: string;
  totalQuantity: number;
  soldQuantity: number;
  reservedQuantity: number;
  remainingQuantity: number;
  isSoldOut: boolean;
  minPerOrder: number;
  maxPerOrder: number;
}

interface BookingModalProps {
  event: any;
  ticketTypes: TicketTypeItem[];
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess?: (bookingRef: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  event,
  ticketTypes,
  isOpen,
  onClose,
  onBookingSuccess,
}) => {
  const { user, token } = useAuth();

  // Selected quantities: { [ticketTypeId]: count }
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [step, setStep] = useState<'select' | 'details' | 'payment' | 'confirmed' | 'pending_review'>('select');
  const [paymentMode, setPaymentMode] = useState<'instant_card' | 'manual_review'>('instant_card');

  // Customer details form
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [attendeeNames, setAttendeeNames] = useState<Record<number, string[]>>({});

  // Reservation & payment state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reservation, setReservation] = useState<any>(null);
  const [confirmedData, setConfirmedData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins

  // Card mock state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [emailResent, setEmailResent] = useState(false);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.displayName || user.email.split('@')[0]);
      if (!customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setErrorMessage(null);
      setReservation(null);
      setConfirmedData(null);
      setEmailResent(false);

      const firstAvailable = ticketTypes.find((t) => !t.isSoldOut);
      if (firstAvailable) {
        setQuantities({ [firstAvailable.id]: 1 });
      } else {
        setQuantities({});
      }
    }
  }, [isOpen, ticketTypes]);

  useEffect(() => {
    if (!reservation?.booking?.reservationExpiresAt || step === 'confirmed') return;

    const interval = setInterval(() => {
      const expiresAt = new Date(reservation.booking.reservationExpiresAt).getTime();
      const diffSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(diffSeconds);

      if (diffSeconds <= 0) {
        setErrorMessage('Your ticket reservation has expired. Please select your tickets again.');
        setStep('select');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation, step]);

  if (!isOpen) return null;

  // Financial calculations
  const subtotalCents = ticketTypes.reduce((acc, t) => {
    const qty = quantities[t.id] || 0;
    return acc + qty * t.price;
  }, 0);

  const totalTicketsSelected = Object.values(quantities).reduce((a, b) => a + b, 0);
  const isFreeTotal = subtotalCents === 0 && totalTicketsSelected > 0;
  const serviceFeeCents = isFreeTotal || totalTicketsSelected === 0 ? 0 : Math.round((subtotalCents * 0.05) + 150);
  const taxCents = isFreeTotal || totalTicketsSelected === 0 ? 0 : Math.round(subtotalCents * 0.0825);
  const grandTotalCents = subtotalCents + serviceFeeCents + taxCents;

  const handleQuantityChange = (tierId: number, delta: number, maxAllowed: number) => {
    const current = quantities[tierId] || 0;
    const next = Math.max(0, Math.min(maxAllowed, current + delta));
    setQuantities((prev) => ({ ...prev, [tierId]: next }));
  };

  const handleProceedToDetails = () => {
    if (totalTicketsSelected <= 0) {
      setErrorMessage('Please choose at least 1 ticket.');
      return;
    }
    setErrorMessage(null);
    setStep('details');
  };

  const handleReserveTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage('Name and valid email address are required.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tierIdStr, qty]) => {
        const tId = Number(tierIdStr);
        return {
          ticketTypeId: tId,
          quantity: qty,
          attendeeNames: attendeeNames[tId] || [],
        };
      });

    try {
      const res = await fetch('/api/bookings/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          eventId: event.id,
          items,
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reserve inventory');
      }

      setReservation(data);
      if (data.isFree) {
        await executeCheckout(data.booking.bookingReference, 'free_checkout');
      } else {
        setStep('payment');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating reservation');
    } finally {
      setLoading(false);
    }
  };

  const executeCheckout = async (bookingReference: string, gateway: string) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const checkoutRes = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference, gateway }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error || 'Checkout initiation failed');

      if (checkoutData.isFree) {
        setConfirmedData(checkoutData);
        setStep('confirmed');
        if (onBookingSuccess) onBookingSuccess(bookingReference);
        return;
      }

      const verifyRes = await fetch('/api/bookings/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference,
          paymentReference: checkoutData.paymentReference,
          gateway: 'stripe',
          metadata: { cardBrand: 'visa', last4: '4242' },
        }),
      });

      const confirmed = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(confirmed.error || 'Payment confirmation failed');

      setConfirmedData(confirmed);
      setStep('confirmed');
      if (onBookingSuccess) onBookingSuccess(bookingReference);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!confirmedData?.booking?.bookingReference) return;
    try {
      await fetch(`/api/bookings/${confirmedData.booking.bookingReference}/resend-email`, {
        method: 'POST',
      });
      setEmailResent(true);
    } catch (err) {
      console.error(err);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FCFAF7] border border-[#E5DAC8] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-stone-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EADBCA] flex items-center justify-between bg-[#F7F2EA]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-[#EBD8C0] text-[#5C330B] px-2 py-0.5 rounded font-bold">
                {step === 'select' && 'Step 1: Choose Tickets'}
                {step === 'details' && 'Step 2: Attendee Details'}
                {step === 'payment' && 'Step 3: Secure Checkout'}
                {step === 'confirmed' && 'Pass Confirmed'}
                {step === 'pending_review' && 'Awaiting Admin Approval'}
              </span>
              {step !== 'confirmed' && step !== 'pending_review' && reservation && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-bold">
                  <Clock className="w-3 h-3 animate-spin" />
                  Reserved: {formatSeconds(timeLeft)}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-stone-900 mt-1 line-clamp-1">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-[#EADBCA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: SELECT TICKETS */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-600">
                Select your admission tiers below. Quantities are held in an atomic queue with real-time inventory protection.
              </div>

              <div className="space-y-3">
                {ticketTypes.map((tier) => {
                  const qty = quantities[tier.id] || 0;
                  const maxAllowed = Math.min(tier.maxPerOrder, tier.remainingQuantity);
                  const isSoldOut = tier.isSoldOut || tier.remainingQuantity <= 0;

                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-xl border transition-all ${
                        qty > 0
                          ? 'border-[#965A28] bg-[#F7EFE4] ring-1 ring-[#965A28]/30 shadow-xs'
                          : isSoldOut
                          ? 'border-[#EADBCA] bg-[#F5EDE1] opacity-60'
                          : 'border-[#EADBCA] bg-white hover:border-[#C2824A]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-stone-900">{tier.name}</h4>
                            {tier.remainingQuantity <= 15 && !isSoldOut && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">
                                Only {tier.remainingQuantity} left!
                              </span>
                            )}
                            {isSoldOut && (
                              <span className="text-[10px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-mono uppercase">
                                Sold Out
                              </span>
                            )}
                          </div>
                          {tier.description && (
                            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                              {tier.description}
                            </p>
                          )}
                          <div className="mt-2 text-xs font-mono">
                            <span className="text-base font-extrabold text-stone-900">
                              {tier.price === 0 ? 'Free' : `$${(tier.price / 100).toFixed(2)}`}
                            </span>
                            <span className="text-stone-500 text-[11px] ml-1.5">
                              (limit {tier.maxPerOrder} / order)
                            </span>
                          </div>
                        </div>

                        {/* Quantity Counter */}
                        {!isSoldOut ? (
                          <div className="flex items-center gap-3 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl p-1 shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(tier.id, -1, maxAllowed)}
                              disabled={qty <= 0}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-700 hover:text-stone-950 hover:bg-[#EADBCA] disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono text-sm font-bold w-5 text-center text-stone-900">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(tier.id, 1, maxAllowed)}
                              disabled={qty >= maxAllowed}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-700 hover:text-stone-950 hover:bg-[#EADBCA] disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-stone-500">Unavailable</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Summary Breakdown */}
              {totalTicketsSelected > 0 && (
                <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#EADBCA] space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Tickets Subtotal ({totalTicketsSelected}):</span>
                    <span className="font-semibold text-stone-900">${(subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  {!isFreeTotal && (
                    <>
                      <div className="flex justify-between text-stone-600">
                        <span>Platform Service Fee (5% + $1.50):</span>
                        <span className="font-semibold text-stone-900">${(serviceFeeCents / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Estimated State & Local Taxes (8.25%):</span>
                        <span className="font-semibold text-stone-900">${(taxCents / 100).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-[#EADBCA] pt-2 flex justify-between font-bold text-sm text-stone-900">
                    <span>Order Total:</span>
                    <span className="text-[#965A28] font-mono text-base">
                      {isFreeTotal ? 'FREE' : `$${(grandTotalCents / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ATTENDEE DETAILS */}
          {step === 'details' && (
            <form onSubmit={handleReserveTickets} className="space-y-4">
              <div className="p-3 bg-[#F5EDE1] border border-[#DECAAC] rounded-xl text-xs text-[#5C330B] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#965A28]" />
                <span>
                  Your reservation locks selected tickets for 15 minutes while you complete checkout.
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono">
                  Primary Contact & Ticket Holder
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-stone-600 font-semibold block mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#965A28]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-600 font-semibold block mb-1">
                      Email for Digital Tickets *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#965A28]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-stone-600 font-semibold block mb-1">
                    Phone (SMS Ticket Alerts & Gate Updates)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 234-5678"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#965A28]"
                    />
                  </div>
                </div>
              </div>

              {/* Order summary bar */}
              <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#EADBCA] flex justify-between items-center text-xs">
                <span className="text-stone-600">
                  Total for {totalTicketsSelected} ticket(s):
                </span>
                <span className="font-mono font-bold text-sm text-[#965A28]">
                  {isFreeTotal ? 'FREE' : `$${(grandTotalCents / 100).toFixed(2)}`}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-4 py-2.5 border border-[#DFD3C3] bg-white rounded-xl text-xs font-semibold text-stone-700 hover:bg-[#FAF6EF]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#965A28] hover:bg-[#824B1E] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-[#965A28]/20"
                >
                  {loading ? (
                    'Securing Inventory...'
                  ) : (
                    <>
                      <span>{isFreeTotal ? 'Claim Free Tickets' : 'Proceed to Payment'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PAYMENT SCREEN & ORDER SUBMISSION */}
          {step === 'payment' && reservation && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#EADBCA] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-600">Booking Reference:</span>
                  <span className="font-mono text-[#965A28] font-bold">
                    {reservation.booking.bookingReference}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-600">Total Amount:</span>
                  <span className="font-mono text-base font-extrabold text-stone-900">
                    ${(grandTotalCents / 100).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('instant_card')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMode === 'instant_card'
                      ? 'bg-[#FBF6EE] border-[#965A28] ring-1 ring-[#965A28] shadow-xs'
                      : 'bg-white border-[#DFD3C3] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <CreditCard className="w-3.5 h-3.5 text-[#965A28]" />
                    <span>Card Payment</span>
                  </div>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Instant Stripe checkout & QR passes
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('manual_review')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMode === 'manual_review'
                      ? 'bg-[#FBF6EE] border-[#965A28] ring-1 ring-[#965A28] shadow-xs'
                      : 'bg-white border-[#DFD3C3] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <Clock className="w-3.5 h-3.5 text-[#965A28]" />
                    <span>Admin Approval</span>
                  </div>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Pay at door / bank wire / organizer review
                  </span>
                </button>
              </div>

              {paymentMode === 'instant_card' ? (
                /* Stripe Payment Simulator Card Form */
                <div className="p-4 rounded-xl border border-[#DFD3C3] bg-white space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#965A28]" />
                      <span className="text-xs font-bold text-stone-900">
                        Stripe Card Payment
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                      256-Bit SSL Encrypted
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-stone-600 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-lg text-xs font-mono text-stone-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-stone-600 block mb-1">Expires</label>
                        <input
                          type="text"
                          value={cardExp}
                          onChange={(e) => setCardExp(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-lg text-xs font-mono text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-stone-600 block mb-1">CVC</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#DFD3C3] rounded-lg text-xs font-mono text-stone-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Offline / Manual Review Explanation */
                <div className="p-4 rounded-xl border border-[#DFD3C3] bg-white space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold text-stone-900">
                      Submit Order for Organizer & Admin Approval
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    This order will be registered in the PostgreSQL database with status <strong>Pending Review</strong>.
                  </p>
                  <ul className="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                    <li>Tickets are reserved and locked against overselling</li>
                    <li>The Platform Administrator / Organizer can review, <strong>Accept & Confirm</strong>, or <strong>Reject</strong> this booking in the Admin Hub</li>
                    <li>Ideal for bank wire transfers, corporate invoicing, door cash pickup, or VIP pass approvals</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-2.5 border border-[#DFD3C3] bg-white rounded-xl text-xs font-semibold text-stone-700 hover:bg-[#FAF6EF]"
                >
                  Back
                </button>

                {paymentMode === 'instant_card' ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executeCheckout(reservation.booking.bookingReference, 'stripe')}
                    className="flex-1 py-3 bg-[#965A28] hover:bg-[#824B1E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#965A28]/25"
                  >
                    {loading ? (
                      'Authorizing via Stripe Gateway...'
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pay ${(grandTotalCents / 100).toFixed(2)} & Issue E-Tickets</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setStep('pending_review');
                      if (onBookingSuccess) onBookingSuccess(reservation.booking.bookingReference);
                    }}
                    className="flex-1 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-700/20"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Submit Order for Admin Review</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP: PENDING REVIEW CONFIRMATION */}
          {step === 'pending_review' && reservation && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto border border-amber-300 animate-in zoom-in-75">
                <Clock className="w-9 h-9" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-bold">
                  Order Status: Awaiting Admin Approval
                </span>
                <h3 className="text-xl font-extrabold text-stone-900 mt-2">Order Submitted for Review!</h3>
                <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                  Your tickets have been safely reserved in the database. The event administrator or organizer can now review your order to accept & issue your digital QR passes or reject it.
                </p>
                <div className="mt-3 inline-block bg-[#FAF7F0] border border-[#EADBCA] rounded-xl px-4 py-2 font-mono text-sm text-[#965A28] font-bold">
                  Ref: {reservation.booking.bookingReference}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#EADBCA] text-left text-xs space-y-2 shadow-xs max-w-lg mx-auto">
                <div className="flex justify-between text-stone-600">
                  <span>Customer:</span>
                  <span className="font-semibold text-stone-900">{customerName} ({customerEmail})</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Event:</span>
                  <span className="font-semibold text-stone-900">{event.title}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Reserved Seats:</span>
                  <span className="font-semibold text-stone-900">{totalTicketsSelected} tickets</span>
                </div>
                <div className="flex justify-between text-stone-900 font-bold border-t border-[#F0E6D8] pt-2">
                  <span>Total Amount:</span>
                  <span className="font-mono text-[#965A28]">${(grandTotalCents / 100).toFixed(2)} USD</span>
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-left text-xs text-stone-600 max-w-lg mx-auto space-y-1">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Next Steps:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  1. Track status in <strong>My Tickets → Pending Approval</strong> tab.<br />
                  2. As an Admin or Organizer, head to <strong>Admin Hub → Orders & Booking Requests</strong> to click <strong>Accept</strong> or <strong>Reject</strong>.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold shadow-md"
                >
                  Done & View My Tickets
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMED & TICKET QR ACCESS */}
          {step === 'confirmed' && confirmedData && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto border border-emerald-300 animate-in zoom-in-75">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-stone-900">Tickets Confirmed!</h3>
                <p className="text-xs text-stone-600 mt-1">
                  Your admission passes have been registered on the PostgreSQL database.
                </p>
                <div className="mt-3 inline-block bg-[#FAF7F0] border border-[#EADBCA] rounded-xl px-4 py-2 font-mono text-sm text-[#965A28] font-bold">
                  Ref: {confirmedData.booking?.bookingReference || reservation?.booking?.bookingReference}
                </div>
              </div>

              {/* Display Generated QR Codes */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-left font-mono">
                  Your Digital Passes ({confirmedData.tickets?.length || 1})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {confirmedData.tickets?.map((t: any, idx: number) => (
                    <div
                      key={t.id || idx}
                      className="p-4 rounded-2xl bg-white border border-[#EADBCA] flex flex-col items-center text-center space-y-3 shadow-xs"
                    >
                      <div className="p-2 bg-white rounded-xl border border-stone-200 shadow-sm">
                        <img
                          src={t.qrData}
                          alt="Ticket QR Code"
                          className="w-36 h-36 object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#965A28] uppercase font-bold">
                          {t.ticketCode}
                        </div>
                        <div className="text-xs font-bold text-stone-900 mt-0.5">
                          {t.attendeeName}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold">
                          ✓ Ready for gate scan
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-[#DFD3C3] bg-white hover:bg-[#FAF6EF] text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 shadow-xs"
                >
                  <Mail className="w-4 h-4 text-[#965A28]" />
                  <span>{emailResent ? 'Email Dispatched!' : 'Resend Email Receipt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-[#DFD3C3] bg-white hover:bg-[#FAF6EF] text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-[#965A28]" />
                  <span>Print Digital Passes</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls for Step 1 */}
        {step === 'select' && (
          <div className="px-6 py-4 border-t border-[#EADBCA] bg-[#FAF7F0] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-mono block">
                Total Tickets
              </span>
              <span className="text-sm font-bold text-stone-900">
                {totalTicketsSelected} {totalTicketsSelected === 1 ? 'ticket' : 'tickets'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleProceedToDetails}
              disabled={totalTicketsSelected <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#965A28] hover:bg-[#824B1E] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-[#965A28]/20"
            >
              <span>Next: Attendee Info</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer for Confirmed Step */}
        {step === 'confirmed' && (
          <div className="px-6 py-4 border-t border-[#EADBCA] bg-[#FAF7F0] flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#965A28] hover:bg-[#824B1E] text-white text-xs font-semibold shadow-md"
            >
              Done & View My Tickets
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

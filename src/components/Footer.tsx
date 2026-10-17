import React, { useState } from 'react';
import { Ticket, Mail, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const Footer: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="border-t border-[#EADBCA] bg-[#F4EDE2] text-stone-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Vision */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#9B5E28] to-[#D9A364] flex items-center justify-center text-white shadow-md shadow-[#9B5E28]/20">
                <Ticket className="w-5 h-5 transform -rotate-12" />
              </div>
              <span className="font-extrabold text-xl text-stone-900">
                Pulse<span className="text-[#9B5E28]">Pass</span>
              </span>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed max-w-sm">
              The high-performance event & concert ticketing infrastructure. Concurrency-safe inventory, cryptographic digital passes, instant gate check-ins, and verified artist experiences.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-800 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Scam-Free
              </span>
              <span className="flex items-center gap-1 text-[#8A5120] font-medium">
                <Zap className="w-4 h-4 text-[#B87A3E]" /> Instant E-Delivery
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-4 font-mono">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-[#8A5120] transition-colors"
                >
                  All Upcoming Concerts
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#8A5120] transition-colors"
                >
                  Featured Festivals
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('my-tickets')}
                  className="hover:text-[#8A5120] transition-colors"
                >
                  My Digital Tickets
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('check-in')}
                  className="hover:text-[#8A5120] transition-colors"
                >
                  Gate Check-In Desk
                </button>
              </li>
            </ul>
          </div>

          {/* Organizer & Trust */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-4 font-mono">
              Organizers
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button
                  onClick={() => onNavigate('admin')}
                  className="hover:text-[#8A5120] transition-colors"
                >
                  Host An Event
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('admin')}
                  className="hover:text-[#8A5120] transition-colors"
                >
                  Inventory & Pricing
                </button>
              </li>
              <li>
                <span className="text-stone-400 cursor-not-allowed">Stripe Verified Payouts</span>
              </li>
              <li>
                <span className="text-stone-400 cursor-not-allowed">API & Webhooks</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-4 font-mono">
              Event Drops & Presales
            </h4>
            <p className="text-xs text-stone-600 mb-3">
              Get notified of early-bird ticket releases, secret shows, and lineup drops.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>You're subscribed to early presale alerts!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#DFD3C3] rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#965A28] transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#965A28] hover:bg-[#824B1E] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Join VIP Presale List
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[#DFD3C3] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            © {new Date().getFullYear()} PulsePass Live Technologies. Built with PostgreSQL, Drizzle ORM & Cloud SQL.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-stone-800 cursor-pointer">Terms of Service</span>
            <span className="hover:text-stone-800 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-stone-800 cursor-pointer">Refund Guarantee</span>
            <span className="hover:text-stone-800 cursor-pointer">Contact Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

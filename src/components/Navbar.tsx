import React, { useState } from 'react';
import {
  Ticket,
  Search,
  User,
  Shield,
  QrCode,
  LogOut,
  Menu,
  X,
  Compass,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, role, switchRole, signInWithGoogle, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Discover', icon: Compass },
    { id: 'explore', label: 'Explore Events', icon: Search },
    { id: 'my-tickets', label: 'My Tickets', icon: Ticket },
  ];

  if (role === 'staff' || role === 'organizer' || role === 'admin') {
    navItems.push({ id: 'check-in', label: 'Check-In Desk', icon: QrCode });
  }

  if (role === 'organizer' || role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Hub', icon: Shield });
  }

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Platform Admin', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    organizer: { label: 'Organizer', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    staff: { label: 'Gate Staff', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    customer: { label: 'Customer', color: 'bg-[#EEDEC8] text-[#59340E] border-[#D8C2A2]' },
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EADBCA] bg-[#FAF7F0]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentTab('home')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9B5E28] via-[#B87A3E] to-[#DEC69E] flex items-center justify-center shadow-md shadow-[#B87A3E]/20 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5 text-white transform -rotate-12" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-stone-900 flex items-center gap-1.5">
                Pulse<span className="text-[#9B5E28]">Pass</span>
              </span>
              <span className="text-[10px] text-stone-500 font-mono tracking-wider block -mt-1 uppercase">
                Ticketing Platform
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#EFE3D2] text-[#4F2B07] border border-[#DECAAC] shadow-xs'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-[#F2E8DC]/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#8A5120]' : 'text-stone-500'}`} />
                  {item.label}
                  {item.id === 'admin' && (
                    <span className="text-[10px] bg-[#E2CEB0] text-[#4F2B07] px-1.5 py-0.5 rounded font-mono uppercase">
                      Pro
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${roleLabels[role]?.color || 'bg-white text-stone-700 border-stone-300'}`}
                title="Switch active role demo persona"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-mono uppercase">{roleLabels[role]?.label || role}</span>
                <span className="text-[10px] opacity-70">▼</span>
              </button>

              {roleSwitcherOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E5DAC8] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
                  onClick={() => setRoleSwitcherOpen(false)}
                >
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider px-2 py-1">
                    Select Demo Persona
                  </div>
                  {(['admin', 'organizer', 'staff', 'customer'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => switchRole(r)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between ${
                        role === r
                          ? 'bg-[#EEDEC8] text-[#4F2B07] font-bold'
                          : 'text-stone-700 hover:bg-[#FAF6EF]'
                      }`}
                    >
                      <span className="capitalize">{roleLabels[r].label}</span>
                      {role === r && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile / Sign in */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-[#DFD3C3] hover:border-stone-400 bg-white shadow-xs transition-colors"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}`}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#C2824A]/40"
                  />
                  <span className="text-xs font-semibold text-stone-800 max-w-[120px] truncate">
                    {user.displayName || user.email.split('@')[0]}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#E5DAC8] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-[#F0E6D8]">
                      <p className="text-xs font-bold text-stone-900">{user.displayName}</p>
                      <p className="text-[11px] text-stone-500 font-mono truncate">{user.email}</p>
                      <div className="mt-1.5 inline-block text-[10px] font-mono uppercase bg-[#F5EFE6] text-[#7A4B1D] px-2 py-0.5 rounded border border-[#E2D4C1]">
                        Role: {user.role}
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => setCurrentTab('my-tickets')}
                        className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:text-stone-950 hover:bg-[#FAF6EF] rounded-xl flex items-center gap-2"
                      >
                        <Ticket className="w-3.5 h-3.5 text-[#965A28]" />
                        My Digital Tickets
                      </button>
                      {(user.role === 'admin' || user.role === 'organizer') && (
                        <button
                          onClick={() => setCurrentTab('admin')}
                          className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:text-stone-950 hover:bg-[#FAF6EF] rounded-xl flex items-center gap-2"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#965A28]" />
                          Management Hub
                        </button>
                      )}
                    </div>
                    <div className="border-t border-[#F0E6D8] pt-1">
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#965A28] hover:bg-[#824B1E] text-white shadow-md shadow-[#965A28]/20 transition-all"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="text-[10px] font-mono uppercase bg-[#EEDEC8] text-[#59340E] px-2 py-1 rounded border border-[#D8C2A2]"
            >
              {role}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-[#F2E8DC]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#EADBCA] bg-[#FAF7F0] p-4 space-y-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  currentTab === item.id
                    ? 'bg-[#965A28] text-white'
                    : 'text-stone-700 hover:bg-[#F0E6D8]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-[#EADBCA] space-y-2">
            <div className="text-xs text-stone-500 font-mono">Switch Role:</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['customer', 'organizer', 'staff', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-xs py-1.5 px-2 rounded-lg font-mono uppercase ${
                    role === r
                      ? 'bg-[#965A28] text-white'
                      : 'bg-white text-stone-700 border border-[#DFD3C3]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {user ? (
              <div className="pt-2">
                <button
                  onClick={logout}
                  className="w-full text-center py-2 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl"
                >
                  Sign Out ({user.displayName || user.email})
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="w-full py-2.5 text-xs font-semibold bg-[#965A28] text-white rounded-xl"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

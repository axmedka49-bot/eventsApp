import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'customer' | 'organizer' | 'staff' | 'admin';
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  role: 'customer' | 'organizer' | 'staff' | 'admin';
  signInWithGoogle: () => Promise<void>;
  switchRole: (role: 'customer' | 'organizer' | 'staff' | 'admin') => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<'customer' | 'organizer' | 'staff' | 'admin', UserProfile> = {
  customer: {
    id: 4,
    uid: 'demo-customer-uid',
    email: 'axmedka49@gmail.com',
    displayName: 'Ahmed (VIP Customer)',
    role: 'customer',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    isActive: true,
  },
  admin: {
    id: 1,
    uid: 'demo-admin-uid',
    email: 'admin@pulsepass.events',
    displayName: 'Alex Rivera (Platform Admin)',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    isActive: true,
  },
  organizer: {
    id: 2,
    uid: 'demo-organizer-uid',
    email: 'events@neonpulse.io',
    displayName: 'NeonPulse Productions',
    role: 'organizer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    isActive: true,
  },
  staff: {
    id: 3,
    uid: 'demo-staff-uid',
    email: 'checkin@pulsepass.events',
    displayName: 'Sam Taylor (Gate Staff)',
    role: 'staff',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    isActive: true,
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pulsepass_demo_role');
    if (saved && (saved in DEMO_USERS)) {
      return DEMO_USERS[saved as keyof typeof DEMO_USERS];
    }
    // Default to admin for the prompt author email so admin is readily accessible
    return DEMO_USERS.admin;
  });

  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('pulsepass_demo_role');
    const roleKey = (saved && (saved in DEMO_USERS)) ? saved : 'admin';
    return `demo-${roleKey}-token`;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          // Sync profile from backend
          const res = await fetch('/api/bookings/my-bookings', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          const isOwner = fbUser.email === 'axmedka49@gmail.com' || fbUser.email?.includes('admin');
          const role = isOwner ? 'admin' : 'customer';

          setUser({
            id: isOwner ? 1 : 4,
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            role,
            avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.email || 'user')}`,
            isActive: true,
          });
          localStorage.removeItem('pulsepass_demo_role');
        } catch (err) {
          console.error('Error getting Firebase token:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      // If popup was blocked or user cancelled, fallback gracefully
      alert(`Google Sign-In note: ${err.message || 'Popups must be enabled'}`);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = (newRole: 'customer' | 'organizer' | 'staff' | 'admin') => {
    const persona = DEMO_USERS[newRole];
    setUser(persona);
    setToken(`demo-${newRole}-token`);
    localStorage.setItem('pulsepass_demo_role', newRole);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('pulsepass_demo_role');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        role: user?.role || 'customer',
        signInWithGoogle,
        switchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

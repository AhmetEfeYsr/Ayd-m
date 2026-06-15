"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../firebase';
import * as Comlink from 'comlink';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  tenantId: string | null;
  publicKey?: string | null;
  encryptedPrivateKey?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  syncSession: (fUser: FirebaseUser) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  logout: async () => {},
  syncSession: async () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Syncs the Firebase ID Token with our Next.js backend cookie-based session
  const syncSession = async (fUser: FirebaseUser): Promise<boolean> => {
    try {
      const idToken = await fUser.getIdToken();
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // If user not registered in DB, sign out from Firebase
        if (errorData.code === 'USER_NOT_REGISTERED') {
          await firebaseSignOut(auth);
        }
        throw new Error(errorData.error || 'Session sync failed');
      }

      const data = await res.json();
      setUser(data.user);
      return true;
    } catch (err) {
      console.error('Session sync error:', err);
      setUser(null);
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/session', { method: 'DELETE' });
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        await syncSession(fUser);
      } else {
        setUser(null);
        // Clear server-side cookie as well
        await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout, syncSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

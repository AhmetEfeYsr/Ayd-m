import { auth } from '../lib/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { API_URL } from '../constants/api';

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  const getToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken(true);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return {
    getToken,
    signOut,
    isSignedIn: !!userId,
    userId,
  };
}

export function useUser() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((fUser) => {
      if (fUser) {
        setUser({
          id: fUser.uid,
          emailAddress: fUser.email,
          update: async (data: any) => {
            const token = await fUser.getIdToken();
            const pushToken = data.unsafeMetadata?.expoPushToken;
            if (pushToken) {
              await fetch(`${API_URL}/api/mobile/user/push-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ pushToken })
              }).catch(console.error);
            }
          },
          unsafeMetadata: {
            expoPushToken: null
          }
        });
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  return { user };
}

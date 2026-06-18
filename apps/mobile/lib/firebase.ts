import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth/react-native';
import * as SecureStore from 'expo-secure-store';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'placeholder_api_key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder_auth_domain',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder_project_id',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'placeholder_app_id',
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Custom AsyncStorage-like storage wrapper for Expo SecureStore
const secureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  }
};

// Initialize Firebase Auth with SecureStore persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(secureStorage as any)
});

export default app;

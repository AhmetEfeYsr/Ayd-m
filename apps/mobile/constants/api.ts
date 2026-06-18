import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Fallback logic if environment variable is not provided
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Local development fallback
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    return `http://${debuggerHost.split(':')[0]}:3000`;
  }
  
  // Emulator fallbacks
  const FALLBACK_URL = 'https://aydim.com';
  
  return FALLBACK_URL;
};

export const API_URL = getBaseUrl();

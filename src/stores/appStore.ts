import { create } from 'zustand';
import { UserProfile } from '../db/schema';

interface AppState {
  isAuthenticated: boolean;
  tenantId: string;
  organizationName: string;
  currentUser: UserProfile | null;
  networkStatus: 'online' | 'offline';
  pendingSyncCount: number;
  setNetworkStatus: (status: 'online' | 'offline') => void;
  setPendingSyncCount: (count: number) => void;
  login: (profile: UserProfile) => void;
  logout: () => void;
}

const STORAGE_KEY = 'copa-user-profile';

const getInitialProfile = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error('Failed to parse stored profile', e);
    return null;
  }
};

const initialProfile = getInitialProfile();

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: !!initialProfile,
  tenantId: initialProfile?.tenantId || 'default-tenant',
  organizationName: initialProfile?.organizationName || '',
  currentUser: initialProfile,
  networkStatus: typeof window !== 'undefined' && window.navigator.onLine ? 'online' : 'offline',
  pendingSyncCount: 0,
  setNetworkStatus: (status) => set({ networkStatus: status }),
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
  login: (profile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    set({
      isAuthenticated: true,
      tenantId: profile.tenantId,
      organizationName: profile.organizationName,
      currentUser: profile
    });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      isAuthenticated: false,
      tenantId: 'default-tenant',
      organizationName: '',
      currentUser: null
    });
  }
}));

export const initNetworkListeners = () => {
  if (typeof window === 'undefined') return;

  const handleOnline = () => useAppStore.getState().setNetworkStatus('online');
  const handleOffline = () => useAppStore.getState().setNetworkStatus('offline');

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

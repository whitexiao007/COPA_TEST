import { create } from 'zustand';

interface User {
  name: string;
  role: 'admin' | 'supervisor' | 'inspector';
}

interface AppState {
  tenantId: string;
  currentUser: User | null;
  networkStatus: 'online' | 'offline';
  pendingSyncCount: number;
  setNetworkStatus: (status: 'online' | 'offline') => void;
  setPendingSyncCount: (count: number) => void;
  setCurrentUser: (user: User | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tenantId: 'default-tenant',
  currentUser: { name: 'Field Inspector', role: 'inspector' },
  networkStatus: typeof window !== 'undefined' && window.navigator.onLine ? 'online' : 'offline',
  pendingSyncCount: 0,
  setNetworkStatus: (status) => set({ networkStatus: status }),
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
  setCurrentUser: (user) => set({ currentUser: user }),
}));

export const initNetworkListeners = () => {
  if (typeof window === 'undefined') return;

  const handleOnline = () => useAppStore.getState().setNetworkStatus('online');
  const handleOffline = () => useAppStore.getState().setNetworkStatus('offline');

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return a cleanup function if needed, but the requirement is just to init them.
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

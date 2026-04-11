import { useAppStore } from '@/src/stores/appStore';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function ConnectivityIndicator() {
  const networkStatus = useAppStore((state) => state.networkStatus);
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);

  if (networkStatus === 'offline') {
    return (
      <div className="flex items-center gap-1.5 text-red-500">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">Offline</span>
        <WifiOff className="w-3 h-3" />
      </div>
    );
  }

  if (pendingSyncCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-amber-500">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">Syncing {pendingSyncCount}</span>
        <RefreshCw className="w-3 h-3 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-green-500">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-xs font-bold uppercase tracking-wider">Online</span>
      <Wifi className="w-3 h-3" />
    </div>
  );
}

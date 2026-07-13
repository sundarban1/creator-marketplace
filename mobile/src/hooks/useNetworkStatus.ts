import { useEffect, useRef, useState } from 'react';
import { network } from '@/lib/network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(network.isOnline());
  // Bumps every time the connection is restored after being lost — screens
  // can depend on this in a useEffect to trigger a refetch on reconnect.
  const [reconnectedAt, setReconnectedAt] = useState(0);
  const wasOffline = useRef(false);

  useEffect(() => {
    return network.subscribe((online) => {
      setIsOnline(online);
      if (online && wasOffline.current) setReconnectedAt(Date.now());
      wasOffline.current = !online;
    });
  }, []);

  return { isOnline, reconnectedAt };
}

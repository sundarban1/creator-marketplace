import { useEffect, useState } from 'react';
import { fetchInvitations, type Invitation } from '../api/creator';

export interface InvitationsState {
  items: Invitation[];
  pendingCount: number;
  loading: boolean;
  error: Error | null;
  reload: () => void;
  setItem: (updated: Invitation) => void;
}

/** Fetches the creator's campaign invitations (accept/decline or apply-now, per campaign type). */
export function useInvitations(): InvitationsState {
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetchInvitations(controller.signal)
      .then((list) => {
        if (active) {
          setItems(list);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [nonce]);

  return {
    items,
    pendingCount: items.filter((i) => i.status === 'PENDING').length,
    loading,
    error,
    reload: () => setNonce((n) => n + 1),
    setItem: (updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))),
  };
}

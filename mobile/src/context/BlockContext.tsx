import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { blockService, type BlockSource } from '@/services/safety';
import { blockEvents, blockSync } from '@/lib/blockEvents';
import { queryClient } from '@/lib/queryClient';

// The signed-in user's blocks, app-wide.
//
//   - `blockedIds` (userIds this user blocked) lets any screen reflect a
//     block the instant it succeeds;
//   - block()/unblock() call the server FIRST and only update local state on
//     success — a block is never shown as done if the server didn't accept it;
//   - after a change every React Query cache is invalidated and we wait
//     (capped) for what's on screen to refetch, so screens underneath are
//     already clean when the caller navigates back. The server filters every
//     feed, so a refetch can't bring the content back.
interface BlockContextValue {
  blockedIds: ReadonlySet<string>;
  isBlocked: (userId: string | null | undefined) => boolean;
  block: (userIdOrProfileId: string, source?: BlockSource, conversationId?: string) => Promise<string>;
  unblock: (userIdOrProfileId: string) => Promise<string>;
}

const BlockContext = createContext<BlockContextValue | null>(null);
const EMPTY: string[] = [];
const idsKey = (userId: string | null) => ['blockIds', userId] as const;

export function BlockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const ids = useQuery({
    queryKey: idsKey(userId),
    queryFn: () => blockService.ids(),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const blockedIds: ReadonlySet<string> = new Set(userId ? ids.data ?? EMPTY : EMPTY);

  // Another of this user's devices changed the list (socket → blockSync).
  useEffect(() => blockSync.subscribe(() => {
    void queryClient.invalidateQueries();
    blockEvents.emit();
  }), []);

  function setIds(update: (prev: string[]) => string[]) {
    queryClient.setQueryData<string[]>(idsKey(userId), (prev) => update(prev ?? []));
  }

  async function afterChange() {
    blockEvents.emit();
    await Promise.race([
      queryClient.invalidateQueries().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }

  async function block(target: string, source: BlockSource = 'profile', conversationId?: string) {
    const res = await blockService.block(target, source, conversationId);
    setIds((prev) => (prev.includes(res.userId) ? prev : [...prev, res.userId]));
    await afterChange();
    return res.userId;
  }

  async function unblock(target: string) {
    const res = await blockService.unblock(target);
    setIds((prev) => prev.filter((id) => id !== res.userId));
    await afterChange();
    return res.userId;
  }

  const value: BlockContextValue = {
    blockedIds,
    isBlocked: (id) => !!id && blockedIds.has(id),
    block,
    unblock,
  };
  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>;
}

export function useBlocks(): BlockContextValue {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error('useBlocks must be used inside <BlockProvider>');
  return ctx;
}

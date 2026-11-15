import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/services/chat';
import { useBlocks } from '@/context/BlockContext';

/**
 * Block state for one conversation (any type — creator↔business or
 * creator↔creator). `blockedByMe` follows BlockContext, so blocking from the
 * chat's ⋯ menu (or a profile) flips the composer to the blocked banner at
 * once; `blockedByOther` comes from the server. Refreshed with every other
 * query when a block changes (BlockContext invalidates the cache).
 */
export function useConversationBlock(conversationId: string | undefined) {
  const blocks = useBlocks();
  const q = useQuery({
    queryKey: ['conversationBlock', conversationId],
    queryFn: () => chatService.getBlockStatus(conversationId!),
    enabled: !!conversationId,
  });
  const status = q.data;
  if (!status) return null;
  return {
    otherUserId: status.otherUserId,
    blockedByMe: status.otherUserId ? blocks.isBlocked(status.otherUserId) : status.blockedByMe,
    blockedByOther: status.blockedByOther,
  };
}

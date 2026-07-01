import type { ApiMessage } from './api';

type Payload = { conversationId: string; message: ApiMessage };
type Listener = (data: Payload) => void;

const listeners = new Set<Listener>();

export const incomingMessageEvents = {
  emit(data: Payload) {
    listeners.forEach((fn) => fn(data));
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

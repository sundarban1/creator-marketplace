type Listener = () => void;
const listeners = new Set<Listener>();

export const messagingEvents = {
  refresh() {
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

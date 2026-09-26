import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from './cn';

type Tone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
  visible: boolean;
}

export interface ToastApi {
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  warning: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<Tone, { wrap: string; icon: ReactNode }> = {
  success: { wrap: 'bg-success-soft text-success', icon: <CheckCircle2 size={17} /> },
  error: { wrap: 'bg-danger-soft text-danger', icon: <AlertCircle size={17} /> },
  info: { wrap: 'bg-brand/10 text-brand', icon: <Info size={17} /> },
  warning: { wrap: 'bg-warning-soft text-warning', icon: <AlertTriangle size={17} /> },
};

const AUTO_DISMISS_MS = 3800;
const EXIT_MS = 250;

/**
 * Toast stack, top-right, each entry sliding in from off-screen right. Mounted
 * once in `AppProviders` so any authed screen can call `useToast()` instead of
 * a page-local `flash`/`Alert` banner.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const push = useCallback(
    (tone: Tone, message: string, durationMs: number = AUTO_DISMISS_MS) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, tone, message, visible: false }]);
      // Mount off-screen first, then flip to visible a frame later so the
      // slide-in transition actually runs instead of snapping straight in.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setItems((prev) => prev.map((t) => (t.id === id ? { ...t, visible: true } : t)));
        });
      });
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, d) => push('success', m, d),
      error: (m, d) => push('error', m, d),
      info: (m, d) => push('info', m, d),
      warning: (m, d) => push('warning', m, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-24">
        {items.map((t) => {
          const tone = TONES[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13.5px] font-medium shadow-lg ring-1 ring-ink/[0.05] transition-all duration-300 ease-out',
                tone.wrap,
                t.visible ? 'translate-x-0 opacity-100' : 'translate-x-[130%] opacity-0',
              )}
            >
              <span className="mt-px flex-shrink-0" aria-hidden>
                {tone.icon}
              </span>
              <span className="min-w-0 flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

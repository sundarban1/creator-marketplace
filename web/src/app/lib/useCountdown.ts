import { useCallback, useEffect, useRef, useState } from 'react';

/** Simple seconds countdown. `start(n)` (re)arms it; `remaining` ticks to 0. */
export function useCountdown(initial = 0): { remaining: number; start: (seconds: number) => void } {
  const [remaining, setRemaining] = useState(initial);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const start = useCallback((seconds: number) => {
    clear();
    setRemaining(seconds);
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clear();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => clear, []);

  return { remaining, start };
}

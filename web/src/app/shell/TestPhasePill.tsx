import { useEffect, useRef, useState } from 'react';

/**
 * Blinking "In Testing Phase" pill for the logged-in top nav. Clicking it
 * opens a notification-style popover explaining the pre-launch test phase.
 */
export function TestPhasePill() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mr-1 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 animate-pulse"
      >
        <span className="sm:hidden">Test</span>
        <span className="hidden sm:inline">In Testing Phase</span>
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[380px]">
          <div className="border-b border-line px-4 py-3">
            <span className="text-[14px] font-semibold text-ink">Testing Phase</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
            <p className="text-[13px] leading-relaxed text-red-600">
              <span className="font-semibold">🧪 Kolab Website in Test Phase</span>
              <br />
              Welcome to Kolab! 🎉 Feel free to explore the platform, create your account, and try out
              the features, workflows, and payment experience. You&rsquo;ll be able to go through the
              complete process using dummy payments, giving you a realistic feel for how Kolab will
              work when you start working on real projects. Please note that no real money will be
              involved during this testing phase.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-indigo">
              Our <span className="font-bold">iOS</span> and <span className="font-bold">Android</span>{' '}
              apps launching soon.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-green-600">
              Good news: Your account will stay active after launch. You can simply continue using the
              same account and login details—no need to sign up again!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { Bell, Search } from 'lucide-react';
import { useLandingLanguage } from '../../context/LanguageContext';
import { AppHomePreview } from './AppHomePreview';
import { MiniCard, CARD_PHOTOS } from './AppHomePreview';

const LAPTOP_SCREEN_W = 400;
const PHONE_W = 320; // AppHomePreview's native 300px + its own 10px border each side
const PHONE_H = 620;

/** Laptop bezel + a thin keyboard-deck base, CSS-only — the screen takes
 * whatever's passed as children (the browser chrome + web content below).
 * `w-full` + a `maxWidth` cap (rather than a fixed px width) so it shrinks
 * to fit a narrow mobile container instead of forcing the page to overflow. */
function LaptopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: LAPTOP_SCREEN_W + 40 }}>
      <div
        className="mx-auto w-full overflow-hidden rounded-t-xl border-[10px] border-b-0 border-slate-800 bg-slate-800 shadow-app-floating dark:border-slate-700"
        style={{ maxWidth: LAPTOP_SCREEN_W }}
      >
        {children}
      </div>
      <div className="relative mx-auto h-4 w-full rounded-b-2xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-sm" style={{ maxWidth: LAPTOP_SCREEN_W + 40 }}>
        <span aria-hidden className="absolute left-1/2 top-0 h-1.5 w-16 -translate-x-1/2 rounded-b-sm bg-slate-500/70" />
      </div>
    </div>
  );
}

/** Mini browser chrome (traffic lights + address pill) wrapping the web
 * content — sits inside LaptopFrame's screen so the address bar reads as
 * "this runs in a browser", not just "this is a website screenshot". */
function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <div className="flex items-center gap-2 border-b border-app-border bg-app-canvas px-3.5 py-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </span>
        <span className="ml-2 flex-1 truncate rounded-full bg-white px-3 py-1 text-center text-[10px] font-medium text-app-muted">
          {url}
        </span>
      </div>
      <div className="p-3.5 sm:p-4">{children}</div>
    </div>
  );
}

function WebContent() {
  const { d } = useLandingLanguage();
  const p = d.appPreview;

  return (
    <>
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="" className="h-5 w-auto flex-shrink-0 object-contain" />
        <div className="flex h-8 flex-1 items-center gap-2 rounded-app-md border border-app-border bg-app-primary-tint px-2.5">
          <Search size={12} className="flex-shrink-0 text-app-muted" />
          <span className="truncate text-[10px] text-app-muted">{p.searchPlaceholder}</span>
        </div>
        <Bell size={15} className="flex-shrink-0 text-app-text" />
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-app-primary-tint text-[10px] font-bold text-app-primary">
          AG
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-bold text-app-text">{p.recommended}</p>
        <span className="text-[10px] font-semibold text-app-primary">{p.seeAll}</span>
      </div>
      {/* overflow-x-auto is a safety net, not the primary fix — the laptop
          frame's own responsive width keeps this from being needed in
          practice, but it guarantees a too-narrow viewport scrolls this row
          internally instead of ever forcing the page itself to overflow. */}
      <div className="scrollbar-hide mt-2.5 flex gap-2.5 overflow-x-auto">
        {p.cards.map((c, i) => (
          <MiniCard
            key={c.title}
            title={c.title}
            budget={c.budget}
            brand={c.brand}
            category={c.category}
            photo={CARD_PHOTOS[i]!}
            isNew={i === 0}
            applyLabel={p.applyLabel}
          />
        ))}
      </div>
    </>
  );
}

function ScaledPhone({ scale }: { scale: number }) {
  return (
    <div style={{ width: PHONE_W * scale, height: PHONE_H * scale, overflow: 'hidden' }}>
      <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <AppHomePreview />
      </div>
    </div>
  );
}

/** Laptop (web, live) + phone (mobile, coming soon) shown together the way a
 * "works on every device" marketing graphic usually does. Two separate
 * layouts rather than one fluidly-scaled graphic (same convention as
 * OldWay/KolabWay's own mobile-vs-desktop split) — overlapping the phone
 * over the laptop's corner only once there's enough width for both to read
 * clearly; stacked and modestly scaled below `lg`, where that width isn't
 * there. */
export function PlatformShowcase() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[360px] flex-col items-center gap-5 lg:hidden">
        <LaptopFrame>
          <BrowserChrome url="ourkolab.com">
            <WebContent />
          </BrowserChrome>
        </LaptopFrame>
        <ScaledPhone scale={0.72} />
      </div>

      <div className="relative mx-auto hidden pb-8 pr-8 lg:block" style={{ width: LAPTOP_SCREEN_W + 40 + PHONE_W * 0.5 * 0.5 }}>
        <LaptopFrame>
          <BrowserChrome url="ourkolab.com">
            <WebContent />
          </BrowserChrome>
        </LaptopFrame>
        <div className="absolute bottom-0 right-0 z-10 drop-shadow-xl">
          <ScaledPhone scale={0.5} />
        </div>
      </div>
    </>
  );
}

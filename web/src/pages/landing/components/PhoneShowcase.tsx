import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Camera, Hotel, Mic, Package, Smartphone, Star, Utensils, Wallet } from 'lucide-react';

const SCENE_DURATION = 4600;

function pexels(id: string, file: string) {
  return `https://videos.pexels.com/video-files/${id}/${file}`;
}

function SceneFrame({
  videoId,
  file,
  children,
}: {
  videoId: string;
  file: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-ink via-ink to-violet-dark/50">
      <video
        key={videoId}
        className="absolute inset-0 h-full w-full object-cover"
        src={pexels(videoId, file)}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/20" />
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
      {children}
    </span>
  );
}

function CreatorAppScene() {
  return (
    <SceneFrame videoId="12433102" file="12433102-sd_640_360_30fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Smartphone size={11} />
          Opening Kolab
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">&ldquo;Let&rsquo;s see what campaigns are live today&rdquo;</p>
        <p className="mt-0.5 text-[11px] text-white/70">Anjali Gurung &middot; Creator, Kathmandu</p>
      </div>
    </SceneFrame>
  );
}

function ProductScene() {
  return (
    <SceneFrame videoId="13929641" file="13929641-sd_540_960_24fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Package size={11} />
          Displaying product
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">&ldquo;Here&rsquo;s the one I&rsquo;ve been using&rdquo;</p>
        <p className="mt-0.5 text-[11px] text-white/70">Sponsored by Himal Coffee</p>
      </div>
    </SceneFrame>
  );
}

function FoodScene() {
  return (
    <SceneFrame videoId="7351722" file="7351722-sd_640_360_24fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>Reviewing</Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} className="fill-brand-orange text-brand-orange" />
          ))}
        </div>
        <p className="mt-1 text-xs font-medium text-white">Worth the hype &mdash; ordering again</p>
      </div>
    </SceneFrame>
  );
}

function MomoScene() {
  return (
    <SceneFrame videoId="37069651" file="15704072_1080_1920_60fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Utensils size={11} />
          Momo &amp; chowmein review
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} className="fill-brand-orange text-brand-orange" />
          ))}
        </div>
        <p className="mt-1 text-xs font-medium text-white">&ldquo;This jhol momo is unreal&rdquo;</p>
        <p className="mt-0.5 text-[11px] text-white/70">Sabina Tamang &middot; Food creator</p>
      </div>
    </SceneFrame>
  );
}

function HotelScene() {
  return (
    <SceneFrame videoId="7581209" file="7581209-sd_960_540_30fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Hotel size={11} />
          Client pitch
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-white">
          <Camera size={12} className="shrink-0" />
          Pitching a reel concept to Hotel Mustang&rsquo;s owner
        </p>
      </div>
    </SceneFrame>
  );
}

function BlogScene() {
  return (
    <SceneFrame videoId="33048634" file="14085816_1920_1080_25fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Mic size={11} />
          Blogging live
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">&ldquo;Okay guys, today we&rsquo;re unboxing&hellip;&rdquo;</p>
        <p className="mt-0.5 text-[11px] text-white/70">Prakash Shrestha &middot; Tech blogger</p>
      </div>
    </SceneFrame>
  );
}

function PaymentScene() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <SceneFrame videoId="4326533" file="4326533-sd_960_540_25fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Wallet size={11} />
          Payment released
        </Badge>
      </div>
      <div className="absolute inset-x-4 bottom-4">
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2.5 shadow-lg"
            >
              <BadgeCheck size={18} className="shrink-0 text-emerald-500" />
              <div className="leading-tight">
                <p className="text-xs font-semibold text-ink">+ Rs 15,000 received</p>
                <p className="text-[10px] text-ink-soft">Escrow released &middot; eSewa</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  );
}

function ContentScene() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <SceneFrame videoId="13929683" file="13929683-sd_540_960_24fps.mp4">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-brand-orange"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] font-semibold tracking-widest text-white">
            REC {mm}:{ss}
          </span>
        </div>
        <span className="rounded-full bg-white/15 p-1.5 backdrop-blur-sm">
          <Camera size={12} className="text-white" />
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <Badge>Making content</Badge>
      </div>
    </SceneFrame>
  );
}

const SCENES = [CreatorAppScene, MomoScene, ProductScene, FoodScene, PaymentScene, BlogScene, HotelScene, ContentScene];

export function PhoneShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SCENES.length), SCENE_DURATION);
    return () => clearInterval(id);
  }, []);

  const ActiveScene = SCENES[active];

  return (
    <div className="relative mx-auto w-[260px] sm:w-[290px]">
      <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-violet/20 via-transparent to-brand-orange/20 blur-2xl" />

      <div className="relative rounded-[2.6rem] border border-ink/10 bg-ink p-2.5 shadow-2xl">
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />

        <div className="absolute left-4 right-4 top-5 z-10 flex gap-1.5">
          {SCENES.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              {i === active && (
                <motion.div
                  key={active}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: SCENE_DURATION / 1000, ease: 'linear' }}
                  className="h-full bg-white"
                />
              )}
              {i < active && <div className="h-full w-full bg-white/70" />}
            </div>
          ))}
        </div>

        <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[2.1rem] bg-paper">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <ActiveScene />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

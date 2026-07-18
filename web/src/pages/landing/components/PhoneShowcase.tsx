import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Camera, Hotel, Mic, Package, Shirt, Smartphone, Star, Utensils, Wallet } from 'lucide-react';
import { useLandingLanguage } from '../context/LanguageContext';

const SCENE_DURATION = 4600;

function pexels(id: string, file: string) {
  return `https://videos.pexels.com/video-files/${id}/${file}`;
}

function SceneFrame({
  videoKey,
  src,
  poster,
  children,
}: {
  videoKey: string;
  src: string;
  poster?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-ink via-ink to-violet-dark/50">
      <video
        key={videoKey}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        poster={poster}
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
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="12433102" src={pexels('12433102', '12433102-sd_640_360_30fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Smartphone size={11} />
          {d.phoneShowcase.creatorApp.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">{d.phoneShowcase.creatorApp.quote}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.creatorApp.caption}</p>
      </div>
    </SceneFrame>
  );
}

function ProductScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="13929641" src={pexels('13929641', '13929641-sd_540_960_24fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Package size={11} />
          {d.phoneShowcase.product.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">{d.phoneShowcase.product.quote}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.product.caption}</p>
      </div>
    </SceneFrame>
  );
}

function FoodScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="7351722" src={pexels('7351722', '7351722-sd_640_360_24fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>{d.phoneShowcase.food.badge}</Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} className="fill-brand-orange text-brand-orange" />
          ))}
        </div>
        <p className="mt-1 text-xs font-medium text-white">{d.phoneShowcase.food.caption}</p>
      </div>
    </SceneFrame>
  );
}

function ClothingScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame
      videoKey="cld-6mfqhq"
      src="https://res.cloudinary.com/drpuqrfyn/video/upload/du_6/v1784197977/WhatsApp_Video_2026-07-16_at_22.02.44_online-video-cutter.com_wgej6q.mp4"
    >
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Mic size={11} />
          {d.phoneShowcase.clothing.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">{d.phoneShowcase.clothing.quote}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.clothing.caption}</p>
      </div>
    </SceneFrame>
  );
}

function OnSetScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="10145285" src={pexels('10145285', '10145285-hd_1080_1920_30fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Camera size={11} />
          {d.phoneShowcase.onSet.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">{d.phoneShowcase.onSet.caption}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.onSet.sub}</p>
      </div>
    </SceneFrame>
  );
}

function BehindScenesScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="14075778" src={pexels('14075778', '14075778-hd_1080_1920_30fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Smartphone size={11} />
          {d.phoneShowcase.behindScenes.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">{d.phoneShowcase.behindScenes.caption}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.behindScenes.sub}</p>
      </div>
    </SceneFrame>
  );
}

function StyleScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="30550627" src={pexels('30550627', '13086324_1080_1920_25fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Shirt size={11} />
          {d.phoneShowcase.style.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">{d.phoneShowcase.style.quote}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.style.caption}</p>
      </div>
    </SceneFrame>
  );
}

function MomoScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame
      videoKey="37069651"
      src={pexels('37069651', '15704072_1080_1920_60fps.mp4')}
      poster="https://images.pexels.com/videos/37069651/pexels-photo-37069651.jpeg?auto=compress&w=900&h=1600&dpr=1"
    >
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Utensils size={11} />
          {d.phoneShowcase.momo.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} className="fill-brand-orange text-brand-orange" />
          ))}
        </div>
        <p className="mt-1 text-xs font-medium text-white">{d.phoneShowcase.momo.quote}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.momo.caption}</p>
      </div>
    </SceneFrame>
  );
}

function HotelScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="7581209" src={pexels('7581209', '7581209-sd_960_540_30fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Hotel size={11} />
          {d.phoneShowcase.hotel.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-white">
          <Camera size={12} className="shrink-0" />
          {d.phoneShowcase.hotel.caption}
        </p>
      </div>
    </SceneFrame>
  );
}

function BlogScene() {
  const { d } = useLandingLanguage();
  return (
    <SceneFrame videoKey="33048634" src={pexels('33048634', '14085816_1920_1080_25fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Mic size={11} />
          {d.phoneShowcase.blog.badge}
        </Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p className="text-xs font-medium text-white">{d.phoneShowcase.blog.quote}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{d.phoneShowcase.blog.caption}</p>
      </div>
    </SceneFrame>
  );
}

function PaymentScene() {
  const { d } = useLandingLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <SceneFrame videoKey="4326533" src={pexels('4326533', '4326533-sd_960_540_25fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center px-4 pt-3">
        <Badge>
          <Wallet size={11} />
          {d.phoneShowcase.payment.badge}
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
                <p className="text-xs font-semibold text-ink">{d.phoneShowcase.payment.amount}</p>
                <p className="text-[10px] text-ink-soft">{d.phoneShowcase.payment.caption}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  );
}

function ContentScene() {
  const { d } = useLandingLanguage();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <SceneFrame videoKey="13929683" src={pexels('13929683', '13929683-sd_540_960_24fps.mp4')}>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-brand-orange"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] font-semibold tracking-widest text-white">
            {d.phoneShowcase.content.recLabel} {mm}:{ss}
          </span>
        </div>
        <span className="rounded-full bg-white/15 p-1.5 backdrop-blur-sm">
          <Camera size={12} className="text-white" />
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <Badge>{d.phoneShowcase.content.badge}</Badge>
      </div>
    </SceneFrame>
  );
}

const SCENES = [
  CreatorAppScene, MomoScene, ProductScene, FoodScene, PaymentScene, BlogScene,
  HotelScene, ClothingScene, OnSetScene, BehindScenesScene, StyleScene, ContentScene,
];

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

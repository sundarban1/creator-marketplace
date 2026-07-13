import { useLandingLanguage } from '../context/LanguageContext';

export function LandingFooter() {
  const { d } = useLandingLanguage();
  return (
    <footer className="bg-[#0B0B1F] text-white py-14">
      <div className="max-w-6xl mx-auto px-5">
        <div className="mb-10">
          <div className="flex items-center bg-white rounded-full pl-3 pr-4 py-2 mb-3 w-fit">
            <img src="/logo.png" alt="kolab" className="h-5 w-auto object-contain" />
          </div>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            {d.footer.tagline}
          </p>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} kolab. {d.footer.rights}</p>
          <p className="text-white/40 text-xs">{d.footer.madeIn} 🇳🇵</p>
        </div>
      </div>
    </footer>
  );
}

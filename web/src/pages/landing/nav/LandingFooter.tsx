import { AtSign, Globe, Mail } from 'lucide-react';
import { SECTION_IDS } from '../constants';

const COLUMNS: { title: string; links: string[] }[] = [
  { title: 'Product', links: ['Features', 'For Creators', 'For Brands', 'AI Campaigns', 'Pricing'] },
  { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press'] },
  { title: 'Resources', links: ['Help Center', 'FAQ', 'Guides', 'API'] },
  { title: 'Legal', links: ['Terms', 'Privacy', 'Cookies'] },
];

export function LandingFooter() {
  return (
    <footer id={SECTION_IDS.contact} className="bg-[#0B0B1F] text-white py-14">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-6 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 bg-white rounded-full pl-2 pr-4 py-2 mb-3 w-fit">
              <img src="/logo.png" alt="kolab" className="h-5 w-5 rounded-full object-cover" />
              <span className="font-extrabold text-gray-900 text-sm">kolab</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Nepal's creator marketplace — where brands and creators discover each other, collaborate, and get paid securely.
            </p>
            <div className="flex gap-3 mt-4">
              {[AtSign, Globe, Mail].map((Icon, i) => (
                <div key={i} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors">
                  <Icon size={15} className="text-white/60" />
                </div>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="font-semibold text-sm mb-3 text-white/90">{col.title}</div>
              {col.links.map((l) => (
                <div key={l} className="text-white/45 text-sm mb-2 hover:text-white/80 cursor-pointer transition-colors">{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} kolab. All rights reserved.</p>
          <p className="text-white/40 text-xs">Made in Nepal 🇳🇵</p>
        </div>
      </div>
    </footer>
  );
}

import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6';
import { PageHeader } from '../components/PageHeader';
import { api, type PlatformSettings } from '../lib/api';

// Same underlying key-value settings store as Settings.tsx (api.admin.get/
// updateSettings) — this page is just a focused, single-purpose UI over a
// handful of those keys (contact details + social links) instead of a
// section buried in the big general settings page. 'platform.supportEmail'
// is reused as-is rather than duplicated with a second email field.
const DEFAULTS: PlatformSettings = {
  'platform.address':          '',
  'platform.phone':            '',
  'platform.supportEmail':     '',
  'platform.social.facebook':  '',
  'platform.social.instagram': '',
  'platform.social.tiktok':    '',
  'platform.social.youtube':   '',
};

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function InputField({
  label,
  settingKey,
  type = 'text',
  placeholder,
  icon: Icon,
  settings,
  onChange,
}: {
  label: string;
  settingKey: string;
  type?: string;
  placeholder?: string;
  icon?: React.ElementType;
  settings: PlatformSettings;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
        {Icon && <Icon size={13} className="text-gray-400" />}
        {label}
      </label>
      <input
        type={type}
        value={String(settings[settingKey] ?? '')}
        onChange={(e) => onChange(settingKey, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      />
    </div>
  );
}

export function ContactInfo() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getSettings();
      setSettings({ ...DEFAULTS, ...res.data });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function setString(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.admin.updateSettings(settings);
      setSettings({ ...DEFAULTS, ...res.data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Contact" />
        <div className="max-w-2xl space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              {[1, 2, 3].map((j) => <div key={j} className="h-10 bg-gray-100 rounded mb-2" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Contact"
        subtitle="Contact details and social links shown on the public landing page"
        action={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle size={15} />
                Saved
              </span>
            )}
            <button
              onClick={loadSettings}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Reload
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              <Save size={15} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 max-w-2xl">
          {error}
        </div>
      )}

      <div className="max-w-2xl">
        <SectionCard title="Contact Details" subtitle="Shown in the landing page footer — leave blank to hide">
          <InputField label="Address"       settingKey="platform.address"      settings={settings} onChange={setString} placeholder="Kathmandu, Nepal" />
          <InputField label="Phone Number"  settingKey="platform.phone"        settings={settings} onChange={setString} type="tel" placeholder="+977 98XXXXXXXX" />
          <InputField label="Contact Email" settingKey="platform.supportEmail" settings={settings} onChange={setString} type="email" placeholder="support@kolab.com" />
        </SectionCard>

        <SectionCard title="Social Links" subtitle="Each icon only appears on the landing page once its URL is filled in">
          <InputField label="Facebook"  settingKey="platform.social.facebook"  settings={settings} onChange={setString} icon={FaFacebook}  placeholder="https://facebook.com/yourpage" />
          <InputField label="Instagram" settingKey="platform.social.instagram" settings={settings} onChange={setString} icon={FaInstagram} placeholder="https://instagram.com/yourhandle" />
          <InputField label="TikTok"    settingKey="platform.social.tiktok"    settings={settings} onChange={setString} icon={FaTiktok}    placeholder="https://tiktok.com/@yourhandle" />
          <InputField label="YouTube"   settingKey="platform.social.youtube"   settings={settings} onChange={setString} icon={FaYoutube}   placeholder="https://youtube.com/@yourchannel" />
        </SectionCard>
      </div>
    </div>
  );
}

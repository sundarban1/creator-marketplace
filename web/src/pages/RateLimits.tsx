import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { api, type PlatformSettings } from '../lib/api';

// ── Building blocks (mirrors Settings.tsx's SectionCard/Toggle/InputField) ──────

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

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
          value ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
        aria-checked={value}
        role="switch"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function NumberField({
  label,
  hint,
  settingKey,
  settings,
  onChange,
}: {
  label: string;
  hint?: string;
  settingKey: string;
  settings: PlatformSettings;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type="number"
        min={1}
        value={String(settings[settingKey] ?? '')}
        onChange={(e) => onChange(settingKey, Math.max(1, Number(e.target.value) || 1))}
        className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Default settings (mirrored from AdminRepository DEFAULTS on the backend) ────

const DEFAULTS: PlatformSettings = {
  'rateLimit.apiRequests.enabled':        true,
  'rateLimit.apiRequests.max':            120,
  'rateLimit.otp.enabled':                true,
  'rateLimit.otp.max':                    5,
  'rateLimit.login.enabled':              true,
  'rateLimit.login.max':                  20,
  'rateLimit.campaignCreation.enabled':   true,
  'rateLimit.campaignCreation.maxPerDay': 5,
  'rateLimit.messages.enabled':           true,
  'rateLimit.messages.maxPerMinute':      20,
  'rateLimit.duplicateMessages.enabled':  true,
  'rateLimit.newAccountCooldown.enabled': true,
  'rateLimit.newAccountCooldown.hours':   24,
  'rateLimit.captcha.enabled':                false,
  'rateLimit.captcha.failedAttemptThreshold': 3,
};

// ── Main component ─────────────────────────────────────────────────────────────

export function RateLimits() {
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

  function toggle(key: string, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function setNumber(key: string, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Only this page's own keys need to be sent — updateSettings upserts
      // whatever keys are present without touching the rest of the platform's
      // settings blob, so there's no need to merge in everything else first.
      const payload = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, settings[k]]));
      const res = await api.admin.updateSettings(payload);
      setSettings({ ...DEFAULTS, ...res.data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const bool = (key: string) => Boolean(settings[key] ?? DEFAULTS[key] ?? false);

  if (loading) {
    return (
      <div>
        <PageHeader title="Rate Limits" />
        <div className="max-w-2xl space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-10 bg-gray-100 rounded mb-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Rate Limits"
        subtitle="Anti-abuse controls — applies equally to creators and businesses"
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

        <SectionCard title="API Requests" subtitle="Blunt, IP-based throttle across every API endpoint">
          <Toggle
            label="Rate Limit API Requests"
            description="Master switch for general API throttling"
            value={bool('rateLimit.apiRequests.enabled')}
            onChange={(v) => toggle('rateLimit.apiRequests.enabled', v)}
          />
          <NumberField
            label="Max requests per minute (per IP)"
            hint="Time window is fixed at 1 minute"
            settingKey="rateLimit.apiRequests.max"
            settings={settings}
            onChange={setNumber}
          />
        </SectionCard>

        <SectionCard title="OTP Requests" subtitle="Signup, resend, and verification codes">
          <Toggle
            label="Limit OTP Requests"
            description="Throttle how often OTP codes can be requested"
            value={bool('rateLimit.otp.enabled')}
            onChange={(v) => toggle('rateLimit.otp.enabled', v)}
          />
          <NumberField
            label="Max OTP requests per 10 minutes (per IP)"
            hint="Time window is fixed at 10 minutes"
            settingKey="rateLimit.otp.max"
            settings={settings}
            onChange={setNumber}
          />
        </SectionCard>

        <SectionCard title="Login Attempts" subtitle="Brute-force protection on the login endpoint">
          <Toggle
            label="Limit Login Attempts"
            description="Throttle repeated login attempts from the same IP"
            value={bool('rateLimit.login.enabled')}
            onChange={(v) => toggle('rateLimit.login.enabled', v)}
          />
          <NumberField
            label="Max attempts per 15 minutes (per IP)"
            hint="Time window is fixed at 15 minutes"
            settingKey="rateLimit.login.max"
            settings={settings}
            onChange={setNumber}
          />
        </SectionCard>

        <SectionCard title="Campaign Creation" subtitle="Caps how many events a single business can create per day">
          <Toggle
            label="Limit Campaign Creation Per Day"
            description="Cap the number of events a business can create each calendar day"
            value={bool('rateLimit.campaignCreation.enabled')}
            onChange={(v) => toggle('rateLimit.campaignCreation.enabled', v)}
          />
          <NumberField
            label="Max events per business per day"
            settingKey="rateLimit.campaignCreation.maxPerDay"
            settings={settings}
            onChange={setNumber}
          />
        </SectionCard>

        <SectionCard title="Messages Per Minute" subtitle="Per-user chat send rate — applies to creators and businesses">
          <Toggle
            label="Limit Messages Per Minute"
            description="Cap how many chat messages a single user can send per minute"
            value={bool('rateLimit.messages.enabled')}
            onChange={(v) => toggle('rateLimit.messages.enabled', v)}
          />
          <NumberField
            label="Max messages per minute (per user)"
            settingKey="rateLimit.messages.maxPerMinute"
            settings={settings}
            onChange={setNumber}
          />
        </SectionCard>

        <SectionCard title="Duplicate Messages" subtitle="Blocks sending the exact same chat message twice in a row">
          <Toggle
            label="Prevent Repeated Messages"
            description="Reject a message if it's identical to the sender's immediately preceding message in that conversation"
            value={bool('rateLimit.duplicateMessages.enabled')}
            onChange={(v) => toggle('rateLimit.duplicateMessages.enabled', v)}
          />
        </SectionCard>

        <SectionCard title="New Account Cooldown" subtitle="Anti-fraud hold on brand-new business accounts">
          <Toggle
            label="Cooldown Period for New Accounts"
            description="Newly-signed-up businesses must wait before creating their first event"
            value={bool('rateLimit.newAccountCooldown.enabled')}
            onChange={(v) => toggle('rateLimit.newAccountCooldown.enabled', v)}
          />
          <NumberField
            label="Cooldown hours before creating an event"
            settingKey="rateLimit.newAccountCooldown.hours"
            settings={settings}
            onChange={setNumber}
          />
        </SectionCard>

        <SectionCard title="CAPTCHA After Suspicious Behaviour" subtitle="Flags an account for CAPTCHA once repeated failed logins are detected">
          <div className="flex items-start gap-2 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Trigger only for now — the backend tracks failed logins and flags the account once the threshold is
              hit, but there's no CAPTCHA challenge UI or provider wired up yet, so turning this on has no visible
              effect until that ships.
            </p>
          </div>
          <Toggle
            label="Require CAPTCHA After Suspicious Behaviour"
            description="Flag an account for CAPTCHA once it has enough consecutive failed login attempts"
            value={bool('rateLimit.captcha.enabled')}
            onChange={(v) => toggle('rateLimit.captcha.enabled', v)}
          />
          <NumberField
            label="Failed attempts before requiring CAPTCHA"
            settingKey="rateLimit.captcha.failedAttemptThreshold"
            settings={settings}
            onChange={setNumber}
          />
        </SectionCard>

      </div>
    </div>
  );
}

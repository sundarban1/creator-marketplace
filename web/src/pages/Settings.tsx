import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { api, type PlatformSettings } from '../lib/api';

// ── Building blocks ────────────────────────────────────────────────────────────

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

function InputField({
  label,
  settingKey,
  type = 'text',
  settings,
  onChange,
}: {
  label: string;
  settingKey: string;
  type?: string;
  settings: PlatformSettings;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={String(settings[settingKey] ?? '')}
        onChange={(e) => onChange(settingKey, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      />
    </div>
  );
}

// ── Default settings ───────────────────────────────────────────────────────────

const DEFAULTS: PlatformSettings = {
  'registration.enabled':        true,
  'creator.onboarding':          true,
  'business.onboarding':         true,
  'campaign.autoApproval':       false,
  'payment.escrow':              true,
  'messaging.enabled':           true,
  'messaging.directMessages':    true,
  'messaging.pushNotifications': true,
  'messaging.typingIndicators':  true,
  'notifications.email':         true,
  'notifications.reportAlerts':  true,
  'notifications.paymentAlerts': true,
  'notifications.weeklySummary': false,
  'security.twoFactor':          true,
  'security.ipAllowlist':        false,
  'security.auditLogging':       true,
  'security.sessionTimeout':     true,
  'platform.name':               'kolab',
  'platform.supportEmail':       'support@collab.com',
  'platform.commission':         '12',
  'platform.description':        'kolab connects brands with top creators for authentic events.',
};

// ── Main component ─────────────────────────────────────────────────────────────

export function Settings() {
  const [settings,  setSettings]  = useState<PlatformSettings>(DEFAULTS);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

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

  const bool = (key: string) => Boolean(settings[key] ?? DEFAULTS[key] ?? false);

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" />
        <div className="max-w-2xl space-y-5">
          {[1, 2, 3, 4].map((i) => (
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
        title="Settings"
        subtitle="Configure platform-wide features and controls"
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

        {/* Platform */}
        <SectionCard title="Platform Settings" subtitle="Core controls for registration and onboarding">
          <Toggle label="User Registration"     description="Allow new users to sign up on the platform"                      value={bool('registration.enabled')}  onChange={(v) => toggle('registration.enabled', v)} />
          <Toggle label="Creator Onboarding"    description="Enable the creator onboarding flow for new users"                value={bool('creator.onboarding')}    onChange={(v) => toggle('creator.onboarding', v)} />
          <Toggle label="Business Onboarding"   description="Enable business registration and onboarding"                     value={bool('business.onboarding')}   onChange={(v) => toggle('business.onboarding', v)} />
          <Toggle label="Event Auto-Approval"    description="Automatically approve events that meet all criteria"             value={bool('campaign.autoApproval')} onChange={(v) => toggle('campaign.autoApproval', v)} />
          <Toggle label="Payment Escrow"         description="Hold payments in escrow until event completion is confirmed"      value={bool('payment.escrow')}        onChange={(v) => toggle('payment.escrow', v)} />
        </SectionCard>

        {/* Messaging */}
        <SectionCard title="Messaging & Chat" subtitle="Control the real-time chat system between creators and businesses">
          <Toggle
            label="Messaging Enabled"
            description="Master switch — turns off the entire chat/messaging feature across the app"
            value={bool('messaging.enabled')}
            onChange={(v) => toggle('messaging.enabled', v)}
          />
          <Toggle
            label="Direct Messages"
            description="Allow creators to initiate conversations with businesses (not just receive requests)"
            value={bool('messaging.directMessages')}
            onChange={(v) => toggle('messaging.directMessages', v)}
          />
          <Toggle
            label="Push Notifications"
            description="Send mobile push notifications when a new message is received"
            value={bool('messaging.pushNotifications')}
            onChange={(v) => toggle('messaging.pushNotifications', v)}
          />
          <Toggle
            label="Typing Indicators"
            description="Show the animated '…' typing indicator when the other party is composing"
            value={bool('messaging.typingIndicators')}
            onChange={(v) => toggle('messaging.typingIndicators', v)}
          />
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notification Settings" subtitle="Control which alerts are sent to admins and users">
          <Toggle label="Email Notifications"   description="Send email alerts for reports and user flags"                          value={bool('notifications.email')}         onChange={(v) => toggle('notifications.email', v)} />
          <Toggle label="New Report Alerts"     description="Notify admins immediately when a new report is filed"                  value={bool('notifications.reportAlerts')}  onChange={(v) => toggle('notifications.reportAlerts', v)} />
          <Toggle label="Payment Failure Alerts" description="Alert the admin team when a payment fails to process"                  value={bool('notifications.paymentAlerts')} onChange={(v) => toggle('notifications.paymentAlerts', v)} />
          <Toggle label="Weekly Summary Email"  description="Send a weekly digest of platform activity to admins"                   value={bool('notifications.weeklySummary')} onChange={(v) => toggle('notifications.weeklySummary', v)} />
        </SectionCard>

        {/* Platform Info */}
        <SectionCard title="Platform Information" subtitle="Brand details shown across the app">
          <InputField label="Platform Name"            settingKey="platform.name"          settings={settings} onChange={setString} />
          <InputField label="Support Email"            settingKey="platform.supportEmail"  settings={settings} onChange={setString} type="email" />
          <InputField label="Platform Commission (%)"  settingKey="platform.commission"    settings={settings} onChange={setString} type="number" />
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Platform Description</label>
            <textarea
              rows={3}
              value={String(settings['platform.description'] ?? '')}
              onChange={(e) => setString('platform.description', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
            />
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" subtitle="Access controls and audit settings for the admin panel">
          <Toggle label="Two-Factor Authentication" description="Require 2FA for all admin accounts"                        value={bool('security.twoFactor')}      onChange={(v) => toggle('security.twoFactor', v)} />
          <Toggle label="IP Allowlisting"           description="Restrict admin panel access to approved IP addresses only" value={bool('security.ipAllowlist')}    onChange={(v) => toggle('security.ipAllowlist', v)} />
          <Toggle label="Audit Logging"             description="Log all admin actions for compliance and accountability"   value={bool('security.auditLogging')}   onChange={(v) => toggle('security.auditLogging', v)} />
          <Toggle label="Session Timeout"           description="Automatically sign out inactive admin sessions after 30 min" value={bool('security.sessionTimeout')} onChange={(v) => toggle('security.sessionTimeout', v)} />
        </SectionCard>

      </div>
    </div>
  );
}

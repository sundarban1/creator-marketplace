import { useEffect, useState } from 'react';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';

// Defaults mirror the backend (admin.repository.ts DEFAULTS). They are the
// starting point shown before an admin has ever saved a custom value, and the
// value the backend falls back to if a stored setting is missing or invalid.
const DEFAULTS = {
  minWithdrawal: 500,
  maxWithdrawal: 10000,
  dailyLimit:    25000,
} as const;

const KEYS = {
  minWithdrawal: 'wallet.minWithdrawal',
  maxWithdrawal: 'wallet.maxWithdrawal',
  dailyLimit:    'wallet.dailyLimit',
} as const;

type Field = keyof typeof DEFAULTS;

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function LimitField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rs.</span>
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

export function WithdrawalLimitsTab() {
  const [values, setValues]   = useState<Record<Field, string>>({
    minWithdrawal: String(DEFAULTS.minWithdrawal),
    maxWithdrawal: String(DEFAULTS.maxWithdrawal),
    dailyLimit:    String(DEFAULTS.dailyLimit),
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getSettings();
      const s = res.data;
      setValues({
        minWithdrawal: String(toNumber(s[KEYS.minWithdrawal], DEFAULTS.minWithdrawal)),
        maxWithdrawal: String(toNumber(s[KEYS.maxWithdrawal], DEFAULTS.maxWithdrawal)),
        dailyLimit:    String(toNumber(s[KEYS.dailyLimit], DEFAULTS.dailyLimit)),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function set(field: Field, v: string) {
    setValues((prev) => ({ ...prev, [field]: v }));
    setSaved(false);
  }

  const min   = Number(values.minWithdrawal);
  const max   = Number(values.maxWithdrawal);
  const daily = Number(values.dailyLimit);

  let validationError: string | null = null;
  if (![min, max, daily].every((n) => Number.isFinite(n) && n > 0)) {
    validationError = 'All limits must be positive numbers.';
  } else if (max < min) {
    validationError = 'The maximum per withdrawal cannot be lower than the minimum.';
  } else if (daily < max) {
    validationError = 'The daily limit cannot be lower than the maximum per withdrawal.';
  }

  async function handleSave() {
    if (validationError) return;
    setSaving(true);
    setError(null);
    try {
      // Send only the wallet keys — updateSettings upserts each key it is
      // given, so other platform settings are untouched.
      await api.admin.updateSettings({
        [KEYS.minWithdrawal]: min,
        [KEYS.maxWithdrawal]: max,
        [KEYS.dailyLimit]:    daily,
      });
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
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          {[1, 2, 3].map((j) => <div key={j} className="h-12 bg-gray-100 rounded mb-3" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Limits enforced whenever a creator requests a payout from their wallet.
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle size={15} />
              Saved
            </span>
          )}
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!validationError}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Creator Withdrawal Limit</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Defaults: Rs. {DEFAULTS.minWithdrawal.toLocaleString()} / Rs. {DEFAULTS.maxWithdrawal.toLocaleString()} / Rs. {DEFAULTS.dailyLimit.toLocaleString()}.
          </p>
        </div>

        <LimitField
          label="Minimum per withdrawal"
          hint="A creator cannot request less than this in a single withdrawal."
          value={values.minWithdrawal}
          onChange={(v) => set('minWithdrawal', v)}
        />
        <LimitField
          label="Maximum per withdrawal"
          hint="The largest amount allowed in a single withdrawal request."
          value={values.maxWithdrawal}
          onChange={(v) => set('maxWithdrawal', v)}
        />
        <LimitField
          label="Daily withdrawal limit"
          hint="Maximum a creator can request in total per day — pending, processing and paid requests all count. Resets at midnight, Nepal time. Once the day's requests reach this limit, no further request can be made until the next day."
          value={values.dailyLimit}
          onChange={(v) => set('dailyLimit', v)}
        />

        {validationError && (
          <p className="text-xs text-red-600 mt-1">{validationError}</p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            Two more rules always apply and are not configurable: a creator may only have one
            withdrawal request in progress at a time, and every request must be approved by an
            admin before it is paid.
          </p>
        </div>
      </div>
    </div>
  );
}

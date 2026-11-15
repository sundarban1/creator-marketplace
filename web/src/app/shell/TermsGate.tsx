import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { useT } from '../i18n';
import { termsApi, type AcceptanceStatus } from '../api/safety';
import { useAppAuth } from '../auth/AppAuthContext';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Logo } from '../ui/Logo';

// Signed-in gate: the creator/business app renders only after the user has
// accepted the CURRENT Terms of Use + Community Guidelines versions (no date
// of birth is collected). One small
// request per app load; the server records each acceptance. If the status
// call itself fails we let the app render rather than lock people out — the
// mobile apps and the next load will ask again.
export function TermsGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AcceptanceStatus | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    termsApi.status()
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, []);

  if (!checked) return null;
  if (!status || status.accepted) return <>{children}</>;
  return <AgreementScreen status={status} onAccepted={() => setStatus({ ...status, accepted: true })} />;
}

function AgreementScreen({ status, onAccepted }: { status: AcceptanceStatus; onAccepted: () => void }) {
  const t = useT();
  const { logout } = useAppAuth();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const firstTime = !status.acceptedAt;

  async function submit() {
    if (!agreed || saving) return;
    setSaving(true); setError('');
    try {
      await termsApi.accept(status.versions);
      onAccepted();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('terms.failed'));
    } finally {
      setSaving(false);
    }
  }

  const docLink = 'inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-medium text-ink hover:bg-surface-dim';
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-dim px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7 shadow-xl">
        <Logo className="h-7" />
        <h1 className="mt-6 font-serif text-3xl font-medium tracking-tight text-ink">{t('terms.welcome')}</h1>
        <p className="mt-1 text-[14px] font-medium text-brand">{t('terms.tagline')}</p>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">{firstTime ? t('terms.intro') : t('terms.updated')}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <a className={docLink} href="/terms" target="_blank" rel="noreferrer">{t('terms.readTerms')} <ExternalLink size={12} /></a>
          <a className={docLink} href="/community-guidelines" target="_blank" rel="noreferrer">{t('terms.readGuidelines')} <ExternalLink size={12} /></a>
          <a className={docLink} href="/privacy" target="_blank" rel="noreferrer">{t('terms.readPrivacy')} <ExternalLink size={12} /></a>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand,#4F46E5)]" />
          <span className="text-[13.5px] leading-snug text-ink">{t('terms.checkbox')}</span>
        </label>

        {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}

        <Button className="mt-6 w-full" size="lg" disabled={!agreed} loading={saving} onClick={submit}>{t('terms.continue')}</Button>
        <button type="button" onClick={() => void logout()} className="mt-3 w-full text-center text-[13px] font-medium text-ink-soft hover:text-ink">
          {t('terms.logout')}
        </button>
      </div>
    </div>
  );
}

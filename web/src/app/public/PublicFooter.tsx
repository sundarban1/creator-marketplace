import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { Logo } from '../ui/Logo';

export function PublicFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-dim">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo className="h-7" />
            <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{t('public.footerTagline')}</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-[14px]">
            <Link to="/creators" className="text-ink-soft hover:text-ink">
              {t('public.navCreators')}
            </Link>
            <Link to="/events" className="text-ink-soft hover:text-ink">
              {t('public.navEvents')}
            </Link>
            <Link to="/content-creators" className="text-ink-soft hover:text-ink">
              {t('public.navForCreators')}
            </Link>
            <Link to="/brands" className="text-ink-soft hover:text-ink">
              {t('public.navForBusinesses')}
            </Link>
            <Link to="/privacy" className="text-ink-soft hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="text-ink-soft hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>

        <p className="mt-8 border-t border-line pt-6 text-[13px] text-ink-soft">
          {t('public.footerRights', { year })}
        </p>
      </div>
    </footer>
  );
}

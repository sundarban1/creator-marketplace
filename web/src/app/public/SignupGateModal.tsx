import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { paths } from '../routes';

/**
 * Signup/login prompt shown to anonymous visitors on the public creator,
 * business and event detail pages — the same "create an account or log in"
 * conversion moment as the landing page's showcase modals, reused wherever an
 * anonymous visitor hits a gated action inside the app itself.
 */
export function SignupGateModal({
  open,
  onClose,
  title,
  body,
  signupLabel,
  loginLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  /** Override the primary button label (defaults to the generic sign-up CTA). */
  signupLabel?: string;
  /** When set, Login renders as a full-width secondary button with this label
   *  instead of the "Already have an account? Log in" text link. */
  loginLabel?: string;
}) {
  const t = useT();

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[14px] leading-relaxed text-ink-soft">{body}</p>

      <Link to={paths.signup} onClick={onClose} className="mt-5 block">
        <Button size="lg" fullWidth>
          {signupLabel ?? t('auth.signUpCta')}
        </Button>
      </Link>

      {loginLabel ? (
        <Link to={paths.login} onClick={onClose} className="mt-2.5 block">
          <Button size="lg" variant="secondary" fullWidth>
            {loginLabel}
          </Button>
        </Link>
      ) : (
        <p className="mt-3 text-center text-[13px] text-ink-soft">
          {t('auth.haveAccount')}{' '}
          <Link
            to={paths.login}
            onClick={onClose}
            className="font-semibold text-violet hover:underline"
          >
            {t('public.logIn')}
          </Link>
        </p>
      )}
    </Modal>
  );
}

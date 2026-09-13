import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../ui/Toast';
import { useT } from '../i18n';

const WELCOME_TOAST_MS = 5000;

/**
 * Fires the "Welcome to Kolab" toast once, right after onboarding hands off to
 * the role home page (see `onboarding.finish` navigating with `state:
 * { welcomeToast: true }`). Clears the router state afterwards so a refresh or
 * back-navigation to this page doesn't replay it.
 */
export function useWelcomeToast() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();

  useEffect(() => {
    const state = location.state as { welcomeToast?: boolean } | null;
    if (!state?.welcomeToast) return;
    toast.success(t('common.welcomeToast'), WELCOME_TOAST_MS);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
}

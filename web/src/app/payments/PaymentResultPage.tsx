import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { announcePaymentResult, type PaymentOutcome } from '../lib/paymentHandoff';

/**
 * Where the backend sends the web browser after an eSewa / connectIPS checkout
 * (see campaign.controller's redirectEsewaResult / redirectConnectIpsResult).
 *
 * The checkout ran in a new tab, so this hands the result back to the tab the
 * business paid from (lib/paymentHandoff.ts) and closes itself — the business
 * ends up back where they were, not on a second copy of the page. If no tab
 * claims it (the popup was blocked and checkout ran in this same tab, or the
 * original tab is gone), it falls through to the event page, which reads the
 * same `payment` query param to show the result.
 */
export function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [handedOff, setHandedOff] = useState(false);

  useEffect(() => {
    const raw = params.get('payment');
    const payment: PaymentOutcome = raw === 'success' || raw === 'pending' ? raw : 'failed';
    const campaignId = params.get('campaignId') || undefined;
    const paymentError = params.get('paymentError') || undefined;
    let cancelled = false;

    announcePaymentResult({ payment, campaignId, paymentError }).then((claimed) => {
      if (cancelled) return;
      if (claimed) {
        setHandedOff(true);
        // Allowed for script-opened tabs; if the browser refuses, the
        // "return to your previous tab" message below stays up instead.
        window.close();
        return;
      }
      const qs = new URLSearchParams({ payment });
      if (paymentError) qs.set('paymentError', paymentError);
      navigate(`${campaignId ? `/business/events/${campaignId}` : '/business/events'}?${qs.toString()}`, { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#57534e',
        padding: '0 16px',
        textAlign: 'center',
      }}
    >
      <p>{handedOff ? 'All done. You can close this tab and return to Kolab.' : 'Finishing your payment…'}</p>
    </div>
  );
}

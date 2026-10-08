/**
 * Hands an eSewa / connectIPS result from the gateway tab back to the tab the
 * business clicked "Pay" in.
 *
 * The gateway checkout runs in a new tab (BusinessEventDetailPage.confirmPay),
 * but window.opener / the popup handle can't be relied on to bridge the two:
 * our backend's helmet COOP (`same-origin`) and the gateways' own headers sever
 * the opener relationship as soon as the tab navigates through them. A
 * same-origin BroadcastChannel survives that, so the landing page
 * (PaymentResultPage) announces the result here and the paying tab claims it.
 */

const CHANNEL = 'kolab-payment-result';

export type PaymentOutcome = 'success' | 'failed' | 'pending';

export interface PaymentResult {
  payment: PaymentOutcome;
  campaignId?: string;
  paymentError?: string;
}

type Message =
  | { type: 'result'; id: string; result: PaymentResult }
  | { type: 'ack'; id: string };

function openChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
}

/**
 * Broadcasts the result and resolves true if a waiting tab claimed it within
 * `timeoutMs` — false means nobody was waiting (popup-blocked same-tab
 * fallback, or the original tab was closed), so the caller should show the
 * result itself.
 */
export function announcePaymentResult(result: PaymentResult, timeoutMs = 1500): Promise<boolean> {
  const channel = openChannel();
  if (!channel) return Promise.resolve(false);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve) => {
    const done = (claimed: boolean) => {
      clearTimeout(timer);
      channel.close();
      resolve(claimed);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    channel.onmessage = (e: MessageEvent<Message>) => {
      if (e.data?.type === 'ack' && e.data.id === id) done(true);
    };
    channel.postMessage({ type: 'result', id, result } satisfies Message);
  });
}

/**
 * Listens for announced results. `onResult` returns true to claim one (this
 * tab started that payment), which acks it so the landing tab closes itself.
 * Returns an unsubscribe function.
 */
export function listenForPaymentResults(onResult: (result: PaymentResult) => boolean): () => void {
  const channel = openChannel();
  if (!channel) return () => {};
  channel.onmessage = (e: MessageEvent<Message>) => {
    if (e.data?.type !== 'result') return;
    if (onResult(e.data.result)) channel.postMessage({ type: 'ack', id: e.data.id } satisfies Message);
  };
  return () => channel.close();
}

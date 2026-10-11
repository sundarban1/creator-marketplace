/**
 * App-styled replacement for `window.confirm` / `window.alert`, shared by
 * every page on web (creator, business, admin). Call sites stay one line:
 *
 *   if (!(await confirmDialog({ title, message, tone: 'danger' }))) return;
 *   await alertDialog({ title, message });
 *
 * Pass `action` to run the confirmed work inside the dialog: the confirm
 * button spins while it runs, a thrown error is shown inline (dialog stays
 * open for a retry), and the promise resolves true only once it succeeded.
 *
 * Driven imperatively via a single <ConfirmDialogHost /> (ConfirmDialogHost.tsx)
 * mounted in App.tsx — same pattern as ./uploadPreview.ts.
 */

export type DialogTone = 'danger' | 'warning' | 'default';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  action?: () => Promise<unknown>;
};

export type DialogRequest = ConfirmOptions & {
  id: number;
  kind: 'confirm' | 'alert';
  resolve: (ok: boolean) => void;
};

let present: ((req: DialogRequest) => void) | null = null;
let seq = 0;

/** Called by <ConfirmDialogHost /> on mount/unmount. */
export function registerConfirmDialog(fn: ((req: DialogRequest) => void) | null) {
  present = fn;
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!present) {
    // Host not mounted (shouldn't happen) — degrade to the native prompt.
    const ok = window.confirm([opts.title, opts.message].filter(Boolean).join('\n\n'));
    return ok && opts.action ? opts.action().then(() => true) : Promise.resolve(ok);
  }
  return new Promise((resolve) => present?.({ ...opts, id: ++seq, kind: 'confirm', resolve }));
}

export function alertDialog(opts: Omit<ConfirmOptions, 'action' | 'cancelLabel'>): Promise<void> {
  if (!present) {
    window.alert([opts.title, opts.message].filter(Boolean).join('\n\n'));
    return Promise.resolve();
  }
  return new Promise((resolve) => present?.({ ...opts, id: ++seq, kind: 'alert', resolve: () => resolve() }));
}

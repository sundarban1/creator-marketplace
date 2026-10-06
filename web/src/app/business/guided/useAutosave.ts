import { useCallback, useEffect, useRef, useState } from 'react';
import { createGuidedDraft, saveGuidedDraft, type GuidedDraftPayload } from '../../api/business';
import type { GuidedForm, GuidedStep } from './guidedModel';
import { toPayload } from './guidedModel';

// Autosave for the guided creator (UX spec §22): the business never loses
// what they entered. Saves to the server ~1.2s after they pause, keeps a copy
// on the device too (survives offline / a failed save), and flushes one last
// save when the tab closes or they navigate away.

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline';

const LOCAL_PREFIX = 'kolab.guidedDraft.';
const DEBOUNCE_MS = 1200;

export interface LocalBackup { form: GuidedForm; step: GuidedStep; savedAt: number }

export function readLocalBackup(key: string): LocalBackup | null {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + key);
    return raw ? (JSON.parse(raw) as LocalBackup) : null;
  } catch {
    return null;
  }
}

export function clearLocalBackup(key: string): void {
  try { localStorage.removeItem(LOCAL_PREFIX + key); } catch { /* storage unavailable */ }
}

function writeLocalBackup(key: string, value: LocalBackup): void {
  try { localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function useAutosave({
  enabled,
  ready,
  draftId,
  onDraftCreated,
  form,
  step,
  localKey,
}: {
  // false in edit mode for a live campaign (saved explicitly instead)
  enabled: boolean;
  // false while a draft is still loading — nothing is backed up or saved
  // until the real form is in place (an empty placeholder must never
  // overwrite a good copy).
  ready: boolean;
  draftId: string | null;
  onDraftCreated: (id: string) => void;
  form: GuidedForm;
  step: GuidedStep;
  // device-backup key (draft id, campaign id, or 'new')
  localKey: string;
}) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const latest = useRef<{ payload: GuidedDraftPayload; dirty: boolean }>({ payload: toPayload(form, step), dirty: false });
  const idRef = useRef(draftId);
  const inFlight = useRef<Promise<unknown> | null>(null);
  // Last state written, so only real edits (not re-renders) are saved.
  const lastWritten = useRef<string | null>(null);
  useEffect(() => { idRef.current = draftId; }, [draftId]);

  const flush = useCallback(async (opts: { keepalive?: boolean } = {}) => {
    if (!enabled || !latest.current.dirty) return;
    const payload = latest.current.payload;
    latest.current.dirty = false;
    setStatus('saving');
    try {
      if (inFlight.current) await inFlight.current.catch(() => undefined);
      const p = idRef.current
        ? saveGuidedDraft(idRef.current, payload, opts)
        : createGuidedDraft(payload).then((c) => { idRef.current = c.id; onDraftCreated(c.id); return c; });
      inFlight.current = p;
      await p;
      setStatus('saved');
    } catch {
      // Keep it dirty so the next change / unload retries; the device copy
      // already holds everything.
      latest.current.dirty = true;
      setStatus('offline');
    } finally {
      inFlight.current = null;
    }
  }, [enabled, onDraftCreated]);

  // Every change: device copy immediately, server after a pause.
  useEffect(() => {
    if (!ready) return;
    const snapshot = JSON.stringify({ form, step });
    if (lastWritten.current === null) { lastWritten.current = snapshot; return; } // initial state, not an edit
    if (snapshot === lastWritten.current) return;
    lastWritten.current = snapshot;
    writeLocalBackup(localKey, { form, step, savedAt: Date.now() });
    if (!enabled) return;
    latest.current = { payload: toPayload(form, step), dirty: true };
    const t = setTimeout(() => { void flush(); }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [form, step, enabled, ready, localKey, flush]);

  // Leaving the page (tab close, refresh) or the route (unmount).
  useEffect(() => {
    const onUnload = () => { void flush({ keepalive: true }); };
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
      void flush({ keepalive: true });
    };
  }, [flush]);

  return { status, flush, markClean: () => { latest.current.dirty = false; } };
}

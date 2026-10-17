import { useRef, useState } from 'react';
import { UploadCloud, Link2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useToast } from '../ui/Toast';
import { submitCompetitionLink, type MyProgress, type SubmissionMethod } from '../api/competitions';
import { uploadCompetitionVideo, probeVideo, MAX_VIDEO_BYTES, ACCEPTED_VIDEO_TYPES, UploadAbortedError } from './videoUpload';
import { SubmissionPreview, StageRequirements } from './parts';
import { formatNpt } from './format';

/** Only Google Drive share links are accepted for now (server re-validates the link). */
function isGoogleDriveLink(raw: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    return u.hostname.replace(/^www\./, '') === 'drive.google.com';
  } catch {
    return false;
  }
}

type StageProgress = MyProgress['stages'][number];

/**
 * A creator's entry for one stage: requirements, current entry, and the
 * upload-or-link form. Everything here is re-validated by the server — the
 * client checks only give faster feedback.
 */
export function SubmissionPanel({ competitionId, stage, allowEdits, onSaved }: {
  competitionId: string;
  stage: StageProgress;
  allowEdits: boolean;
  onSaved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  // Direct video upload is hidden for now — creators submit a Google Drive
  // link only. The upload flow below (and its backend endpoints) is kept so it
  // can come back by restoring: `const methods = stage.allowedMethods;`
  const methods: SubmissionMethod[] = stage.allowedMethods.includes('EXTERNAL_LINK') ? ['EXTERNAL_LINK'] : [];
  const [method, setMethod] = useState<SubmissionMethod>(methods[0] ?? 'EXTERNAL_LINK');
  const [editing, setEditing] = useState(!stage.submission);
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileWarning, setFileWarning] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canReplace = stage.canSubmit && (!stage.submission || allowEdits);

  async function pickFile(f: File | null) {
    setError('');
    setFileWarning('');
    setFile(null);
    if (!f) return;
    if (!(ACCEPTED_VIDEO_TYPES as readonly string[]).includes(f.type)) { setError(t('comp.videoTypeError')); return; }
    if (f.size > MAX_VIDEO_BYTES) { setError(t('comp.videoSizeError')); return; }
    const { durationSec } = await probeVideo(f);
    if (durationSec) {
      if (stage.videoMinSec && durationSec + 1 < stage.videoMinSec) setFileWarning(t('comp.videoTooShortClient', { sec: stage.videoMinSec }));
      if (stage.videoMaxSec && durationSec - 1 > stage.videoMaxSec) setFileWarning(t('comp.videoTooLongClient', { sec: stage.videoMaxSec }));
    }
    setFile(f);
  }

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (method === 'EXTERNAL_LINK') {
        if (!link.trim()) { setError(t('comp.linkRequired')); return; }
        if (!isGoogleDriveLink(link)) { setError(t('comp.driveOnly')); return; }
        await submitCompetitionLink(competitionId, stage.stageId, { url: link.trim(), caption: caption.trim() || undefined });
      } else {
        if (!file) { setError(t('comp.chooseVideo')); return; }
        abortRef.current = new AbortController();
        setProgress(0);
        await uploadCompetitionVideo(competitionId, stage.stageId, file, {
          caption: caption.trim() || undefined,
          onProgress: (f) => setProgress(Math.round(f * 100)),
          signal: abortRef.current.signal,
        });
      }
      toast.success(stage.submission ? t('comp.entryUpdated') : t('comp.entryReceived'));
      setEditing(false);
      setLink('');
      setFile(null);
      setCaption('');
      onSaved();
    } catch (e) {
      if (!(e instanceof UploadAbortedError)) setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
      setProgress(null);
      abortRef.current = null;
    }
  }

  return (
    <div className="space-y-4">
      <StageRequirements stage={{ ...stage, brief: null, requirements: null }} />

      {stage.submission && (
        <div className="rounded-xl border border-success/30 bg-success-soft/40 p-4">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-success">
            <CheckCircle2 size={16} aria-hidden />
            {t('comp.yourEntry', { when: formatNpt(stage.submission.submittedAt) })}
            {stage.submission.version > 1 && <span className="font-normal text-ink-soft">· {t('comp.versionN', { n: stage.submission.version })}</span>}
          </p>
          <SubmissionPreview s={stage.submission} compact />
          {canReplace && !editing && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setEditing(true)}>{t('comp.replaceEntry')}</Button>
          )}
        </div>
      )}

      {stage.blockedReason && !stage.canSubmit && (
        <Alert tone="info">{stage.blockedReason}</Alert>
      )}
      {stage.submission && stage.canSubmit && !allowEdits && (
        <p className="text-[12.5px] text-ink-soft">{t('comp.editsLocked')}</p>
      )}

      {canReplace && editing && (
        <div className="space-y-3 rounded-xl border border-line p-4">
          {methods.length > 1 && (
            <SegmentedControl<SubmissionMethod>
              ariaLabel={t('comp.submitAs')}
              variant="pill"
              value={method}
              onChange={(m) => { setMethod(m); setError(''); }}
              options={methods.map((m) => ({ value: m, label: m === 'VIDEO_UPLOAD' ? t('comp.methodVideo') : t('comp.methodLink') }))}
            />
          )}

          {method === 'VIDEO_UPLOAD' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="sr-only"
                aria-label={t('comp.chooseVideo')}
                onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-dim px-3 py-2.5">
                  <UploadCloud size={18} aria-hidden className="shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{file.name}</span>
                  <span className="shrink-0 text-[12px] text-ink-soft">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  {!busy && (
                    <button type="button" aria-label={t('common.remove')} onClick={() => setFile(null)} className="rounded p-1 text-ink-soft hover:bg-surface"><X size={14} /></button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center hover:bg-surface-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <UploadCloud size={22} aria-hidden className="text-brand" />
                  <span className="text-[14px] font-semibold text-ink">{t('comp.chooseVideo')}</span>
                  <span className="text-[12px] text-ink-soft">{t('comp.videoLimits')}</span>
                </button>
              )}
              {fileWarning && <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-warning"><AlertTriangle size={13} aria-hidden />{fileWarning}</p>}
              {progress !== null && (
                <div className="mt-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('comp.uploading')}>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-dim">
                    <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[12px] text-ink-soft">
                    <span>{progress < 100 ? t('comp.uploadingPct', { pct: progress }) : t('comp.verifying')}</span>
                    {progress < 100 && <button type="button" className="font-semibold text-danger hover:underline" onClick={() => abortRef.current?.abort()}>{t('common.cancel')}</button>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <TextField
                label={t('comp.driveLink')}
                placeholder="https://drive.google.com/file/d/…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                icon={<Link2 size={16} />}
                inputMode="url"
              />
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{t('comp.linkHelp')}</p>
            </div>
          )}

          <TextField label={t('comp.captionOptional')} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} />
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} loading={busy}>{stage.submission ? t('comp.submitReplacement') : t('comp.submitEntry')}</Button>
            {stage.submission && !busy && <Button variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>}
          </div>
          <p className="text-[12px] text-ink-soft">{t('comp.deadlineReminder', { when: formatNpt(stage.deadline) })}</p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import eventLoadingSvg from '../../assets/event-loading.svg?raw';

const STEP_KEYS = [
  'biz.aiOverlayStep1',
  'biz.aiOverlayStep2',
  'biz.aiOverlayStep3',
  'biz.aiOverlayStep4',
  'biz.aiOverlayStep5',
  'biz.aiOverlayStep6',
] as const;

/** Full-screen loader shown while the AI drafts an event — mirrors the
 *  mobile app's AiGeneratingOverlay (same artwork, title, and rotating
 *  status lines) so business owners get the same "Kolab AI is working"
 *  moment on web. The caller only mounts this while busy (`{aiBusy && ...}`)
 *  so the step cycle always starts fresh at 0 with no reset-on-prop-change. */
export function AiGeneratingOverlay() {
  const t = useT();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEP_KEYS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-ink/80 p-6">
      <div
        className="h-56 w-56 sm:h-64 sm:w-64"
        // Inline SVG (not an <img>) so its SMIL <animate> elements actually play.
        dangerouslySetInnerHTML={{ __html: eventLoadingSvg }}
      />
      <p className="mt-2 text-center text-[17px] font-semibold text-white">{t('biz.aiOverlayTitle')}</p>
      <p key={stepIndex} className="step-fade min-h-[18px] text-center text-[13px] text-white/75">
        {t(STEP_KEYS[stepIndex])}
      </p>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Play, Square } from 'lucide-react';
import { useT } from '../i18n';
import { Modal } from '../ui/Modal';
import { cn } from '../ui/cn';

/**
 * "Need Help?" walkthrough — same content and tap-to-play/tap-to-stop pattern
 * as the mobile app's create-campaign screen. English is read aloud via the
 * browser's built-in speech synthesis; Nepali plays the same recorded
 * voiceover mobile uses, falling back to speech synthesis (Hindi voice) if
 * the audio can't load.
 */
const NEED_HELP_SCRIPT_EN = `Welcome to Kolab!
Create your event easily and connect with the right creators.

Choose the type of event you want to create.

Paid Event
Work with creators by paying them to create content that promotes your business.

Open Event
Invite creators to your event and let them experience your brand. You can offer free entry, gifts, food, drinks, or other benefits.

Create your event using text or voice.

Write
Describe your idea, and Kolab AI will create an event for you.

Voice
Tell your idea by speaking, and Kolab AI will turn it into an event.

You can add details like:

Budget
Location
Number of creators
Social media platforms
Event requirements

Your event will be saved as a draft.
Review the details, make any changes, and publish when ready.

You can also choose Featured Event to make your event more visible to creators.

Publish your event and start collaborating with creators.

Thank you for using Kolab.
Let's create great collaborations together!`;

const NEED_HELP_SCRIPT_NE = `कोल्याबमा स्वागत छ!
आफ्नो इभेन्ट सजिलै बनाउनुहोस् र सही क्रिएटरहरूसँग सहकार्य गर्नुहोस्।

सबैभन्दा पहिले आफूलाई चाहिएको इभेन्टको प्रकार छान्नुहोस्।

पेड इभेन्ट
क्रिएटरहरूलाई भुक्तानी गरेर आफ्नो बिजनेसको प्रचारका लागि कन्टेन्ट बनाउन लगाउनुहोस्।

ओपन इभेन्ट
क्रिएटरहरूलाई आफ्नो इभेन्टमा बोलाउनुहोस् र आफ्नो ब्रान्डको अनुभव साझा गर्न दिनुहोस्। तपाईं फ्री इन्ट्री, गिफ्ट, खाना, ड्रिंक्स वा अन्य सुविधा दिन सक्नुहुन्छ।

टेक्स्ट वा आवाज प्रयोग गरेर इभेन्ट बनाउनुहोस्।

लेखेर
आफ्नो आइडिया लेख्नुहोस्, कोल्याब एआईले तपाईंको लागि इभेन्ट तयार गर्छ।

आवाजबाट
आफ्नो आइडिया बोलेर भन्नुहोस्, कोल्याब एआईले त्यसलाई इभेन्टमा बदल्छ।

तपाईंले यी विवरणहरू थप्न सक्नुहुन्छ:

बजेट
स्थान
चाहिने क्रिएटरको संख्या
सामाजिक सञ्जाल प्लेटफर्म
इभेन्टको आवश्यकता

तपाईंको इभेन्ट मस्यौदाको रूपमा सुरक्षित हुनेछ।
विवरण हेर्नुहोस्, आवश्यक परिवर्तन गर्नुहोस् र तयार भएपछि प्रकाशित गर्नुहोस्।

थप क्रिएटरहरूको ध्यान आकर्षित गर्न विशेष इभेन्ट विकल्प पनि छान्न सक्नुहुन्छ।

इभेन्ट प्रकाशित गर्नुहोस् र क्रिएटरहरूसँग सहकार्य सुरु गर्नुहोस्।

कोल्याब प्रयोग गर्नुभएकोमा धन्यवाद।
आउनुहोस्, सँगै उत्कृष्ट सहकार्यहरू सिर्जना गरौं!`;

// Same recorded voiceover the mobile app plays for the Nepali script —
// Cloudinary serves it permanently at this versioned URL.
const NEED_HELP_NE_AUDIO_URL =
  'https://res.cloudinary.com/drpuqrfyn/video/upload/v1788886374/final_nepali_help_f3wtha.wav';

type PlayLang = 'en' | 'ne' | null;

export function NeedHelpButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<PlayLang>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NEED_HELP_NE_AUDIO_URL);
      audioRef.current.preload = 'none';
    }
    const audio = audioRef.current;
    const onEnded = () => setPlaying((cur) => (cur === 'ne' ? null : cur));
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  function stopAll() {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlaying(null);
  }

  function playEnglish() {
    const utterance = new SpeechSynthesisUtterance(NEED_HELP_SCRIPT_EN);
    utterance.lang = 'en-US';
    utterance.onend = () => setPlaying((cur) => (cur === 'en' ? null : cur));
    utterance.onerror = () => setPlaying((cur) => (cur === 'en' ? null : cur));
    window.speechSynthesis.speak(utterance);
  }

  function playNepali() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Audio couldn't start (e.g. offline on first load) — fall back to
      // reading the script aloud with a Hindi voice, same as mobile.
      const utterance = new SpeechSynthesisUtterance(NEED_HELP_SCRIPT_NE);
      utterance.lang = 'hi-IN';
      utterance.onend = () => setPlaying((cur) => (cur === 'ne' ? null : cur));
      utterance.onerror = () => setPlaying((cur) => (cur === 'ne' ? null : cur));
      window.speechSynthesis.speak(utterance);
    });
  }

  function handlePlay(lang: 'en' | 'ne') {
    const isThisPlaying = playing === lang;
    stopAll();
    if (isThisPlaying) return;
    setPlaying(lang);
    if (lang === 'en') playEnglish();
    else playNepali();
  }

  function handleClose() {
    stopAll();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-sm font-semibold text-brand hover:bg-surface-dim"
      >
        <HelpCircle size={16} />
        {t('biz.needHelpLink')}
      </button>

      <Modal open={open} onClose={handleClose} title={t('biz.needHelpTitle')}>
        <p className="mb-5 text-sm text-ink-soft">{t('biz.needHelpSub')}</p>
        <div className="flex gap-3">
          {(['en', 'ne'] as const).map((lang) => {
            const isPlaying = playing === lang;
            const isLocked = !isPlaying && playing !== null;
            const isEnglish = lang === 'en';
            return (
              <button
                key={lang}
                type="button"
                disabled={isLocked}
                onClick={() => handlePlay(lang)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-2 rounded-2xl border py-4 shadow-sm transition-opacity',
                  isPlaying ? (isEnglish ? 'border-brand' : 'border-brand-orange') : 'border-line',
                  isLocked && 'opacity-40',
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    isPlaying
                      ? isEnglish
                        ? 'bg-brand text-white'
                        : 'bg-brand-orange text-white'
                      : isEnglish
                        ? 'bg-brand/10 text-brand'
                        : 'bg-brand-orange/10 text-brand-orange',
                  )}
                >
                  {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </span>
                <span className="text-xs font-semibold text-ink">
                  {isEnglish ? t('biz.needHelpEnglish') : t('biz.needHelpNepali')}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

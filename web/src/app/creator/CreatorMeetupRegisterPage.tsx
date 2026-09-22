import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useAppAuth } from '../auth/AppAuthContext';
import {
  fetchMeetup,
  fetchMyMeetupRegistrations,
  registerForMeetup,
  type Meetup,
  type MeetupCreatorType,
} from '../api/meetup';
import { fetchCreatorFullProfile } from '../api/creator';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Alert } from '../ui/Alert';
import { StatusBadge } from '../ui/StatusBadge';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../ui/cn';
import { ApiError } from '../lib/apiClient';

const CREATOR_TYPES: MeetupCreatorType[] = [
  'CONTENT_CREATOR',
  'UGC_CREATOR',
  'INFLUENCER',
  'YOUTUBER',
  'SOCIAL_MEDIA_CREATOR',
  'BLOGGER_WRITER',
  'PHOTOGRAPHER_VIDEOGRAPHER',
  'OTHER',
];

const CREATOR_TYPE_LABEL_KEYS: Record<MeetupCreatorType, string> = {
  CONTENT_CREATOR: 'meetup.typeContentCreator',
  UGC_CREATOR: 'meetup.typeUgcCreator',
  INFLUENCER: 'meetup.typeInfluencer',
  YOUTUBER: 'meetup.typeYoutuber',
  SOCIAL_MEDIA_CREATOR: 'meetup.typeSocialMediaCreator',
  BLOGGER_WRITER: 'meetup.typeBloggerWriter',
  PHOTOGRAPHER_VIDEOGRAPHER: 'meetup.typePhotographerVideographer',
  OTHER: 'meetup.typeOther',
};

function formatEventDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function CreatorMeetupRegisterPage() {
  const t = useT();
  const { meetupId } = useParams<{ meetupId: string }>();

  const meetup = useAsync((s) => fetchMeetup(meetupId!, s), [meetupId]);
  const myRegistrations = useAsync((s) => fetchMyMeetupRegistrations(s), []);

  if (meetup.loading || myRegistrations.loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-2/3" />
        <SkeletonText lines={3} className="mt-4" />
      </div>
    );
  }

  if (meetup.error || !meetup.data) {
    const nf = meetup.error instanceof ApiError && meetup.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant={nf ? 'not-found' : 'error'}
          title={t('common.somethingWrong')}
          action={{ label: t('meetup.listTitle'), href: '/creator/meetups' }}
        />
      </div>
    );
  }

  const existing = myRegistrations.data?.find((r) => r.meetupId === meetup.data!.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('meetup.formTitle', { city: meetup.data.city })} />
      {/* Real date/time/venue are only revealed once a creator is actually
          ACCEPTED — everyone else (no registration yet, PENDING, REJECTED)
          sees the same "watch social media" placeholder as the confirmation
          email, even if the meetup already has logistics set (spec §16/§17
          intent: those details are a benefit of being invited, not public
          before that). */}
      <MeetupLocationCard meetup={meetup.data} revealLogistics={existing?.status === 'ACCEPTED'} />

      {existing ? (
        <RegistrationStatusCard status={existing.status} />
      ) : meetup.data.registrationStatus !== 'OPEN' ? (
        <Alert tone="warning" className="mt-4">{t('meetup.registrationNotOpen')}</Alert>
      ) : (
        <RegistrationFormLoader meetupId={meetup.data.id} />
      )}
    </div>
  );
}

function MeetupLocationCard({ meetup, revealLogistics }: { meetup: Meetup; revealLogistics: boolean }) {
  const t = useT();
  const eventDate = formatEventDate(meetup.eventDate);
  const hasLogistics = revealLogistics && (eventDate || meetup.eventStartTime || meetup.venueName);

  return (
    <Card className="mt-4 space-y-2">
      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
        <MapPin size={15} className="text-ink-soft" />
        {meetup.city}{meetup.district ? `, ${meetup.district}` : ''}
      </p>
      {hasLogistics ? (
        <div className="text-[13px] text-ink-soft">
          {eventDate && <p>📅 {eventDate}</p>}
          {meetup.eventStartTime && (
            <p>⏰ {meetup.eventStartTime}{meetup.eventEndTime ? ` – ${meetup.eventEndTime}` : ''}</p>
          )}
          {meetup.venueName && <p>📍 {meetup.venueName}{meetup.venueAddress ? `, ${meetup.venueAddress}` : ''}</p>}
        </div>
      ) : (
        <p className="text-[13px] text-ink-soft">{t('meetup.detailsAnnouncedSoon')}</p>
      )}
    </Card>
  );
}

function RegistrationStatusCard({ status }: { status: 'PENDING' | 'ACCEPTED' | 'REJECTED' }) {
  const t = useT();
  const config = {
    PENDING: { icon: Clock, tone: 'warning' as const, title: t('meetup.statusPendingTitle'), body: t('meetup.statusPendingBody') },
    ACCEPTED: { icon: CheckCircle2, tone: 'success' as const, title: t('meetup.statusAcceptedTitle'), body: t('meetup.statusAcceptedBody') },
    REJECTED: { icon: XCircle, tone: 'danger' as const, title: t('meetup.statusRejectedTitle'), body: t('meetup.statusRejectedBody') },
  }[status];
  const Icon = config.icon;

  return (
    <Card className="mt-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
            config.tone === 'success' && 'bg-success-soft text-success',
            config.tone === 'warning' && 'bg-warning-soft text-warning',
            config.tone === 'danger' && 'bg-danger-soft text-danger',
          )}
        >
          <Icon size={18} />
        </span>
        <div>
          <StatusBadge label={config.title} tone={config.tone} dot={false} className="mb-1.5" />
          <p className="text-[13.5px] text-ink-soft">{config.body}</p>
        </div>
      </div>
    </Card>
  );
}

// Waits for the profile fetch (prefill data) before mounting the form, so the
// form's useState initializers see the real values once — no setState-during-
// render juggling. Mirrors BusinessPromotionFormPage's load-then-render-with-
// `initial` shape.
function RegistrationFormLoader({ meetupId }: { meetupId: string }) {
  const { user } = useAppAuth();
  const profile = useAsync((s) => fetchCreatorFullProfile(s), []);

  if (profile.loading) {
    return (
      <div className="mt-4 space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const socialLinks = profile.data?.socialLinks ?? {};
  const prefillSocial = Object.values(socialLinks).find(Boolean) ?? '';

  return (
    <RegistrationForm
      meetupId={meetupId}
      initial={{
        fullName: profile.data?.fullName ?? '',
        phoneNumber: user?.phone ?? '',
        email: user?.email ?? '',
        socialMediaProfile: prefillSocial,
      }}
    />
  );
}

function RegistrationForm({ meetupId, initial }: {
  meetupId: string;
  initial: { fullName: string; phoneNumber: string; email: string; socialMediaProfile: string };
}) {
  const t = useT();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(initial.fullName);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber);
  const [email, setEmail] = useState(initial.email);
  const [creatorTypes, setCreatorTypes] = useState<MeetupCreatorType[]>([]);
  const [otherCreatorType, setOtherCreatorType] = useState('');
  const [socialMediaProfile, setSocialMediaProfile] = useState(initial.socialMediaProfile);
  const [attendancePreference, setAttendancePreference] = useState<'YES' | 'NOT_SURE'>('YES');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleCreatorType(type: MeetupCreatorType) {
    setCreatorTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t2) => t2 !== type);
      if (prev.length >= 2) return prev;
      return [...prev, type];
    });
  }

  function validate(): string {
    if (!fullName.trim()) return t('meetup.validationNameRequired');
    if (!phoneNumber.trim()) return t('meetup.validationPhoneRequired');
    if (creatorTypes.length === 0) return t('meetup.validationTypeRequired');
    if (creatorTypes.includes('OTHER') && !otherCreatorType.trim()) return t('meetup.validationOtherRequired');
    return '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);
    setError('');
    setSaving(true);
    try {
      await registerForMeetup(meetupId, {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        creatorTypes,
        otherCreatorType: otherCreatorType.trim() || undefined,
        socialMediaProfile: socialMediaProfile.trim() || undefined,
        attendancePreference,
        message: message.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err2) {
      setError(err2 instanceof Error ? err2.message : t('common.somethingWrong'));
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return <RegistrationStatusCard status="PENDING" />;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <Card className="space-y-4">
        <TextField label={t('meetup.fieldFullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label={t('meetup.fieldPhone')} type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <TextField label={t('meetup.fieldEmail')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Card>

      <Card className="space-y-3">
        <p className="text-[13px] font-semibold text-ink">{t('meetup.fieldCreatorType')}</p>
        <div className="flex flex-wrap gap-2">
          {CREATOR_TYPES.map((type) => {
            const selected = creatorTypes.includes(type);
            const disabled = !selected && creatorTypes.length >= 2;
            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => toggleCreatorType(type)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                  selected
                    ? 'border-brand bg-brand text-white'
                    : disabled
                      ? 'border-line text-ink-soft/50 cursor-not-allowed'
                      : 'border-line text-ink-soft hover:border-brand/50 hover:text-ink',
                )}
              >
                {t(CREATOR_TYPE_LABEL_KEYS[type])}
              </button>
            );
          })}
        </div>
        {creatorTypes.includes('OTHER') && (
          <TextField
            label={t('meetup.fieldOtherCreatorType')}
            value={otherCreatorType}
            onChange={(e) => setOtherCreatorType(e.target.value)}
          />
        )}
      </Card>

      <Card>
        <TextField
          label={t('meetup.fieldSocialProfile')}
          placeholder="instagram.com/yourhandle"
          value={socialMediaProfile}
          onChange={(e) => setSocialMediaProfile(e.target.value)}
        />
      </Card>

      <Card className="space-y-3">
        <p className="text-[13px] font-semibold text-ink">{t('meetup.fieldAttendance')}</p>
        <div className="flex gap-2">
          {(['YES', 'NOT_SURE'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAttendancePreference(opt)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors',
                attendancePreference === opt
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line text-ink-soft hover:border-brand/50',
              )}
            >
              {opt === 'YES' ? t('meetup.attendanceYes') : t('meetup.attendanceNotSure')}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Textarea
          label={t('meetup.fieldMessage')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          showCount
        />
      </Card>

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="lg" loading={saving} disabled={saving}>
          {t('meetup.submitButton')}
        </Button>
        <Button type="button" size="lg" variant="secondary" disabled={saving} onClick={() => navigate('/creator/meetups')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { FileText, IdCard, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../ui/Toast';
import { fetchCreatorFullProfile, uploadCitizenshipDoc, uploadCreatorPanDoc, type CreatorFullProfile } from '../api/creator';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { ContactVerificationCard } from '../ui/ContactVerificationCard';
import { DocUploadRow } from '../ui/DocUploadRow';

export function CreatorVerificationPage() {
  const t = useT();
  const toast = useToast();
  const profile = useAsync((s) => fetchCreatorFullProfile(s), []);
  const [uploading, setUploading] = useState<'citizenship' | 'pan' | null>(null);

  const p = profile.data;

  async function handleUpload(kind: 'citizenship' | 'pan', file: File) {
    setUploading(kind);
    try {
      const uploader = kind === 'citizenship' ? uploadCitizenshipDoc : uploadCreatorPanDoc;
      await uploader(file);
      profile.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('creatorVerification.uploadFailed'));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('creatorVerification.title')} />

      <ContactVerificationCard />

      {profile.loading ? (
        <Skeleton className="h-64 w-full" />
      ) : profile.error || !p ? (
        <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: profile.reload }} />
      ) : (
        <VerificationBody p={p} uploading={uploading} onUpload={handleUpload} />
      )}
    </div>
  );
}

function VerificationBody({
  p,
  uploading,
  onUpload,
}: {
  p: CreatorFullProfile;
  uploading: 'citizenship' | 'pan' | null;
  onUpload: (kind: 'citizenship' | 'pan', file: File) => void;
}) {
  const t = useT();
  const statusLabel = (status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED') =>
    t(`creatorVerification.status${status.charAt(0)}${status.slice(1).toLowerCase()}`);

  return (
    <>
      {p.verificationStatus === 'VERIFIED' ? (
        <Alert tone="success" className="mb-6">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={15} />
            {t('creatorVerification.verifiedMessage')}
          </span>
        </Alert>
      ) : p.verificationRejectReason ? (
        <Alert tone="error" className="mb-6">{t('creatorVerification.rejectedMessage', { reason: p.verificationRejectReason })}</Alert>
      ) : p.verificationStatus === 'PENDING' ? (
        <Alert tone="progress" className="mb-6">{t('creatorVerification.underReviewMessage')}</Alert>
      ) : (
        <Alert tone="info" className="mb-6">{t('creatorVerification.verifiedHint')}</Alert>
      )}

      <Card>
        <CardHeader title={t('creatorVerification.verifyAccountHeading')} />
        <div className="divide-y divide-line">
          <DocUploadRow
            icon={<IdCard size={16} />}
            label={t('creatorVerification.citizenshipLabel')}
            hint={t('creatorVerification.citizenshipHint')}
            status={p.citizenshipStatus}
            uploading={uploading === 'citizenship'}
            onUpload={(f) => onUpload('citizenship', f)}
            tapToUploadLabel={t('creatorVerification.tapToUpload')}
            statusLabel={statusLabel}
            uploadButtonLabel={t('creatorVerification.uploadButton')}
            cancelLabel={t('common.cancel')}
            doneLabel={t('creatorVerification.doneBadge')}
          />
          <DocUploadRow
            icon={<FileText size={16} />}
            label={t('creatorVerification.panLabel')}
            status={p.panDocStatus}
            uploading={uploading === 'pan'}
            onUpload={(f) => onUpload('pan', f)}
            tapToUploadLabel={t('creatorVerification.tapToUpload')}
            statusLabel={statusLabel}
            uploadButtonLabel={t('creatorVerification.uploadButton')}
            cancelLabel={t('common.cancel')}
            doneLabel={t('creatorVerification.doneBadge')}
          />
        </div>
      </Card>
    </>
  );
}

import { useState } from 'react';
import { FileText, IdCard, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../ui/Toast';
import { fetchBusinessProfile, uploadPanDoc, uploadCompanyRegDoc, uploadIdentityDoc, type BusinessProfile } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { ContactVerificationCard } from '../ui/ContactVerificationCard';
import { DocUploadRow } from '../ui/DocUploadRow';

export function BusinessVerificationPage() {
  const t = useT();
  const toast = useToast();
  const profile = useAsync((s) => fetchBusinessProfile(s), []);
  const [uploading, setUploading] = useState<'pan' | 'identity' | 'company' | null>(null);

  const p = profile.data;

  async function handleUpload(kind: 'pan' | 'identity' | 'company', file: File) {
    setUploading(kind);
    try {
      const uploader = kind === 'pan' ? uploadPanDoc : kind === 'identity' ? uploadIdentityDoc : uploadCompanyRegDoc;
      await uploader(file);
      profile.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('bizVerification.uploadFailed'));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('bizVerification.title')} />

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
  p: BusinessProfile;
  uploading: 'pan' | 'identity' | 'company' | null;
  onUpload: (kind: 'pan' | 'identity' | 'company', file: File) => void;
}) {
  const t = useT();
  const isIndividual = p.representingType === 'INDIVIDUAL';
  const statusLabel = (status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED') =>
    t(`bizVerification.status${status.charAt(0)}${status.slice(1).toLowerCase()}`);

  return (
    <>
      {p.verificationStatus === 'VERIFIED' ? (
        <Alert tone="success" className="mb-6">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={15} />
            {t('bizVerification.verifiedMessage')}
          </span>
        </Alert>
      ) : p.verificationRejectReason ? (
        <Alert tone="error" className="mb-6">{t('bizVerification.rejectedMessage', { reason: p.verificationRejectReason })}</Alert>
      ) : p.verificationStatus === 'PENDING' ? (
        <Alert tone="progress" className="mb-6">{t('bizVerification.underReviewMessage')}</Alert>
      ) : (
        <Alert tone="info" className="mb-6">{t('bizVerification.verifiedHint')}</Alert>
      )}

      <Card>
        <p className="mb-1 text-[13px] font-semibold text-ink">{t('bizVerification.uploadDocumentsHeading')}</p>
        <div className="divide-y divide-line">
          {isIndividual ? (
            <DocUploadRow
              icon={<IdCard size={16} />}
              label={t('bizVerification.identityLabel')}
              hint={t('bizVerification.identityHint')}
              status={p.identityDocStatus}
              uploading={uploading === 'identity'}
              onUpload={(f) => onUpload('identity', f)}
              tapToUploadLabel={t('bizVerification.tapToUpload')}
              statusLabel={statusLabel}
              uploadButtonLabel={t('bizVerification.uploadButton')}
              cancelLabel={t('common.cancel')}
              doneLabel={t('bizVerification.doneBadge')}
            />
          ) : (
            <>
              <DocUploadRow
                icon={<FileText size={16} />}
                label={t('bizVerification.panLabel')}
                status={p.panDocStatus}
                uploading={uploading === 'pan'}
                onUpload={(f) => onUpload('pan', f)}
                tapToUploadLabel={t('bizVerification.tapToUpload')}
                statusLabel={statusLabel}
                uploadButtonLabel={t('bizVerification.uploadButton')}
                cancelLabel={t('common.cancel')}
                doneLabel={t('bizVerification.doneBadge')}
              />
              <DocUploadRow
                icon={<FileText size={16} />}
                label={t('bizVerification.companyRegLabel')}
                status={p.companyRegDocStatus}
                uploading={uploading === 'company'}
                onUpload={(f) => onUpload('company', f)}
                tapToUploadLabel={t('bizVerification.tapToUpload')}
                statusLabel={statusLabel}
                uploadButtonLabel={t('bizVerification.uploadButton')}
                cancelLabel={t('common.cancel')}
                doneLabel={t('bizVerification.doneBadge')}
              />
            </>
          )}
        </div>
      </Card>
    </>
  );
}

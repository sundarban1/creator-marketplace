import { useState, type ReactNode } from 'react';
import { CheckCircle2, FileText, IdCard, ShieldCheck, Upload } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../ui/Toast';
import { fetchBusinessProfile, uploadPanDoc, uploadCompanyRegDoc, uploadIdentityDoc, type BusinessProfile } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

type DocStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

function DocRow({
  icon,
  label,
  hint,
  status,
  uploading,
  onUpload,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  status: DocStatus;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const t = useT();
  const locked = uploading || status === 'PENDING' || status === 'APPROVED';

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-[12px] text-ink-soft">
          {status === 'NONE' ? (hint ?? t('bizVerification.tapToUpload')) : t(`bizVerification.status${status.charAt(0)}${status.slice(1).toLowerCase()}`)}
        </p>
      </div>
      {status === 'APPROVED' ? (
        <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-semibold text-success">
          <CheckCircle2 size={13} />
          {t('bizVerification.doneBadge')}
        </span>
      ) : (
        <label
          className={`flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold ${
            locked ? 'cursor-not-allowed border-line-strong text-ink-soft opacity-60' : 'border-violet/30 text-violet-dark hover:bg-violet/[0.06]'
          }`}
        >
          {uploading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-dark border-t-transparent" aria-hidden />
          ) : (
            <Upload size={13} />
          )}
          {t('bizVerification.uploadButton')}
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            disabled={locked}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

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
            <DocRow
              icon={<IdCard size={16} />}
              label={t('bizVerification.identityLabel')}
              hint={t('bizVerification.identityHint')}
              status={p.identityDocStatus}
              uploading={uploading === 'identity'}
              onUpload={(f) => onUpload('identity', f)}
            />
          ) : (
            <>
              <DocRow
                icon={<FileText size={16} />}
                label={t('bizVerification.panLabel')}
                status={p.panDocStatus}
                uploading={uploading === 'pan'}
                onUpload={(f) => onUpload('pan', f)}
              />
              <DocRow
                icon={<FileText size={16} />}
                label={t('bizVerification.companyRegLabel')}
                status={p.companyRegDocStatus}
                uploading={uploading === 'company'}
                onUpload={(f) => onUpload('company', f)}
              />
            </>
          )}
        </div>
      </Card>
    </>
  );
}

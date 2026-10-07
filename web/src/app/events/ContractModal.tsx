import { useState, type ReactNode } from 'react';
import { Check, Download } from 'lucide-react';
import { useT } from '../i18n';
import { fetchContractPdfUrl, type ContractTerms } from '../api/contract';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { cn } from '../ui/cn';

// Renders "**bold**" spans inline within a single line of text.
function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((p) => p.length > 0)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
}

// contract.filledBody is lightweight Markdown (# / ## headers, **bold**, "* "
// bullet lines) — the same subset mobile's ContractModal renders, handled
// directly rather than pulling in a Markdown library.
function MarkdownBody({ text }: { text: string }) {
  const out: ReactNode[] = [];
  text.split('\n').forEach((line, i) => {
    const s = line.trim();
    if (s === '' || s === '---') return;
    if (s.startsWith('## ')) {
      out.push(<h4 key={i} className="mb-1 mt-3 text-[14px] font-semibold text-ink">{s.slice(3)}</h4>);
    } else if (s.startsWith('# ')) {
      out.push(<h3 key={i} className="mb-1 mt-4 text-[16px] font-bold text-ink">{s.slice(2)}</h3>);
    } else if (s.startsWith('* ') || s.startsWith('- ')) {
      out.push(
        <div key={i} className="mb-1 flex gap-2 pl-0.5">
          <span aria-hidden>•</span>
          <p className="flex-1">{renderInline(s.slice(2))}</p>
        </div>,
      );
    } else {
      out.push(<p key={i} className="mb-1">{renderInline(s)}</p>);
    }
  });
  return <div className="text-[13px] leading-5 text-ink">{out}</div>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * "Review & sign" dialog for a paid-campaign contract — shown when a creator
 * submits a proposal (preview, no contractId yet) and when a business accepts
 * one (persisted contract, PDF available). Web counterpart of mobile's
 * ContractModal: terms card + body + "I agree" checkbox gating the action.
 */
export function ContractModal({
  open,
  title,
  subtitle,
  filledBody,
  terms,
  contractId,
  agreeLabel,
  agreeing,
  error,
  onAgree,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  filledBody: string;
  terms: ContractTerms;
  /** Present only once the contract is persisted — gates "Download contract". */
  contractId?: string;
  agreeLabel: string;
  agreeing: boolean;
  error?: string;
  onAgree: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [agreed, setAgreed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const rows: [string, string][] = [
    ...(terms.role ? ([[t('contract.role'), terms.role]] as [string, string][]) : []),
    [t('contract.price'), terms.price],
    [t('contract.deadline'), fmtDate(terms.deadline)],
    [t('contract.timeline'), terms.timeline],
    [t('contract.content'), terms.deliverables],
  ];

  async function handleDownload() {
    if (!contractId || downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      window.open(await fetchContractPdfUrl(contractId), '_blank', 'noopener');
    } catch {
      setDownloadError(t('contract.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => (agreeing ? null : onClose())}
      title={title}
      size="lg"
      footer={
        <div className="space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-ink">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={agreed}
              disabled={agreeing}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span
              aria-hidden
              className={cn(
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40',
                agreed ? 'border-brand bg-brand text-white' : 'border-line-strong',
              )}
            >
              {agreed && <Check size={13} strokeWidth={3} />}
            </span>
            {t('contract.agreeCheckbox')}
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={agreeing}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onAgree} disabled={!agreed} loading={agreeing}>
              {agreeLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-ink-soft">{subtitle}</p>

        <dl className="overflow-hidden rounded-xl border border-line">
          {rows.map(([label, value], i) => (
            <div
              key={label}
              className={cn('flex items-start justify-between gap-3 px-3.5 py-3', i < rows.length - 1 && 'border-b border-line')}
            >
              <dt className="flex-shrink-0 text-[13px] font-medium text-ink-soft">{label}</dt>
              <dd className="line-clamp-3 text-right text-[13px] font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <MarkdownBody text={filledBody} />

        {contractId && (
          <div className="flex flex-col items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload} loading={downloading}>
              {!downloading && <Download size={15} />}
              {downloading ? t('contract.preparingPdf') : t('contract.download')}
            </Button>
            {downloadError && <p className="text-[12px] text-danger">{downloadError}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

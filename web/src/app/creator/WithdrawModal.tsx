import { useState, type FormEvent } from 'react';
import { useT } from '../i18n';
import { rupees } from '../lib/format';
import {
  createPayoutMethod,
  createWithdrawal,
  type PayoutMethod,
  type WalletSummary,
} from '../api/creator';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Select } from '../ui/Select';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';

type PayoutType = 'BANK' | 'ESEWA' | 'KHALTI';

export function WithdrawModal({
  open,
  onClose,
  summary,
  payoutMethods,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  summary: WalletSummary;
  payoutMethods: PayoutMethod[];
  onDone: (updated: WalletSummary) => void;
}) {
  const t = useT();
  const [added, setAdded] = useState<PayoutMethod[]>([]);
  const [addingExplicit, setAddingExplicit] = useState(false);
  const [methodId, setMethodId] = useState('');

  const methods = [...added, ...payoutMethods];
  const adding = addingExplicit || methods.length === 0;
  const selectedId = methodId || methods[0]?.id || '';
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const max = Math.min(summary.withdrawableBalance, summary.maxWithdrawal, summary.dailyWithdrawalLeft);

  function validateAmount(): number | null {
    const n = Number(amount);
    if (!amount.trim() || Number.isNaN(n)) {
      setAmountError(t('wallet.amountRequired'));
      return null;
    }
    if (n < summary.minWithdrawal) {
      setAmountError(t('wallet.amountTooLow', { min: summary.minWithdrawal.toLocaleString('en-IN') }));
      return null;
    }
    if (n > summary.withdrawableBalance) {
      setAmountError(t('wallet.amountExceedsBalance'));
      return null;
    }
    if (n > max) {
      setAmountError(t('wallet.amountTooHigh', { max: max.toLocaleString('en-IN') }));
      return null;
    }
    setAmountError('');
    return n;
  }

  async function handleWithdraw(e: FormEvent) {
    e.preventDefault();
    setError('');
    const n = validateAmount();
    if (n == null || !selectedId) return;

    setSubmitting(true);
    try {
      const updated = await createWithdrawal(selectedId, n);
      onDone(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('wallet.withdrawTitle')} size="lg">
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {adding ? (
        <AddPayoutForm
          onCancel={methods.length > 0 ? () => setAddingExplicit(false) : undefined}
          onSaved={(m) => {
            setAdded((prev) => [m, ...prev]);
            setMethodId(m.id);
            setAddingExplicit(false);
          }}
        />
      ) : (
        <form onSubmit={handleWithdraw} className="space-y-4">
          <Select
            label={t('wallet.payoutMethod')}
            value={selectedId}
            onChange={(e) => setMethodId(e.target.value)}
            options={methods.map((m) => ({
              value: m.id,
              label: `${payoutLabel(m)} · ${m.type}`,
            }))}
          />
          <button
            type="button"
            onClick={() => setAddingExplicit(true)}
            className="text-[13px] font-semibold text-violet-dark hover:underline"
          >
            + {t('wallet.addPayoutMethod')}
          </button>

          <TextField
            label={t('wallet.amount')}
            type="number"
            inputMode="numeric"
            hint={t('wallet.amountHint', {
              min: summary.minWithdrawal.toLocaleString('en-IN'),
              max: max.toLocaleString('en-IN'),
              available: rupees(summary.withdrawableBalance),
            })}
            error={amountError}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <p className="text-[12px] text-ink-soft">{t('wallet.processingNote')}</p>

          <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!selectedId}>
            {t('wallet.requestWithdrawal')}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function payoutLabel(m: PayoutMethod): string {
  if (m.label) return m.label;
  if (m.type === 'BANK') return `${m.bankName ?? 'Bank'} ••${(m.accountNumber ?? '').slice(-4)}`;
  return `${m.type} ••${(m.walletId ?? '').slice(-4)}`;
}

function AddPayoutForm({
  onSaved,
  onCancel,
}: {
  onSaved: (m: PayoutMethod) => void;
  onCancel?: () => void;
}) {
  const t = useT();
  const [type, setType] = useState<PayoutType>('ESEWA');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [walletId, setWalletId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const m = await createPayoutMethod(
        type === 'BANK'
          ? { type, accountName: accountName.trim(), bankName: bankName.trim(), accountNumber: accountNumber.trim(), branch: branch.trim() || undefined }
          : { type, accountName: accountName.trim(), walletId: walletId.trim() },
      );
      onSaved(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <SegmentedControl<PayoutType>
        ariaLabel={t('wallet.payoutMethod')}
        variant="pill"
        value={type}
        onChange={setType}
        options={[
          { value: 'ESEWA', label: t('wallet.payoutTypeEsewa') },
          { value: 'KHALTI', label: t('wallet.payoutTypeKhalti') },
          { value: 'BANK', label: t('wallet.payoutTypeBank') },
        ]}
      />

      <TextField label={t('wallet.accountName')} value={accountName} onChange={(e) => setAccountName(e.target.value)} />

      {type === 'BANK' ? (
        <>
          <TextField label={t('wallet.bankName')} value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <TextField label={t('wallet.accountNumber')} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          <TextField label={`${t('wallet.branch')} (${t('common.optional')})`} value={branch} onChange={(e) => setBranch(e.target.value)} />
        </>
      ) : (
        <TextField label={t('wallet.walletId')} value={walletId} onChange={(e) => setWalletId(e.target.value)} />
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" loading={saving} fullWidth={!onCancel}>
          {t('wallet.saveAccount')}
        </Button>
      </div>
    </form>
  );
}

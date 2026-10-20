import { useState, type FormEvent } from 'react';
import { ChevronRight, Landmark, Pencil, Trash2 } from 'lucide-react';
import { useT } from '../i18n';
import {
  createPayoutMethod,
  deletePayoutMethod,
  updatePayoutMethod,
  type CreatePayoutMethodInput,
  type PayoutMethod,
} from '../api/creator';
import { NEPAL_CLASS_A_BANKS, isKnownBank } from '../lib/nepalBanks';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';
import { Switch } from '../ui/Switch';
import { TextField } from '../ui/TextField';
import { confirmDialog } from '../ui/confirmDialog';
import { cn } from '../ui/cn';
import esewaLogo from '../../assets/payments/esewa.png';
import khaltiLogo from '../../assets/payments/khalti.png';
import { FieldError } from '../ui/FieldError';

type PayoutType = PayoutMethod['type'];

const TYPE_META: Record<PayoutType, { labelKey: string; logo?: string }> = {
  KHALTI: { labelKey: 'payoutMethods.typeKhalti', logo: khaltiLogo },
  ESEWA: { labelKey: 'payoutMethods.typeEsewa', logo: esewaLogo },
  BANK: { labelKey: 'payoutMethods.typeBank' },
};

// Same order as mobile's payout-methods.tsx picker.
const PICKER_ORDER: PayoutType[] = ['KHALTI', 'ESEWA', 'BANK'];
const OTHER_BANK = '__other__';

const maskTail = (v: string | null) => (v ? `••${v.slice(-4)}` : '');

/**
 * Payout accounts (eSewa / Khalti / bank) — web twin of mobile's
 * payout-methods.tsx + payout-method-form.tsx: a tile per type ("Add details"
 * or "Edit" when one exists), then the saved accounts with edit/delete.
 */
export function PayoutMethodsSection({
  methods,
  loading,
  onChanged,
}: {
  methods: PayoutMethod[];
  loading: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [form, setForm] = useState<{ type: PayoutType; existing: PayoutMethod | null } | null>(null);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const openFor = (type: PayoutType) =>
    setForm({ type, existing: methods.find((m) => m.type === type) ?? null });

  const handleDelete = async (m: PayoutMethod) => {
    const name = m.label?.trim() || t(TYPE_META[m.type].labelKey);
    const ok = await confirmDialog({
      title: t('payoutMethods.deleteTitle'),
      message: t('payoutMethods.deleteBody', { name }),
      confirmLabel: t('payoutMethods.delete'),
      tone: 'danger',
    });
    if (!ok) return;
    setError('');
    try {
      await deletePayoutMethod(m.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('payoutMethods.deleteBlocked'));
    }
  };

  return (
    <DashCard>
      <DashCardHeader title={t('payoutMethods.title')} />
      <p className="-mt-2 mb-4 text-[13px] text-ink-soft">{t('payoutMethods.emptySub')}</p>

      {flash && <Alert tone="success" className="mb-4">{flash}</Alert>}
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-3 gap-3">
        {PICKER_ORDER.map((type) => {
          const existing = methods.some((m) => m.type === type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => openFor(type)}
              disabled={loading}
              className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-3 text-center transition-colors hover:border-line-strong hover:bg-surface-dim disabled:opacity-60"
            >
              <TypeGlyph type={type} />
              <span className="text-[13.5px] font-semibold text-ink">{t(TYPE_META[type].labelKey)}</span>
              <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-medium', existing ? 'text-violet-dark' : 'text-ink-soft')}>
                {existing ? t('payoutMethods.edit') : t('payoutMethods.addDetails')}
                <ChevronRight size={12} />
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : (
        methods.length > 0 && (
          <ul className="mt-4 space-y-3">
            {methods.map((m) => {
              const secondary =
                m.type === 'BANK' ? [m.bankName, maskTail(m.accountNumber)].filter(Boolean).join(' · ') : maskTail(m.walletId);
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <TypeGlyph type={m.type} small />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-semibold text-ink">{m.label?.trim() || t(TYPE_META[m.type].labelKey)}</p>
                      {m.isDefault && (
                        <span className="rounded-full bg-violet/[0.1] px-2 py-0.5 text-[11px] font-semibold text-violet-dark">
                          {t('payoutMethods.defaultBadge')}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12.5px] text-ink-soft">{m.accountName}</p>
                    {secondary && <p className="truncate text-[12px] text-ink-soft">{secondary}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setForm({ type: m.type, existing: m })}
                      aria-label={t('payoutMethods.edit')}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-dim hover:text-ink"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      aria-label={t('payoutMethods.delete')}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-soft"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      <PayoutMethodFormModal
        state={form}
        onClose={() => setForm(null)}
        onSaved={(wasEdit) => {
          setForm(null);
          setFlash(wasEdit ? t('payoutMethods.updateSuccess') : t('payoutMethods.createSuccess'));
          onChanged();
        }}
      />
    </DashCard>
  );
}

function TypeGlyph({ type, small }: { type: PayoutType; small?: boolean }) {
  const logo = TYPE_META[type].logo;
  const box = small ? 'h-10 w-10' : 'h-11 w-11';
  return logo ? (
    <span className={cn('flex flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white', box)}>
      <img src={logo} alt="" className="h-full w-full object-contain p-1" />
    </span>
  ) : (
    <span className={cn('flex flex-shrink-0 items-center justify-center rounded-xl bg-violet/[0.1] text-violet-dark', box)}>
      <Landmark size={small ? 17 : 19} />
    </span>
  );
}

function PayoutMethodFormModal({
  state,
  onClose,
  onSaved,
}: {
  state: { type: PayoutType; existing: PayoutMethod | null } | null;
  onClose: () => void;
  onSaved: (wasEdit: boolean) => void;
}) {
  if (!state) return null;
  // Keyed so each open (new type or a different account) starts from fresh state.
  return (
    <PayoutMethodForm
      key={state.existing?.id ?? state.type}
      type={state.type}
      existing={state.existing}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function PayoutMethodForm({
  type,
  existing,
  onClose,
  onSaved,
}: {
  type: PayoutType;
  existing: PayoutMethod | null;
  onClose: () => void;
  onSaved: (wasEdit: boolean) => void;
}) {
  const t = useT();
  const initialBank = existing?.bankName ?? '';
  const [accountName, setAccountName] = useState(existing?.accountName ?? '');
  const [bankChoice, setBankChoice] = useState(initialBank ? (isKnownBank(initialBank) ? initialBank : OTHER_BANK) : '');
  const [otherBankName, setOtherBankName] = useState(initialBank && !isKnownBank(initialBank) ? initialBank : '');
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber ?? '');
  const [branch, setBranch] = useState(existing?.branch ?? '');
  const [walletId, setWalletId] = useState(existing?.walletId ?? '');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const bankName = bankChoice === OTHER_BANK ? otherBankName : bankChoice;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!accountName.trim()) errs.accountName = t('payoutMethods.errNameRequired');
    if (type === 'BANK') {
      if (!bankName.trim()) errs.bankName = t('payoutMethods.errBankNameRequired');
      if (!accountNumber.trim()) errs.accountNumber = t('payoutMethods.errAccountNumberRequired');
    } else if (!walletId.trim()) {
      errs.walletId = t('payoutMethods.errWalletIdRequired');
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const base = { accountName: accountName.trim(), label: label.trim() || undefined, isDefault };
    const payload: CreatePayoutMethodInput =
      type === 'BANK'
        ? { ...base, type, bankName: bankName.trim(), accountNumber: accountNumber.trim(), branch: branch.trim() || undefined }
        : { ...base, type, walletId: walletId.trim() };

    setSaving(true);
    setSubmitError('');
    try {
      if (existing) await updatePayoutMethod(existing.id, payload);
      else await createPayoutMethod(payload);
      onSaved(!!existing);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('payoutMethods.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${existing ? t('payoutMethods.editTitle') : t('payoutMethods.addTitle')} · ${t(TYPE_META[type].labelKey)}`}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {submitError && <Alert tone="error">{submitError}</Alert>}

        <TextField
          label={t('payoutMethods.accountNameLabel')}
          placeholder={t('payoutMethods.accountNamePlaceholder')}
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          error={errors.accountName}
        />

        {type === 'BANK' ? (
          <>
            <div>
              <Select
                label={t('payoutMethods.bankNameLabel')}
                value={bankChoice}
                onChange={(e) => setBankChoice(e.target.value)}
                placeholder={t('payoutMethods.bankNameSelect')}
                options={[
                  ...NEPAL_CLASS_A_BANKS.map((b) => ({ value: b, label: b })),
                  { value: OTHER_BANK, label: t('payoutMethods.otherBank') },
                ]}
              />
              {errors.bankName && bankChoice !== OTHER_BANK && (
                <FieldError message={errors.bankName} />
              )}
            </div>
            {bankChoice === OTHER_BANK && (
              <TextField
                label={t('payoutMethods.otherBankLabel')}
                placeholder={t('payoutMethods.bankNamePlaceholder')}
                value={otherBankName}
                onChange={(e) => setOtherBankName(e.target.value)}
                error={errors.bankName}
              />
            )}
            <TextField
              label={t('payoutMethods.accountNumberLabel')}
              placeholder={t('payoutMethods.accountNumberPlaceholder')}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              error={errors.accountNumber}
            />
            <TextField
              label={t('payoutMethods.branchLabel')}
              placeholder={t('payoutMethods.branchPlaceholder')}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </>
        ) : (
          <TextField
            label={type === 'ESEWA' ? t('payoutMethods.walletIdLabelEsewa') : t('payoutMethods.walletIdLabelKhalti')}
            placeholder={t('payoutMethods.walletIdPlaceholder')}
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            error={errors.walletId}
            inputMode="tel"
          />
        )}

        <TextField
          label={t('payoutMethods.labelLabel')}
          placeholder={t('payoutMethods.labelPlaceholder')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <Switch checked={isDefault} onChange={setIsDefault} label={t('payoutMethods.setDefault')} />

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving} fullWidth>
            {existing ? t('payoutMethods.saveBtn') : t('payoutMethods.createBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

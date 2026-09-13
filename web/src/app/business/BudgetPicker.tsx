import { useState } from 'react';
import { useT } from '../i18n';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import type { BudgetRateType, BudgetInputType } from './budgetPickerTypes';

function toInt(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}
function rs(n: number): string {
  return n.toLocaleString();
}

/**
 * Per-creator budget editor for the paid-event form. `budgetMin`/`budgetMax`
 * are always the per-creator bounds — the source of truth everywhere else in
 * the app. In TOTAL display mode the visible inputs show
 * `perCreator × creatorsNeeded` and divide back down on change.
 */
export function BudgetPicker({
  rateType,
  inputType,
  budgetMin,
  budgetMax,
  creatorsNeeded,
  onChange,
  ambiguousAmount,
  onResolveAmbiguous,
  error,
}: {
  rateType: BudgetRateType;
  inputType: BudgetInputType;
  budgetMin: number;
  budgetMax: number;
  creatorsNeeded: number;
  onChange: (min: number, max: number, rateType: BudgetRateType, inputType: BudgetInputType) => void;
  ambiguousAmount?: number | null;
  onResolveAmbiguous?: (mode: BudgetInputType) => void;
  error?: string;
}) {
  const t = useT();
  const count = Math.max(1, creatorsNeeded || 1);

  const factor = inputType === 'TOTAL' ? count : 1;
  const [minText, setMinText] = useState(() => (budgetMin > 0 ? String(budgetMin * factor) : ''));
  const [maxText, setMaxText] = useState(() => (budgetMax > 0 ? String(budgetMax * factor) : ''));

  function emit(nextMinText: string, nextMaxText: string, nextRate: BudgetRateType, nextInput: BudgetInputType) {
    const div = nextInput === 'TOTAL' ? count : 1;
    const pcMax = Math.floor(toInt(nextMaxText) / div);
    const pcMin = Math.floor(toInt(nextMinText) / div);
    onChange(nextRate === 'FIXED' ? pcMax : pcMin, pcMax, nextRate, nextInput);
  }

  // The brand stated one number and the AI can't tell if it's per creator or
  // a whole-campaign total. Resolve it before showing the normal inputs.
  if (ambiguousAmount != null && ambiguousAmount > 0 && onResolveAmbiguous) {
    const perCreatorTotal = ambiguousAmount * count;
    const totalPerCreator = Math.floor(ambiguousAmount / count);
    return (
      <div className="space-y-2.5">
        <p className="text-[14px] font-semibold text-ink">
          {t('biz.budgetAmbiguousTitle', { amount: rs(ambiguousAmount) })}
        </p>
        <button
          type="button"
          onClick={() => onResolveAmbiguous('PER_CREATOR')}
          className="block w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-left transition-colors hover:border-violet/40 hover:bg-violet/[0.04]"
        >
          <span className="block text-[14px] font-semibold text-ink">
            {t('biz.budgetAmbiguousPerCreator', { amount: rs(ambiguousAmount) })}
          </span>
          <span className="block text-[12px] text-ink-soft">
            {t('biz.budgetAmbiguousPerCreatorSub', { total: rs(perCreatorTotal) })}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onResolveAmbiguous('TOTAL')}
          className="block w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-left transition-colors hover:border-violet/40 hover:bg-violet/[0.04]"
        >
          <span className="block text-[14px] font-semibold text-ink">
            {t('biz.budgetAmbiguousTotal', { amount: rs(ambiguousAmount) })}
          </span>
          <span className="block text-[12px] text-ink-soft">
            {t('biz.budgetAmbiguousTotalSub', { perCreator: rs(totalPerCreator) })}
          </span>
        </button>
      </div>
    );
  }

  // budgetMax is the per-creator ceiling in every mode, so the campaign-wide
  // exposure is always creators × budgetMax.
  const isSet = budgetMax > 0 && (rateType === 'FIXED' || budgetMax >= budgetMin);
  const total = budgetMax * count;
  const totalMin = budgetMin * count;

  return (
    <div className="space-y-2.5">
      <SegmentedControl<BudgetRateType>
        ariaLabel={t('biz.budgetRateFixed')}
        value={rateType}
        onChange={(rt) => {
          if (rt === rateType) return;
          if (rt === 'FIXED') onChange(budgetMax || budgetMin, budgetMax || budgetMin, 'FIXED', inputType);
          else onChange(budgetMin || budgetMax, Math.max(budgetMax, budgetMin) || budgetMax, 'RANGE', inputType);
        }}
        options={[
          { value: 'FIXED', label: t('biz.budgetRateFixed') },
          { value: 'RANGE', label: t('biz.budgetRateRange') },
        ]}
      />

      <SegmentedControl<BudgetInputType>
        ariaLabel={t('biz.budgetInputTypePerCreator')}
        value={inputType}
        onChange={(it) => {
          if (it === inputType) return;
          onChange(budgetMin, budgetMax, rateType, it);
        }}
        options={[
          { value: 'PER_CREATOR', label: t('biz.budgetInputTypePerCreator') },
          { value: 'TOTAL', label: t('biz.budgetInputTypeTotal') },
        ]}
      />

      {rateType === 'FIXED' ? (
        <TextField
          label={t(inputType === 'TOTAL' ? 'biz.budgetTotalLabel' : 'biz.budgetPerCreatorLabel')}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={maxText}
          onChange={(e) => {
            setMinText(e.target.value);
            setMaxText(e.target.value);
            emit(e.target.value, e.target.value, 'FIXED', inputType);
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t(inputType === 'TOTAL' ? 'biz.budgetTotalMinLabel' : 'biz.budgetPerCreatorMinLabel')}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={minText}
            onChange={(e) => {
              setMinText(e.target.value);
              emit(e.target.value, maxText, 'RANGE', inputType);
            }}
          />
          <TextField
            label={t(inputType === 'TOTAL' ? 'biz.budgetTotalMaxLabel' : 'biz.budgetPerCreatorMaxLabel')}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxText}
            onChange={(e) => {
              setMaxText(e.target.value);
              emit(minText, e.target.value, 'RANGE', inputType);
            }}
          />
        </div>
      )}

      <p className="text-[12px] text-ink-soft">{t('biz.budgetMinHint')}</p>

      {isSet ? (
        <div className="rounded-xl border border-violet/30 bg-violet/[0.06] px-3.5 py-2.5">
          <p className="text-[14px] font-bold text-violet-dark">
            {inputType === 'TOTAL'
              ? rateType === 'FIXED'
                ? t('biz.budgetSummaryTotalPrimary', { total: rs(total) })
                : t('biz.budgetSummaryTotalPrimaryRange', { min: rs(totalMin), max: rs(total) })
              : rateType === 'FIXED'
                ? t('biz.budgetSummaryPerCreator', { amount: rs(budgetMax) })
                : t('biz.budgetSummaryPerCreatorRange', { min: rs(budgetMin), max: rs(budgetMax) })}
          </p>
          <p className="text-[12px] text-ink-soft">
            {inputType === 'TOTAL'
              ? rateType === 'FIXED'
                ? t('biz.budgetSummaryPerCreatorSub', { count, amount: rs(budgetMax) })
                : t('biz.budgetSummaryPerCreatorSubRange', { count, min: rs(budgetMin), max: rs(budgetMax) })
              : t(rateType === 'FIXED' ? 'biz.budgetSummaryTotal' : 'biz.budgetSummaryTotalUpTo', { count, total: rs(total) })}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface px-3.5 py-3">
          <p className="text-[13px] font-semibold text-ink">{t('biz.budgetNotSetTitle')}</p>
          <p className="text-[12px] text-ink-soft">{t('biz.budgetNotSetBody')}</p>
        </div>
      )}

      {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}

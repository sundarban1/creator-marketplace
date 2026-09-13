export type BudgetRateType = 'FIXED' | 'RANGE';
export type BudgetInputType = 'PER_CREATOR' | 'TOTAL';

// BudgetPicker seeds its visible fields from props once on mount and keeps
// them as the business types. Pass this as its `key` so switching the
// per-creator/total mode, the flat/range mode, the creator count, or
// resolving the AI's ambiguous amount remounts it and re-seeds from the
// current props — mirrors the mobile app's budgetPickerResetKey /
// PerCreatorBudgetPicker. Deliberately excludes budgetMin/budgetMax: those
// change on every keystroke as the business types (via the same onChange
// this key would otherwise react to), and remounting mid-keystroke would
// drop focus and the cursor position.
export function budgetPickerResetKey(o: {
  inputType: string;
  rateType: string;
  creatorsNeeded: number;
  budgetStatus?: string | null;
}): string {
  return `bpk:${o.inputType}:${o.rateType}:${o.creatorsNeeded}:${o.budgetStatus ?? ''}`;
}

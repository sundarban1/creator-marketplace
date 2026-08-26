import type { PayoutMethod } from '@prisma/client';

// Mask all but the last 4 of an account number / wallet id. Used on the admin
// list view; the owner always sees their own details in full.
export function maskAccountIdentifier(value: string | null): string | null {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  return `••••${trimmed.slice(-4)}`;
}

/** Full detail — for the owning creator's own endpoints. */
export function toPayoutMethodDto(m: PayoutMethod) {
  return {
    id:            m.id,
    type:          m.type,
    label:         m.label,
    accountName:   m.accountName,
    bankName:      m.bankName,
    branch:        m.branch,
    accountNumber: m.accountNumber,
    walletId:      m.walletId,
    isDefault:     m.isDefault,
    createdAt:     m.createdAt,
    updatedAt:     m.updatedAt,
  };
}

/** Masked — for admin lists where full numbers aren't needed. */
export function toMaskedPayoutMethodDto(m: PayoutMethod) {
  return {
    ...toPayoutMethodDto(m),
    accountNumber: maskAccountIdentifier(m.accountNumber),
    walletId:      maskAccountIdentifier(m.walletId),
  };
}

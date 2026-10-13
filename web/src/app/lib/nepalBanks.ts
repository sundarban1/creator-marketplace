// Nepal Rastra Bank "Class A" commercial banks — mirrors mobile's
// utilities/nepalBanks.ts. The payout form also offers a free-text "Other bank"
// escape hatch for development banks, finance companies, etc.
export const NEPAL_CLASS_A_BANKS: string[] = [
  'Agricultural Development Bank Limited',
  'Citizens Bank International Limited',
  'Everest Bank Limited',
  'Global IME Bank Limited',
  'Himalayan Bank Limited',
  'Kumari Bank Limited',
  'Laxmi Sunrise Bank Limited',
  'Machhapuchhre Bank Limited',
  'Nabil Bank Limited',
  'Nepal Bank Limited',
  'Nepal Investment Mega Bank Limited',
  'Nepal SBI Bank Limited',
  'NIC Asia Bank Limited',
  'NMB Bank Limited',
  'Prabhu Bank Limited',
  'Prime Commercial Bank Limited',
  'Rastriya Banijya Bank Limited',
  'Sanima Bank Limited',
  'Siddhartha Bank Limited',
  'Standard Chartered Bank Nepal Limited',
];

/** True when `name` is one of the known Class A banks (exact match). */
export function isKnownBank(name: string): boolean {
  return NEPAL_CLASS_A_BANKS.includes(name.trim());
}

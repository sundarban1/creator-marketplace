// Nepal Rastra Bank "Class A" commercial banks — the licence class that offers
// full deposit/current accounts, so it's what a creator's payout account will
// almost always be. Kept as a static list because it changes rarely (only when
// NRB approves a merger) and a wrong/invented bank name is worse than a
// free-typed one. Source: NRB list of licensed BFIs. Current as of 2024, after
// the Laxmi+Sunrise and Nepal Investment+Mega mergers (20 banks).
//
// The payout form also offers a free-text "Other bank" escape hatch for
// accounts at development banks (Class B), finance companies (Class C), or
// anything not on this list.

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

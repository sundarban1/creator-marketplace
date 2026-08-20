// §15/§61 — how much granular location a public profile view exposes.
// EXACT is opt-in (the profile owner explicitly chose it), so showing the
// full address there is the intended behavior, not an accidental leak —
// PRD's "never expose exact addresses unless explicitly intended" caveat.
export function maskLocationByVisibility(loc: {
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
}, visibility: 'EXACT' | 'CITY' | 'DISTRICT') {
  if (visibility === 'EXACT') return loc;
  if (visibility === 'DISTRICT') return { province: loc.province, district: loc.district, city: null, area: null, address: null };
  return { province: loc.province, district: null, city: loc.city, area: null, address: null };
}

// Google Places autocomplete only gives us a formatted string (e.g.
// "Biratnagar Airport, Biratnagar, Nepal"), not structured address
// components — so `city` (used for search/masking) is derived from it
// rather than left for a business to fill in separately. The piece right
// before the trailing country name is the closest approximation available.
export function deriveCityFromLocation(location: string): string | null {
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 2] || null;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

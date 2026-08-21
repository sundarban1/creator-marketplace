// Nepal's administrative hierarchy, for the Province → District → City /
// Municipality location input the service-taker onboarding spec (§14) asks for.
//
// Scope note: the two upper levels are complete and authoritative — Nepal has
// 7 provinces and 77 districts, and that mapping is stable. The third level
// (753 local units: 6 metropolitan, 11 sub-metropolitan, 276 municipalities,
// 460 rural municipalities) is deliberately NOT bundled here. It is large,
// changes more often, and is easy to get subtly wrong; a wrong municipality
// name is worse than a free-text one because it looks authoritative. So the
// City / Municipality level is a text field, with the metropolitan and
// sub-metropolitan cities offered as suggestions where we know them (those 17
// are stable and cover most urban signups).
//
// District names are kept in English in both locales. They are routinely
// written in English in Nepali-language UIs, and hand-translating 77 of them
// would risk inventing spellings — only the 7 province names, which are
// high-visibility and unambiguous, carry a Nepali label.

export type Province = {
  /** Canonical value persisted to BusinessProfile.province. */
  name: string;
  /** Nepali display label. */
  nameNe: string;
  districts: string[];
};

export const NEPAL_PROVINCES: Province[] = [
  {
    name: 'Koshi',
    nameNe: 'कोशी',
    districts: [
      'Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga',
      'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung',
      'Terhathum', 'Udayapur',
    ],
  },
  {
    name: 'Madhesh',
    nameNe: 'मधेश',
    districts: [
      'Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha',
    ],
  },
  {
    name: 'Bagmati',
    nameNe: 'बागमती',
    districts: [
      'Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok',
      'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli',
      'Sindhupalchok',
    ],
  },
  {
    name: 'Gandaki',
    nameNe: 'गण्डकी',
    districts: [
      'Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi',
      'Nawalpur', 'Parbat', 'Syangja', 'Tanahun',
    ],
  },
  {
    name: 'Lumbini',
    nameNe: 'लुम्बिनी',
    districts: [
      'Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Eastern Rukum', 'Gulmi',
      'Kapilvastu', 'Palpa', 'Parasi', 'Pyuthan', 'Rolpa', 'Rupandehi',
    ],
  },
  {
    name: 'Karnali',
    nameNe: 'कर्णाली',
    districts: [
      'Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu',
      'Salyan', 'Surkhet', 'Western Rukum',
    ],
  },
  {
    name: 'Sudurpashchim',
    nameNe: 'सुदूरपश्चिम',
    districts: [
      'Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti',
      'Kailali', 'Kanchanpur',
    ],
  },
];

// Nepal's 6 metropolitan and 11 sub-metropolitan cities, keyed by the district
// they sit in. Offered as one-tap suggestions on the City / Municipality field;
// a district with no entry here (or a user in a smaller municipality or rural
// municipality) just types it in. Not exhaustive by design — see the note at
// the top of this file.
export const MAJOR_CITIES_BY_DISTRICT: Record<string, string[]> = {
  Kathmandu:  ['Kathmandu Metropolitan City'],
  Lalitpur:   ['Lalitpur Metropolitan City'],
  Chitwan:    ['Bharatpur Metropolitan City'],
  Parsa:      ['Birgunj Metropolitan City'],
  Morang:     ['Biratnagar Metropolitan City'],
  Kaski:      ['Pokhara Metropolitan City'],
  Bara:       ['Jitpur Simara Sub-Metropolitan City', 'Kalaiya Sub-Metropolitan City'],
  Makwanpur:  ['Hetauda Sub-Metropolitan City'],
  Kailali:    ['Dhangadhi Sub-Metropolitan City'],
  Dang:       ['Tulsipur Sub-Metropolitan City', 'Ghorahi Sub-Metropolitan City'],
  Rupandehi:  ['Butwal Sub-Metropolitan City'],
  Dhanusha:   ['Janakpur Sub-Metropolitan City'],
  Sunsari:    ['Dharan Sub-Metropolitan City', 'Itahari Sub-Metropolitan City'],
  Banke:      ['Nepalgunj Sub-Metropolitan City'],
};

export function districtsOf(provinceName: string | null): string[] {
  if (!provinceName) return [];
  return NEPAL_PROVINCES.find((p) => p.name === provinceName)?.districts ?? [];
}

/** The single-line address the rest of the app stores in `location` and
 *  geocodes for lat/lng — most specific part first, matching how Google
 *  Places formats the strings this replaces. */
export function composeLocationString(city: string, district: string, province: string): string {
  return [city.trim(), district, `${province} Province`, 'Nepal'].filter(Boolean).join(', ');
}

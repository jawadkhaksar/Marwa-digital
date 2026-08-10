// ISO 3166-1 alpha-2 + E.164 calling codes for the Tel field's country
// selector (packages/builder/src/registry.ts's `showCountryCode` option).
// Flags are derived from the ISO code at render time (see `flagEmoji`
// below) rather than stored as data, so this list is just codes/names/dial
// codes — no emoji to keep in sync.
export interface CountryDialCode {
  iso2: string;
  name: string;
  dialCode: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso2: "AT", name: "Austria", dialCode: "+43" },
  { iso2: "DE", name: "Germany", dialCode: "+49" },
  { iso2: "CH", name: "Switzerland", dialCode: "+41" },
  { iso2: "IT", name: "Italy", dialCode: "+39" },
  { iso2: "GB", name: "United Kingdom", dialCode: "+44" },
  { iso2: "US", name: "United States", dialCode: "+1" },
  { iso2: "CA", name: "Canada", dialCode: "+1" },
  { iso2: "FR", name: "France", dialCode: "+33" },
  { iso2: "ES", name: "Spain", dialCode: "+34" },
  { iso2: "PT", name: "Portugal", dialCode: "+351" },
  { iso2: "NL", name: "Netherlands", dialCode: "+31" },
  { iso2: "BE", name: "Belgium", dialCode: "+32" },
  { iso2: "LU", name: "Luxembourg", dialCode: "+352" },
  { iso2: "IE", name: "Ireland", dialCode: "+353" },
  { iso2: "DK", name: "Denmark", dialCode: "+45" },
  { iso2: "SE", name: "Sweden", dialCode: "+46" },
  { iso2: "NO", name: "Norway", dialCode: "+47" },
  { iso2: "FI", name: "Finland", dialCode: "+358" },
  { iso2: "IS", name: "Iceland", dialCode: "+354" },
  { iso2: "PL", name: "Poland", dialCode: "+48" },
  { iso2: "CZ", name: "Czechia", dialCode: "+420" },
  { iso2: "SK", name: "Slovakia", dialCode: "+421" },
  { iso2: "HU", name: "Hungary", dialCode: "+36" },
  { iso2: "SI", name: "Slovenia", dialCode: "+386" },
  { iso2: "HR", name: "Croatia", dialCode: "+385" },
  { iso2: "RS", name: "Serbia", dialCode: "+381" },
  { iso2: "RO", name: "Romania", dialCode: "+40" },
  { iso2: "BG", name: "Bulgaria", dialCode: "+359" },
  { iso2: "GR", name: "Greece", dialCode: "+30" },
  { iso2: "TR", name: "Turkey", dialCode: "+90" },
  { iso2: "UA", name: "Ukraine", dialCode: "+380" },
  { iso2: "RU", name: "Russia", dialCode: "+7" },
  { iso2: "EE", name: "Estonia", dialCode: "+372" },
  { iso2: "LV", name: "Latvia", dialCode: "+371" },
  { iso2: "LT", name: "Lithuania", dialCode: "+370" },
  { iso2: "LI", name: "Liechtenstein", dialCode: "+423" },
  { iso2: "MT", name: "Malta", dialCode: "+356" },
  { iso2: "CY", name: "Cyprus", dialCode: "+357" },
  { iso2: "AL", name: "Albania", dialCode: "+355" },
  { iso2: "BA", name: "Bosnia and Herzegovina", dialCode: "+387" },
  { iso2: "MK", name: "North Macedonia", dialCode: "+389" },
  { iso2: "ME", name: "Montenegro", dialCode: "+382" },
  { iso2: "AU", name: "Australia", dialCode: "+61" },
  { iso2: "NZ", name: "New Zealand", dialCode: "+64" },
  { iso2: "JP", name: "Japan", dialCode: "+81" },
  { iso2: "KR", name: "South Korea", dialCode: "+82" },
  { iso2: "CN", name: "China", dialCode: "+86" },
  { iso2: "HK", name: "Hong Kong", dialCode: "+852" },
  { iso2: "TW", name: "Taiwan", dialCode: "+886" },
  { iso2: "SG", name: "Singapore", dialCode: "+65" },
  { iso2: "MY", name: "Malaysia", dialCode: "+60" },
  { iso2: "TH", name: "Thailand", dialCode: "+66" },
  { iso2: "ID", name: "Indonesia", dialCode: "+62" },
  { iso2: "PH", name: "Philippines", dialCode: "+63" },
  { iso2: "VN", name: "Vietnam", dialCode: "+84" },
  { iso2: "IN", name: "India", dialCode: "+91" },
  { iso2: "PK", name: "Pakistan", dialCode: "+92" },
  { iso2: "BD", name: "Bangladesh", dialCode: "+880" },
  { iso2: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { iso2: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { iso2: "QA", name: "Qatar", dialCode: "+974" },
  { iso2: "KW", name: "Kuwait", dialCode: "+965" },
  { iso2: "IL", name: "Israel", dialCode: "+972" },
  { iso2: "EG", name: "Egypt", dialCode: "+20" },
  { iso2: "ZA", name: "South Africa", dialCode: "+27" },
  { iso2: "NG", name: "Nigeria", dialCode: "+234" },
  { iso2: "KE", name: "Kenya", dialCode: "+254" },
  { iso2: "MA", name: "Morocco", dialCode: "+212" },
  { iso2: "BR", name: "Brazil", dialCode: "+55" },
  { iso2: "MX", name: "Mexico", dialCode: "+52" },
  { iso2: "AR", name: "Argentina", dialCode: "+54" },
  { iso2: "CL", name: "Chile", dialCode: "+56" },
  { iso2: "CO", name: "Colombia", dialCode: "+57" },
  { iso2: "PE", name: "Peru", dialCode: "+51" },
];

/** Regional-indicator flag emoji derived from an ISO2 code — no emoji data to keep in sync. */
export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

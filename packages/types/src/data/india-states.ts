/**
 * Canonical list of Indian states + union territories.
 *
 * Codes follow ISO 3166-2:IN (e.g. `MN` = Manipur, `DL` = Delhi). The
 * `priority` flag surfaces the home-base / primary-destination entries
 * (Manipur and Delhi) at the top of selection lists across the dashboard;
 * the rest fall through in alphabetical order.
 */

export type IndianStateCode =
  | "AN" | "AP" | "AR" | "AS" | "BR" | "CG" | "CH" | "DH" | "DL"
  | "GA" | "GJ" | "HP" | "HR" | "JH" | "JK" | "KA" | "KL" | "LA"
  | "LD" | "MH" | "ML" | "MN" | "MP" | "MZ" | "NL" | "OR" | "PB"
  | "PY" | "RJ" | "SK" | "TG" | "TN" | "TR" | "UK" | "UP" | "WB"

export interface IndianState {
  code: IndianStateCode
  name: string
  /** State capital (also acts as default city candidate). */
  capital: string
  /** Whether this entry is a Union Territory rather than a state. */
  isUT: boolean
  /** Mark for surfacing at the top of the list — Manipur + Delhi by default. */
  priority?: boolean
}

export const INDIAN_STATES: readonly IndianState[] = [
  // — priority —
  { code: "MN", name: "Manipur",                                          capital: "Imphal",           isUT: false, priority: true },
  { code: "DL", name: "Delhi",                                            capital: "New Delhi",        isUT: true,  priority: true },
  // — states (alpha) —
  { code: "AP", name: "Andhra Pradesh",                                   capital: "Amaravati",        isUT: false },
  { code: "AR", name: "Arunachal Pradesh",                                capital: "Itanagar",         isUT: false },
  { code: "AS", name: "Assam",                                            capital: "Dispur",           isUT: false },
  { code: "BR", name: "Bihar",                                            capital: "Patna",            isUT: false },
  { code: "CG", name: "Chhattisgarh",                                     capital: "Raipur",           isUT: false },
  { code: "GA", name: "Goa",                                              capital: "Panaji",           isUT: false },
  { code: "GJ", name: "Gujarat",                                          capital: "Gandhinagar",      isUT: false },
  { code: "HR", name: "Haryana",                                          capital: "Chandigarh",       isUT: false },
  { code: "HP", name: "Himachal Pradesh",                                 capital: "Shimla",           isUT: false },
  { code: "JH", name: "Jharkhand",                                        capital: "Ranchi",           isUT: false },
  { code: "KA", name: "Karnataka",                                        capital: "Bengaluru",        isUT: false },
  { code: "KL", name: "Kerala",                                           capital: "Thiruvananthapuram",isUT: false },
  { code: "MP", name: "Madhya Pradesh",                                   capital: "Bhopal",           isUT: false },
  { code: "MH", name: "Maharashtra",                                      capital: "Mumbai",           isUT: false },
  { code: "ML", name: "Meghalaya",                                        capital: "Shillong",         isUT: false },
  { code: "MZ", name: "Mizoram",                                          capital: "Aizawl",           isUT: false },
  { code: "NL", name: "Nagaland",                                         capital: "Kohima",           isUT: false },
  { code: "OR", name: "Odisha",                                           capital: "Bhubaneswar",      isUT: false },
  { code: "PB", name: "Punjab",                                           capital: "Chandigarh",       isUT: false },
  { code: "RJ", name: "Rajasthan",                                        capital: "Jaipur",           isUT: false },
  { code: "SK", name: "Sikkim",                                           capital: "Gangtok",          isUT: false },
  { code: "TN", name: "Tamil Nadu",                                       capital: "Chennai",          isUT: false },
  { code: "TG", name: "Telangana",                                        capital: "Hyderabad",        isUT: false },
  { code: "TR", name: "Tripura",                                          capital: "Agartala",         isUT: false },
  { code: "UP", name: "Uttar Pradesh",                                    capital: "Lucknow",          isUT: false },
  { code: "UK", name: "Uttarakhand",                                      capital: "Dehradun",         isUT: false },
  { code: "WB", name: "West Bengal",                                      capital: "Kolkata",          isUT: false },
  // — union territories (alpha) —
  { code: "AN", name: "Andaman and Nicobar Islands",                      capital: "Port Blair",       isUT: true },
  { code: "CH", name: "Chandigarh",                                       capital: "Chandigarh",       isUT: true },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu",         capital: "Daman",            isUT: true },
  { code: "JK", name: "Jammu and Kashmir",                                capital: "Srinagar",         isUT: true },
  { code: "LA", name: "Ladakh",                                           capital: "Leh",              isUT: true },
  { code: "LD", name: "Lakshadweep",                                      capital: "Kavaratti",        isUT: true },
  { code: "PY", name: "Puducherry",                                       capital: "Puducherry",       isUT: true },
] as const

/** O(1) lookup by code. */
export const INDIAN_STATES_BY_CODE: Readonly<Record<IndianStateCode, IndianState>> =
  Object.fromEntries(INDIAN_STATES.map((s) => [s.code, s])) as Record<IndianStateCode, IndianState>

/** O(1) lookup by name (case-insensitive). */
const NAME_INDEX: Record<string, IndianState> = Object.fromEntries(
  INDIAN_STATES.map((s) => [s.name.toLowerCase(), s]),
)

export function findIndianStateByName(name: string | undefined | null): IndianState | undefined {
  if (!name) return undefined
  return NAME_INDEX[name.toLowerCase().trim()]
}

export function findIndianStateByCode(code: string | undefined | null): IndianState | undefined {
  if (!code) return undefined
  return INDIAN_STATES_BY_CODE[code.toUpperCase() as IndianStateCode]
}

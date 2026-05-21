import type { IndianStateCode } from "./india-states"

/**
 * Curated list of Indian cities used for address autocomplete across the
 * dashboard. Covers:
 *
 *  - all 36 state / UT capitals,
 *  - every major Manipur municipality (TAC's home network),
 *  - every NE-region capital + key tier-2 hub,
 *  - tier-1 metros and tier-2 commerce hubs nationwide.
 *
 * `priority: true` floats the entry to the top of the list — reserved for
 * Imphal and New Delhi as TAC's primary origin / destination.
 *
 * This is a pragmatic working set, not an exhaustive census directory; the
 * combobox always permits free-text entry so any village or settlement can
 * still be typed. To grow the list, append in alphabetical order under the
 * appropriate state and re-export from the package barrel.
 */

export interface IndianCity {
  name: string
  stateCode: IndianStateCode
  priority?: boolean
}

export const INDIAN_CITIES: readonly IndianCity[] = [
  // ── PRIORITY ──
  { name: "Imphal",        stateCode: "MN", priority: true },
  { name: "New Delhi",     stateCode: "DL", priority: true },

  // ── MANIPUR (full coverage) ──
  { name: "Bishnupur",     stateCode: "MN" },
  { name: "Chandel",       stateCode: "MN" },
  { name: "Churachandpur", stateCode: "MN" },
  { name: "Jiribam",       stateCode: "MN" },
  { name: "Kakching",      stateCode: "MN" },
  { name: "Kamjong",       stateCode: "MN" },
  { name: "Kangpokpi",     stateCode: "MN" },
  { name: "Mayang Imphal", stateCode: "MN" },
  { name: "Moirang",       stateCode: "MN" },
  { name: "Moreh",         stateCode: "MN" },
  { name: "Nambol",        stateCode: "MN" },
  { name: "Noney",         stateCode: "MN" },
  { name: "Pherzawl",      stateCode: "MN" },
  { name: "Senapati",      stateCode: "MN" },
  { name: "Tamenglong",    stateCode: "MN" },
  { name: "Thoubal",       stateCode: "MN" },
  { name: "Ukhrul",        stateCode: "MN" },

  // ── DELHI (UT) ──
  { name: "Delhi",         stateCode: "DL" },
  { name: "Dwarka",        stateCode: "DL" },
  { name: "Najafgarh",     stateCode: "DL" },
  { name: "Narela",        stateCode: "DL" },
  { name: "Rohini",        stateCode: "DL" },
  { name: "Saket",         stateCode: "DL" },

  // ── NE REGION CAPITALS + KEY HUBS ──
  { name: "Guwahati",      stateCode: "AS" },
  { name: "Dispur",        stateCode: "AS" },
  { name: "Silchar",       stateCode: "AS" },
  { name: "Dibrugarh",     stateCode: "AS" },
  { name: "Jorhat",        stateCode: "AS" },
  { name: "Tezpur",        stateCode: "AS" },
  { name: "Tinsukia",      stateCode: "AS" },
  { name: "Itanagar",      stateCode: "AR" },
  { name: "Pasighat",      stateCode: "AR" },
  { name: "Kohima",        stateCode: "NL" },
  { name: "Dimapur",       stateCode: "NL" },
  { name: "Mokokchung",    stateCode: "NL" },
  { name: "Aizawl",        stateCode: "MZ" },
  { name: "Lunglei",       stateCode: "MZ" },
  { name: "Shillong",      stateCode: "ML" },
  { name: "Tura",          stateCode: "ML" },
  { name: "Agartala",      stateCode: "TR" },
  { name: "Udaipur",       stateCode: "TR" },
  { name: "Gangtok",       stateCode: "SK" },
  { name: "Namchi",        stateCode: "SK" },

  // ── ANDHRA PRADESH ──
  { name: "Amaravati",     stateCode: "AP" },
  { name: "Vijayawada",    stateCode: "AP" },
  { name: "Visakhapatnam", stateCode: "AP" },
  { name: "Guntur",        stateCode: "AP" },
  { name: "Tirupati",      stateCode: "AP" },
  { name: "Kakinada",      stateCode: "AP" },
  { name: "Nellore",       stateCode: "AP" },
  { name: "Kurnool",       stateCode: "AP" },

  // ── BIHAR ──
  { name: "Patna",         stateCode: "BR" },
  { name: "Gaya",          stateCode: "BR" },
  { name: "Bhagalpur",     stateCode: "BR" },
  { name: "Muzaffarpur",   stateCode: "BR" },
  { name: "Darbhanga",     stateCode: "BR" },
  { name: "Purnia",        stateCode: "BR" },

  // ── CHHATTISGARH ──
  { name: "Raipur",        stateCode: "CG" },
  { name: "Bhilai",        stateCode: "CG" },
  { name: "Bilaspur",      stateCode: "CG" },
  { name: "Korba",         stateCode: "CG" },

  // ── GOA ──
  { name: "Panaji",        stateCode: "GA" },
  { name: "Margao",        stateCode: "GA" },
  { name: "Vasco da Gama", stateCode: "GA" },

  // ── GUJARAT ──
  { name: "Ahmedabad",     stateCode: "GJ" },
  { name: "Gandhinagar",   stateCode: "GJ" },
  { name: "Surat",         stateCode: "GJ" },
  { name: "Vadodara",      stateCode: "GJ" },
  { name: "Rajkot",        stateCode: "GJ" },
  { name: "Bhavnagar",     stateCode: "GJ" },
  { name: "Jamnagar",      stateCode: "GJ" },

  // ── HARYANA ──
  { name: "Faridabad",     stateCode: "HR" },
  { name: "Gurugram",      stateCode: "HR" },
  { name: "Panipat",       stateCode: "HR" },
  { name: "Ambala",        stateCode: "HR" },
  { name: "Hisar",         stateCode: "HR" },
  { name: "Karnal",        stateCode: "HR" },

  // ── HIMACHAL PRADESH ──
  { name: "Shimla",        stateCode: "HP" },
  { name: "Manali",        stateCode: "HP" },
  { name: "Dharamshala",   stateCode: "HP" },
  { name: "Solan",         stateCode: "HP" },

  // ── JHARKHAND ──
  { name: "Ranchi",        stateCode: "JH" },
  { name: "Jamshedpur",    stateCode: "JH" },
  { name: "Dhanbad",       stateCode: "JH" },
  { name: "Bokaro",        stateCode: "JH" },
  { name: "Hazaribagh",    stateCode: "JH" },

  // ── KARNATAKA ──
  { name: "Bengaluru",     stateCode: "KA" },
  { name: "Mysuru",        stateCode: "KA" },
  { name: "Mangaluru",     stateCode: "KA" },
  { name: "Hubballi",      stateCode: "KA" },
  { name: "Belagavi",      stateCode: "KA" },
  { name: "Kalaburagi",    stateCode: "KA" },
  { name: "Davangere",     stateCode: "KA" },

  // ── KERALA ──
  { name: "Thiruvananthapuram", stateCode: "KL" },
  { name: "Kochi",         stateCode: "KL" },
  { name: "Kozhikode",     stateCode: "KL" },
  { name: "Thrissur",      stateCode: "KL" },
  { name: "Kollam",        stateCode: "KL" },
  { name: "Alappuzha",     stateCode: "KL" },
  { name: "Kannur",        stateCode: "KL" },

  // ── MADHYA PRADESH ──
  { name: "Bhopal",        stateCode: "MP" },
  { name: "Indore",        stateCode: "MP" },
  { name: "Jabalpur",      stateCode: "MP" },
  { name: "Gwalior",       stateCode: "MP" },
  { name: "Ujjain",        stateCode: "MP" },
  { name: "Sagar",         stateCode: "MP" },

  // ── MAHARASHTRA ──
  { name: "Mumbai",        stateCode: "MH" },
  { name: "Pune",          stateCode: "MH" },
  { name: "Nagpur",        stateCode: "MH" },
  { name: "Nashik",        stateCode: "MH" },
  { name: "Thane",         stateCode: "MH" },
  { name: "Aurangabad",    stateCode: "MH" },
  { name: "Solapur",       stateCode: "MH" },
  { name: "Kolhapur",      stateCode: "MH" },
  { name: "Amravati",      stateCode: "MH" },
  { name: "Navi Mumbai",   stateCode: "MH" },

  // ── ODISHA ──
  { name: "Bhubaneswar",   stateCode: "OR" },
  { name: "Cuttack",       stateCode: "OR" },
  { name: "Rourkela",      stateCode: "OR" },
  { name: "Berhampur",     stateCode: "OR" },
  { name: "Sambalpur",     stateCode: "OR" },

  // ── PUNJAB ──
  { name: "Ludhiana",      stateCode: "PB" },
  { name: "Amritsar",      stateCode: "PB" },
  { name: "Jalandhar",     stateCode: "PB" },
  { name: "Patiala",       stateCode: "PB" },
  { name: "Bathinda",      stateCode: "PB" },
  { name: "Mohali",        stateCode: "PB" },

  // ── RAJASTHAN ──
  { name: "Jaipur",        stateCode: "RJ" },
  { name: "Jodhpur",       stateCode: "RJ" },
  { name: "Udaipur",       stateCode: "RJ" },
  { name: "Kota",          stateCode: "RJ" },
  { name: "Bikaner",       stateCode: "RJ" },
  { name: "Ajmer",         stateCode: "RJ" },
  { name: "Alwar",         stateCode: "RJ" },

  // ── TAMIL NADU ──
  { name: "Chennai",       stateCode: "TN" },
  { name: "Coimbatore",    stateCode: "TN" },
  { name: "Madurai",       stateCode: "TN" },
  { name: "Tiruchirappalli", stateCode: "TN" },
  { name: "Salem",         stateCode: "TN" },
  { name: "Erode",         stateCode: "TN" },
  { name: "Tirunelveli",   stateCode: "TN" },
  { name: "Vellore",       stateCode: "TN" },
  { name: "Thoothukudi",   stateCode: "TN" },

  // ── TELANGANA ──
  { name: "Hyderabad",     stateCode: "TG" },
  { name: "Warangal",      stateCode: "TG" },
  { name: "Nizamabad",     stateCode: "TG" },
  { name: "Karimnagar",    stateCode: "TG" },

  // ── UTTAR PRADESH ──
  { name: "Lucknow",       stateCode: "UP" },
  { name: "Kanpur",        stateCode: "UP" },
  { name: "Agra",          stateCode: "UP" },
  { name: "Varanasi",      stateCode: "UP" },
  { name: "Meerut",        stateCode: "UP" },
  { name: "Allahabad",     stateCode: "UP" },
  { name: "Ghaziabad",     stateCode: "UP" },
  { name: "Noida",         stateCode: "UP" },
  { name: "Bareilly",      stateCode: "UP" },
  { name: "Gorakhpur",     stateCode: "UP" },
  { name: "Aligarh",       stateCode: "UP" },
  { name: "Moradabad",     stateCode: "UP" },

  // ── UTTARAKHAND ──
  { name: "Dehradun",      stateCode: "UK" },
  { name: "Haridwar",      stateCode: "UK" },
  { name: "Roorkee",       stateCode: "UK" },
  { name: "Haldwani",      stateCode: "UK" },

  // ── WEST BENGAL ──
  { name: "Kolkata",       stateCode: "WB" },
  { name: "Howrah",        stateCode: "WB" },
  { name: "Durgapur",      stateCode: "WB" },
  { name: "Asansol",       stateCode: "WB" },
  { name: "Siliguri",      stateCode: "WB" },
  { name: "Darjeeling",    stateCode: "WB" },
  { name: "Kharagpur",     stateCode: "WB" },

  // ── J&K / LADAKH ──
  { name: "Srinagar",      stateCode: "JK" },
  { name: "Jammu",         stateCode: "JK" },
  { name: "Anantnag",      stateCode: "JK" },
  { name: "Leh",           stateCode: "LA" },
  { name: "Kargil",        stateCode: "LA" },

  // ── OTHER UTs ──
  { name: "Port Blair",    stateCode: "AN" },
  { name: "Chandigarh",    stateCode: "CH" },
  { name: "Daman",         stateCode: "DH" },
  { name: "Diu",           stateCode: "DH" },
  { name: "Silvassa",      stateCode: "DH" },
  { name: "Kavaratti",     stateCode: "LD" },
  { name: "Puducherry",    stateCode: "PY" },
  { name: "Karaikal",      stateCode: "PY" },
] as const

/** Cities indexed by state code, alphabetised within each state with priority floated. */
export const INDIAN_CITIES_BY_STATE: Readonly<Record<IndianStateCode, IndianCity[]>> = (() => {
  const map = {} as Record<IndianStateCode, IndianCity[]>
  for (const city of INDIAN_CITIES) {
    if (!map[city.stateCode]) map[city.stateCode] = []
    map[city.stateCode]!.push(city)
  }
  for (const code in map) {
    map[code as IndianStateCode]!.sort((a, b) => {
      if (a.priority && !b.priority) return -1
      if (b.priority && !a.priority) return 1
      return a.name.localeCompare(b.name)
    })
  }
  return map
})()

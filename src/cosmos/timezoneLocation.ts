/**
 * Best-effort { lat, lng } for the visitor's location, derived from their IANA
 * timezone via the Intl API - no permission prompt and no network call. Used to
 * orient the homepage globe so it faces the visitor's country when Earth appears.
 *
 * Coordinates are city-level approximations (from the IANA tz database's
 * zone.tab) - accurate enough to centre the right country, not GPS-precise.
 * Anything not in the table falls back to a longitude derived from the current
 * UTC offset (so the correct side of Earth still faces the viewer).
 */

// IANA timezone -> [lat, lng] (north / east positive).
const TZ_COORDS: Record<string, [number, number]> = {
  // --- Asia ---
  "Asia/Bangkok": [13.75, 100.52],
  "Asia/Tokyo": [35.68, 139.69],
  "Asia/Shanghai": [31.23, 121.47],
  "Asia/Hong_Kong": [22.28, 114.16],
  "Asia/Macau": [22.2, 113.55],
  "Asia/Taipei": [25.03, 121.57],
  "Asia/Singapore": [1.29, 103.85],
  "Asia/Seoul": [37.57, 126.98],
  "Asia/Pyongyang": [39.02, 125.75],
  "Asia/Kolkata": [22.57, 88.36],
  "Asia/Calcutta": [22.57, 88.36],
  "Asia/Dubai": [25.2, 55.27],
  "Asia/Jakarta": [-6.21, 106.85],
  "Asia/Makassar": [-5.13, 119.42],
  "Asia/Manila": [14.6, 120.98],
  "Asia/Ho_Chi_Minh": [10.82, 106.63],
  "Asia/Saigon": [10.82, 106.63],
  "Asia/Phnom_Penh": [11.55, 104.92],
  "Asia/Vientiane": [17.97, 102.6],
  "Asia/Yangon": [16.8, 96.15],
  "Asia/Kuala_Lumpur": [3.14, 101.69],
  "Asia/Brunei": [4.9, 114.94],
  "Asia/Karachi": [24.86, 67.0],
  "Asia/Dhaka": [23.81, 90.41],
  "Asia/Kathmandu": [27.72, 85.32],
  "Asia/Colombo": [6.93, 79.85],
  "Asia/Kabul": [34.53, 69.17],
  "Asia/Tehran": [35.69, 51.39],
  "Asia/Baghdad": [33.34, 44.4],
  "Asia/Jerusalem": [31.78, 35.22],
  "Asia/Beirut": [33.89, 35.5],
  "Asia/Amman": [31.95, 35.93],
  "Asia/Damascus": [33.51, 36.29],
  "Asia/Riyadh": [24.71, 46.68],
  "Asia/Qatar": [25.29, 51.53],
  "Asia/Bahrain": [26.23, 50.59],
  "Asia/Kuwait": [29.38, 47.99],
  "Asia/Muscat": [23.59, 58.41],
  "Asia/Baku": [40.41, 49.87],
  "Asia/Tbilisi": [41.72, 44.79],
  "Asia/Yerevan": [40.18, 44.51],
  "Asia/Almaty": [43.25, 76.95],
  "Asia/Tashkent": [41.31, 69.24],
  "Asia/Ulaanbaatar": [47.89, 106.91],
  "Asia/Yekaterinburg": [56.84, 60.6],
  "Asia/Novosibirsk": [55.03, 82.92],
  "Asia/Krasnoyarsk": [56.01, 92.79],
  "Asia/Irkutsk": [52.27, 104.3],
  "Asia/Vladivostok": [43.12, 131.89],

  // --- Europe ---
  "Europe/London": [51.51, -0.13],
  "Europe/Dublin": [53.35, -6.26],
  "Europe/Lisbon": [38.72, -9.14],
  "Europe/Madrid": [40.42, -3.7],
  "Europe/Paris": [48.85, 2.35],
  "Europe/Brussels": [50.85, 4.35],
  "Europe/Amsterdam": [52.37, 4.9],
  "Europe/Berlin": [52.52, 13.4],
  "Europe/Zurich": [47.37, 8.55],
  "Europe/Rome": [41.9, 12.5],
  "Europe/Vienna": [48.21, 16.37],
  "Europe/Prague": [50.08, 14.44],
  "Europe/Bratislava": [48.15, 17.11],
  "Europe/Ljubljana": [46.05, 14.51],
  "Europe/Zagreb": [45.81, 15.98],
  "Europe/Belgrade": [44.79, 20.45],
  "Europe/Budapest": [47.5, 19.04],
  "Europe/Warsaw": [52.23, 21.01],
  "Europe/Copenhagen": [55.68, 12.57],
  "Europe/Oslo": [59.91, 10.75],
  "Europe/Stockholm": [59.33, 18.07],
  "Europe/Helsinki": [60.17, 24.94],
  "Europe/Tallinn": [59.44, 24.75],
  "Europe/Riga": [56.95, 24.11],
  "Europe/Vilnius": [54.69, 25.28],
  "Europe/Minsk": [53.9, 27.57],
  "Europe/Kyiv": [50.45, 30.52],
  "Europe/Kiev": [50.45, 30.52],
  "Europe/Chisinau": [47.0, 28.86],
  "Europe/Bucharest": [44.43, 26.1],
  "Europe/Sofia": [42.7, 23.32],
  "Europe/Athens": [37.98, 23.73],
  "Europe/Istanbul": [41.01, 28.98],
  "Europe/Moscow": [55.76, 37.62],

  // --- Americas ---
  "America/New_York": [40.71, -74.01],
  "America/Toronto": [43.65, -79.38],
  "America/Montreal": [45.5, -73.57],
  "America/Halifax": [44.65, -63.57],
  "America/Chicago": [41.88, -87.63],
  "America/Winnipeg": [49.9, -97.14],
  "America/Denver": [39.74, -104.99],
  "America/Edmonton": [53.55, -113.49],
  "America/Phoenix": [33.45, -112.07],
  "America/Los_Angeles": [34.05, -118.24],
  "America/Vancouver": [49.28, -123.12],
  "America/Tijuana": [32.51, -117.04],
  "America/Anchorage": [61.22, -149.9],
  "America/Mexico_City": [19.43, -99.13],
  "America/Monterrey": [25.69, -100.32],
  "America/Guatemala": [14.63, -90.51],
  "America/Costa_Rica": [9.93, -84.08],
  "America/Panama": [8.98, -79.52],
  "America/Bogota": [4.71, -74.07],
  "America/Lima": [-12.05, -77.04],
  "America/Caracas": [10.48, -66.9],
  "America/Santiago": [-33.45, -70.67],
  "America/Sao_Paulo": [-23.55, -46.63],
  "America/Argentina/Buenos_Aires": [-34.6, -58.38],
  "America/Buenos_Aires": [-34.6, -58.38],
  "America/Montevideo": [-34.9, -56.19],
  "America/Santo_Domingo": [18.47, -69.9],

  // --- Africa ---
  "Africa/Casablanca": [33.57, -7.59],
  "Africa/Algiers": [36.75, 3.06],
  "Africa/Tunis": [36.8, 10.18],
  "Africa/Tripoli": [32.89, 13.19],
  "Africa/Cairo": [30.04, 31.24],
  "Africa/Khartoum": [15.5, 32.56],
  "Africa/Lagos": [6.52, 3.38],
  "Africa/Accra": [5.6, -0.19],
  "Africa/Abidjan": [5.35, -4.0],
  "Africa/Dakar": [14.69, -17.44],
  "Africa/Addis_Ababa": [9.03, 38.74],
  "Africa/Nairobi": [-1.29, 36.82],
  "Africa/Dar_es_Salaam": [-6.79, 39.21],
  "Africa/Kampala": [0.35, 32.58],
  "Africa/Johannesburg": [-26.2, 28.05],

  // --- Oceania ---
  "Australia/Perth": [-31.95, 115.86],
  "Australia/Adelaide": [-34.93, 138.6],
  "Australia/Darwin": [-12.46, 130.84],
  "Australia/Brisbane": [-27.47, 153.03],
  "Australia/Sydney": [-33.87, 151.21],
  "Australia/Melbourne": [-37.81, 144.96],
  "Pacific/Auckland": [-36.85, 174.76],
  "Pacific/Fiji": [-18.14, 178.44],
  "Pacific/Guam": [13.44, 144.79],
  "Pacific/Port_Moresby": [-9.44, 147.18],
  "Pacific/Honolulu": [21.31, -157.86],
};

/**
 * The viewer's approximate location for orienting the globe. Reads the IANA
 * timezone (no prompt); falls back to a UTC-offset longitude for zones not in
 * the table.
 */
export function userLatLng(): { lat: number; lng: number } {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    /* Intl unavailable - fall through to the offset estimate */
  }

  const hit = TZ_COORDS[tz];
  if (hit) return { lat: hit[0], lng: hit[1] };

  // Fallback: derive longitude from the current UTC offset (DST-aware).
  // getTimezoneOffset() is minutes BEHIND UTC, so negate; 15 deg per hour.
  const offsetMin = -new Date().getTimezoneOffset();
  const lng = Math.max(-180, Math.min(180, (offsetMin / 60) * 15));
  return { lat: 20, lng };
}

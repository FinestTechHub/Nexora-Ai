// Prices and points for every plan and top-up pack. Shared by the pricing page and the server.
// The SERVER always computes the charge from this file (never from anything the browser sends).
export type Region = "NG" | "GB" | "EU" | "US";
export type Item = {
  id: string; kind: "plan" | "topup"; name: string; points: number;
  ngnKobo: number; usdCents: number;               // what is actually charged
  display: Record<Region, number>;                 // what the user sees, in their own currency
};

export const ITEMS: Item[] = [
  { id: "creator", kind: "plan", name: "Creator", points: 1200, ngnKobo: 2_700_000, usdCents: 2000, display: { US: 20, NG: 27000, GB: 15, EU: 18 } },
  { id: "pro", kind: "plan", name: "Pro", points: 3500, ngnKobo: 6_600_000, usdCents: 4900, display: { US: 49, NG: 66000, GB: 37, EU: 45 } },
  { id: "topup_150", kind: "topup", name: "150 points", points: 150, ngnKobo: 680_000, usdCents: 500, display: { US: 5, NG: 6800, GB: 4, EU: 5 } },
  { id: "topup_700", kind: "topup", name: "700 points", points: 700, ngnKobo: 2_700_000, usdCents: 2000, display: { US: 20, NG: 27000, GB: 15, EU: 18 } },
  { id: "topup_2100", kind: "topup", name: "2,100 points", points: 2100, ngnKobo: 6_700_000, usdCents: 5000, display: { US: 50, NG: 67000, GB: 38, EU: 46 } },
  { id: "topup_5000", kind: "topup", name: "5,000 points", points: 5000, ngnKobo: 13_500_000, usdCents: 10000, display: { US: 100, NG: 135000, GB: 76, EU: 91 } },
];
export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
export const SYMBOL: Record<Region, string> = { US: "$", NG: "₦", GB: "£", EU: "€" };
export const money = (r: Region, n: number) => `${SYMBOL[r]}${n.toLocaleString("en-US")}`;

const EU_COUNTRIES = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "));
const EU_ZONES = new Set(["Paris", "Berlin", "Madrid", "Rome", "Amsterdam", "Brussels", "Vienna", "Lisbon", "Dublin", "Athens", "Helsinki", "Stockholm", "Copenhagen", "Warsaw", "Prague", "Budapest", "Bucharest", "Sofia", "Zagreb", "Bratislava", "Ljubljana", "Vilnius", "Riga", "Tallinn", "Luxembourg", "Malta", "Nicosia"]);

/** Country from Vercel's x-vercel-ip-country header. NG, GB, any EU country, otherwise US/global. */
export function regionFromCountry(code: string): Region {
  const c = code.toUpperCase();
  return c === "NG" ? "NG" : c === "GB" ? "GB" : EU_COUNTRIES.has(c) ? "EU" : "US";
}
/** Fallback when there is no IP header: the browser's time zone. */
export function regionFromTimezone(tz?: string): Region {
  if (!tz) return "US";
  if (tz === "Africa/Lagos") return "NG";
  if (tz === "Europe/London") return "GB";
  const [area, city] = tz.split("/");
  return area === "Europe" && EU_ZONES.has(city) ? "EU" : "US";
}
export const detectRegion = (ipCountry?: string | null): Region => (ipCountry ? regionFromCountry(ipCountry) : "US");

/** "₦27,000" or "$19.90" from the smallest unit (kobo or cents). */
export function formatCharge(currency: string, minor: number) {
  const sym = currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `, v = minor / 100;
  return `${sym}${v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
export function itemLabel(itemId: string) {
  const i = itemById(itemId);
  return !i ? itemId : i.kind === "plan" ? `${i.name} plan` : `${i.points.toLocaleString("en-US")}-point top-up`;
}
/** Paid / Pending / Failed. A payment still "pending" after a day was never completed, so it counts as Failed. */
export function txStatus(t: { status: string; created_at: string }): "paid" | "pending" | "failed" {
  if (t.status === "success") return "paid";
  if (t.status === "failed") return "failed";
  return Date.now() - Date.parse(t.created_at) > 24 * 3600 * 1000 ? "failed" : "pending";
}
export function channelLabel(c?: string | null) {
  const m: Record<string, string> = { card: "Card", bank: "Bank", bank_transfer: "Bank Transfer", ussd: "USSD", mobile_money: "Mobile Money", qr: "QR", apple_pay: "Apple Pay", eft: "EFT" };
  return c ? (m[c] ?? c.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase())) : "Paystack";
}

import { admin } from "@/lib/points/server";

// SERVER ONLY. Needs PAYSTACK_SECRET_KEY in Vercel (a secret, never NEXT_PUBLIC_).
const API = "https://api.paystack.co";
export const paystackKey = () => process.env.PAYSTACK_SECRET_KEY || "";

export async function paystackRequest(path: string, init?: { method?: string; body?: unknown }) {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${paystackKey()}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.status === true, status: res.status, json };
}

/** Credits a paid transaction. Safe to call any number of times (webhook + return page): the database credits it only once. */
export async function settle(reference: string, amountMinor: number, currency: string) {
  const { data, error } = await admin().rpc("credit_paystack_purchase", { p_reference: reference, p_amount_minor: amountMinor, p_currency: currency });
  if (error) {
    if (error.message.includes("unknown_reference")) return { kind: "unknown" as const };
    if (error.message.includes("amount_mismatch")) return { kind: "mismatch" as const };
    throw error;
  }
  return { kind: "ok" as const, already: Boolean(data.already), points: Number(data.points), balance: Number(data.balance) };
}

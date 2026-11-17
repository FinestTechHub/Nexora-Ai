import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { admin } from "@/lib/points/server";
import { itemById } from "@/lib/payments/catalog";
import { paystackKey, paystackRequest } from "@/lib/payments/paystack";

export const runtime = "nodejs";
const reply = (status: number, message: string) => NextResponse.json({ message }, { status });

export async function POST(req: Request) {
  let user: User | null = null;
  try { user = (await (await createClient()).auth.getUser()).data.user; } catch { /* not signed in */ }
  if (!user?.email) return reply(401, "Please log in again.");
  const u = { id: user.id, email: user.email };

  let body: { itemId?: string; countryCode?: string };
  try { body = await req.json(); } catch { return reply(400, "Invalid request."); }
  const item = itemById(String(body.itemId));
  if (!item) return reply(400, "Unknown item.");
  if (!paystackKey()) return reply(500, "Payments aren’t set up yet.");

  // The IP country decides when it is available; otherwise the browser's guess is used. Nigeria pays in NGN, everyone else in USD.
  const ip = req.headers.get("x-vercel-ip-country");
  const isNG = ip ? ip.toUpperCase() === "NG" : String(body.countryCode).toUpperCase() === "NG";
  const reference = `nx_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`;
  const callback_url = `${new URL(req.url).origin}/dashboard/pricing`; // Paystack adds ?reference=... itself
  const start = (currency: "NGN" | "USD") => paystackRequest("/transaction/initialize", { method: "POST", body: {
    email: u.email, currency, reference, callback_url,
    amount: currency === "NGN" ? item.ngnKobo : item.usdCents, // the server sets the amount, never the browser
    metadata: { userId: u.id, itemId: item.id, points: item.points },
  } });

  let currency: "NGN" | "USD" = isNG ? "NGN" : "USD";
  let r = await start(currency);
  if (!r.ok && currency === "USD" && /currenc/i.test(String(r.json?.message ?? ""))) { currency = "NGN"; r = await start(currency); } // USD not enabled on the account: use Naira so the payment still works
  const url = r.json?.data?.authorization_url as string | undefined;
  if (!r.ok || !url) { console.error("Paystack initialize failed:", r.status, JSON.stringify(r.json)); return reply(502, "Couldn’t start the payment. Please try again."); }

  const { error } = await admin().from("payment_transactions").insert({
    reference, user_id: u.id, item_id: item.id, currency, points: item.points,
    amount_minor: currency === "NGN" ? item.ngnKobo : item.usdCents,
    description: `Purchase: ${item.kind === "plan" ? `${item.name} plan` : `${item.points.toLocaleString("en-US")} point top-up`}`,
  });
  if (error) { console.error("payment_transactions insert failed:", error.message); return reply(500, "Couldn’t start the payment. Please try again."); }
  return NextResponse.json({ authorization_url: url, reference, currency });
}

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { admin } from "@/lib/points/server";
import { paystackRequest, settle } from "@/lib/payments/paystack";

export const runtime = "nodejs";

// Called when Paystack sends the customer back to /dashboard/pricing?reference=...
export async function GET(req: Request) {
  let user: User | null = null;
  try { user = (await (await createClient()).auth.getUser()).data.user; } catch { /* not signed in */ }
  if (!user) return NextResponse.json({ status: "error", message: "Please log in again." }, { status: 401 });
  const reference = new URL(req.url).searchParams.get("reference") ?? "";
  if (!reference) return NextResponse.json({ status: "error", message: "Missing reference." }, { status: 400 });

  const db = admin();
  const { data: row } = await db.from("payment_transactions").select("user_id, status, points_credited").eq("reference", reference).maybeSingle();
  if (!row || row.user_id !== user.id) return NextResponse.json({ status: "unknown" }, { status: 404 });
  if (row.status === "success") return NextResponse.json({ status: "success", already: true, points: row.points_credited });

  const v = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!v.ok) return NextResponse.json({ status: "pending" });                       // could not reach Paystack yet: the webhook will still credit it
  const st = String(v.json.data?.status);
  if (st !== "success") return NextResponse.json({ status: st === "failed" || st === "abandoned" || st === "reversed" ? "failed" : "pending" });
  try {
    const s = await settle(reference, Number(v.json.data.amount), String(v.json.data.currency), String(v.json.data.channel ?? ""));
    if (s.kind === "ok") return NextResponse.json({ status: "success", already: s.already, points: s.points, balance: s.balance });
    console.error("verify: payment problem", reference, s.kind);
    return NextResponse.json({ status: "error", message: "We couldn’t match this payment. Please contact support with your reference." }, { status: 409 });
  } catch (e) {
    console.error("verify: credit failed", e);
    return NextResponse.json({ status: "pending" }); // the webhook will retry
  }
}

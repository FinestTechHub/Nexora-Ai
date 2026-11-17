import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { paystackKey, settle } from "@/lib/payments/paystack";

export const runtime = "nodejs";

// Paystack calls this after every payment. Set it in Paystack: Settings > API Keys & Webhooks > Webhook URL.
export async function POST(req: Request) {
  const secret = paystackKey();
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 });
  const raw = await req.text(); // the signature is made from the exact raw text
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  const got = req.headers.get("x-paystack-signature") ?? "";
  if (got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return NextResponse.json({ ok: false }, { status: 401 });

  let event: { event?: string; data?: { reference?: string; amount?: number; currency?: string; status?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (event.event !== "charge.success" || !event.data?.reference || event.data.status !== "success") return NextResponse.json({ ok: true, ignored: true });

  try {
    const s = await settle(event.data.reference, Number(event.data.amount), String(event.data.currency));
    if (s.kind !== "ok") console.error("webhook: not credited", event.data.reference, s.kind); // unknown or mismatching payments are logged, never credited
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook: credit failed", e);
    return NextResponse.json({ ok: false }, { status: 500 }); // Paystack will try again
  }
}

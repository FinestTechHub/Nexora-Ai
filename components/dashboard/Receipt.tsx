"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, HelpCircle, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePoints } from "@/lib/points/PointsContext";
import { channelLabel, formatCharge, itemLabel, txStatus } from "@/lib/payments/catalog";

type Tx = { reference: string; item_id: string; description: string | null; currency: string; amount_minor: number; points: number; points_credited: number; status: string; channel: string | null; created_at: string; paid_at: string | null };
const BADGE = { paid: "bg-green-500/15 text-green-400", pending: "bg-amber-500/15 text-amber-400", failed: "bg-red-500/15 text-red-400" };
const BADGE_TEXT = { paid: "Paid", pending: "Pending", failed: "Failed" };

export default function Receipt({ reference }: { reference: string }) {
  const { profile } = usePoints();
  const [tx, setTx] = useState<Tx | null | undefined>(undefined);
  const [msg, setMsg] = useState("");
  useEffect(() => { // RLS means only this person's own payment can be read
    createClient().from("payment_transactions").select("reference, item_id, description, currency, amount_minor, points, points_credited, status, channel, created_at, paid_at").eq("reference", reference).maybeSingle()
      .then(({ data }) => setTx((data as Tx) ?? null));
  }, [reference]);

  if (tx === undefined) return <p className="text-muted">Loading…</p>;
  if (tx === null) return <div className="mx-auto max-w-md rounded-3xl border border-line p-6 text-center"><h1 className="font-semibold">Receipt not found</h1><p className="mt-1 text-sm text-muted">We couldn’t find that payment on your account.</p><Link href="/dashboard/pricing" className="btn btn-p mt-4 !py-2 text-sm">Back to payments</Link></div>;

  const st = txStatus(tx);
  const when = new Date(tx.paid_at ?? tx.created_at).toLocaleString(undefined, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const amount = formatCharge(tx.currency, tx.amount_minor);
  const points = st === "paid" ? tx.points_credited : tx.points;
  const rows: [string, string][] = [
    ["Transaction reference", tx.reference], ["Item / Plan", itemLabel(tx.item_id)], ["Payment channel", channelLabel(tx.channel)],
    ["Date & time", when], ["Customer email", profile?.email ?? "—"],
  ];
  async function share() {
    const text = `Nexora AI (FinestTech) - Official receipt\nStatus: ${BADGE_TEXT[st]}\nAmount: ${amount}\nPoints: +${points.toLocaleString("en-US")}\nItem: ${itemLabel(tx!.item_id)}\nReference: ${tx!.reference}\nDate: ${when}`;
    try {
      if (navigator.share) await navigator.share({ title: "Nexora AI receipt", text });
      else window.print(); // no share sheet here: open the print / save-as-PDF view
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setMsg("Couldn’t share. Try the print view instead."); }
  }
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const helpHref = support ? `mailto:${support}?subject=${encodeURIComponent("Payment help")}&body=${encodeURIComponent(`Hi, I need help with my payment.\nReference: ${tx.reference}`)}` : `/dashboard/help?payment=${encodeURIComponent(tx.reference)}`;

  return (
    <div className="mx-auto max-w-md">
      <Link href="/dashboard/pricing" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand print:hidden"><ArrowLeft size={16} />Payment history</Link>
      <div className="rounded-3xl border border-line bg-card p-6 print:border-black print:bg-white print:text-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5"><Image src="/logo.png" alt="" width={34} height={28} /><div className="leading-tight"><b className="block">Nexora AI</b><span className="text-xs text-muted">FinestTech</span></div></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[st]}`}>{BADGE_TEXT[st]}</span>
        </div>
        <div className="my-7 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">Amount paid</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight">{amount}</p>
          <p className={`mt-3 text-lg font-semibold ${st === "paid" ? "text-green-400" : "text-muted"}`}>+{points.toLocaleString("en-US")} points{st === "paid" ? " credited" : ""}</p>
        </div>
        <div className="space-y-3 border-t border-dashed border-line pt-5 text-sm">
          {rows.map(([k, v]) => <div key={k} className="flex items-start justify-between gap-4"><span className="shrink-0 text-muted">{k}</span><span className="break-all text-right font-medium">{v}</span></div>)}
        </div>
        <p className="mt-6 text-center text-[11px] text-muted">Official receipt · Payments processed by Paystack</p>
      </div>
      <div className="mt-4 space-y-2 print:hidden">
        <button type="button" onClick={share} className="btn btn-p w-full"><Share2 size={17} />Share / Save receipt</button>
        {support ? <a href={helpHref} className="btn btn-g w-full"><HelpCircle size={17} />Need help with this payment?</a> : <Link href={helpHref} className="btn btn-g w-full"><HelpCircle size={17} />Need help with this payment?</Link>}
        {msg && <p role="status" className="text-center text-xs text-red-400">{msg}</p>}
      </div>
    </div>
  );
}

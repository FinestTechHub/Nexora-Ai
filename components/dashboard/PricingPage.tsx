"use client";
import { useEffect, useState } from "react";
import { Check, Coins, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePoints } from "@/lib/points/PointsContext";
import { ITEMS, SYMBOL, detectRegion, money, regionFromTimezone, type Region } from "@/lib/payments/catalog";
import { ToolHeader } from "./tool-ui";

type Log = { id: string; kind: string; amount: number; description: string | null; tool: string | null; created_at: string };
type Notice = { tone: "ok" | "wait" | "bad"; text: string };
const UPGRADE = ["Upgraded uploads: 4 MB files, 25 MB per day", "Chat images never expire"];
const FEATURES: Record<string, string[]> = { creator: ["Core AI tools", "Faster generation speeds", ...UPGRADE], pro: ["All tools unlocked", "Priority processing", ...UPGRADE] };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PricingPage({ ipCountry }: { ipCountry?: string | null }) {
  const { profile, loading, refresh } = usePoints();
  const [region, setRegion] = useState<Region>(detectRegion(ipCountry));
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  // Currency: the visitor's country when Vercel provides it, otherwise the browser's time zone. No manual switch.
  useEffect(() => { if (!ipCountry) setRegion(regionFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)); }, [ipCountry]);

  // Back from Paystack (?reference=...): confirm the payment, update the balance and the activity list.
  useEffect(() => {
    const q = new URLSearchParams(location.search), ref = q.get("reference") ?? q.get("trxref");
    if (!ref) return;
    history.replaceState(history.state, "", "/dashboard/pricing");
    setNotice({ tone: "wait", text: "Confirming your payment…" });
    (async () => {
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(ref)}`).catch(() => null);
        const d = res ? await res.json().catch(() => ({})) : {};
        if (d.status === "success") { setNotice({ tone: "ok", text: d.already ? "This payment was already added to your balance." : `Payment successful. ${Number(d.points).toLocaleString("en-US")} points were added to your balance.` }); await refresh(); return; }
        if (d.status === "failed") { setNotice({ tone: "bad", text: "The payment wasn’t completed, so nothing was charged." }); return; }
        if (d.status === "error" || d.status === "unknown") { setNotice({ tone: "bad", text: d.message ?? "We couldn’t find that payment." }); return; }
        await sleep(2500);
      }
      setNotice({ tone: "wait", text: "We haven’t received confirmation yet. Your points are added automatically as soon as Paystack confirms the payment." });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile) { setLogs(loading ? null : []); return; }
    createClient().from("usage_logs").select("id, kind, amount, description, tool, created_at").order("created_at", { ascending: false }).limit(8)
      .then(({ data: d }) => setLogs((d as Log[]) ?? []));
  }, [profile?.id, profile?.points, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function buy(itemId: string) {
    setErr(""); setBusy(itemId);
    try {
      const res = await fetch("/api/payments/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, countryCode: region }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.authorization_url) { setErr(d.message ?? "Couldn’t start the payment. Please try again."); setBusy(""); return; }
      window.location.href = d.authorization_url; // Paystack's secure payment page
    } catch { setErr("Couldn’t reach the server. Please try again."); setBusy(""); }
  }

  const plans = ITEMS.filter((i) => i.kind === "plan"), packs = ITEMS.filter((i) => i.kind === "topup");
  const tone = { ok: "border-green-500/40 bg-green-500/10 text-green-400", wait: "border-brand/40 bg-soft text-muted", bad: "border-red-500/40 bg-red-500/10 text-red-400" };
  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={CreditCard} title="Pricing & Points" desc="Plans, point top-ups and your activity." />
      {notice && <p role="status" className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${tone[notice.tone]}`}>{notice.text}</p>}
      <div className="card mb-8 hover:!translate-y-0"><p className="text-sm text-muted">Your balance</p><p className="text-4xl font-extrabold">{profile ? profile.points.toLocaleString() : "—"} <span className="text-base font-medium text-muted">points</span></p></div>

      <h2 className="mb-4 text-xl font-bold">Plans</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="card flex flex-col hover:!translate-y-0">
          <h3 className="text-lg font-bold">Free</h3>
          <p className="my-1.5 text-4xl font-extrabold">{SYMBOL[region]}0</p>
          <p className="mb-3 text-sm text-muted">100 points signup bonus</p>
          <ul className="mb-5 flex-1 list-disc space-y-1 pl-5 text-sm text-muted"><li>Core AI tools</li></ul>
          <button type="button" disabled className="btn btn-g w-full opacity-70">Included</button>
        </article>
        {plans.map((p) => (
          <article key={p.id} className={`card flex flex-col hover:!translate-y-0 ${p.id === "creator" ? "!border-brand" : ""}`}>
            {p.id === "creator" && <span className="mb-2 w-fit rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold tracking-wider text-white">MOST POPULAR</span>}
            <h3 className="text-lg font-bold">{p.name}</h3>
            <p className="my-1.5 text-4xl font-extrabold">{money(region, p.display[region])}</p>
            <p className="mb-3 text-sm text-muted">{p.points.toLocaleString("en-US")} points</p>
            <ul className="mb-5 flex-1 list-disc space-y-1 pl-5 text-sm text-muted">{FEATURES[p.id].map((x) => <li key={x}>{x}</li>)}</ul>
            <button type="button" onClick={() => buy(p.id)} disabled={Boolean(busy)} className={`btn w-full disabled:opacity-60 ${p.id === "creator" ? "btn-p" : "btn-g"}`}>{busy === p.id ? "Opening Paystack…" : `Get ${p.name}`}</button>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Plans are paid once for that month’s points. Auto-renewal isn’t available yet.</p>

      <h2 className="mb-4 mt-10 text-xl font-bold">Top-up packs <span className="text-sm font-normal text-muted">(one-time)</span></h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packs.map((k) => (
          <div key={k.id} className="card flex items-center justify-between hover:!translate-y-0">
            <span className="flex items-center gap-2 font-bold"><Coins size={18} className="text-brand" />{k.points.toLocaleString("en-US")} pts</span>
            <button type="button" onClick={() => buy(k.id)} disabled={Boolean(busy)} className="btn btn-g !px-4 !py-2 text-sm disabled:opacity-60">{busy === k.id ? "…" : money(region, k.display[region])}</button>
          </div>
        ))}
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-red-400">{err}</p>}
      <div className="mt-4 space-y-1 text-xs text-muted">
        <p className="flex items-center gap-2"><Check size={13} className="text-green-500" />Secure payments by Paystack. Paid plans and top-ups unlock Upgraded status.</p>
        {region === "NG" && <p>Payments are charged in Nigerian Naira (₦).</p>}
        {(region === "GB" || region === "EU") && <p>International cards are processed securely in USD equivalent via Paystack.</p>}
      </div>

      <h2 className="mb-4 mt-10 text-xl font-bold">Recent activity</h2>
      {logs === null ? <p className="text-muted">Loading…</p> : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No activity yet. When you run a tool, it shows up here.</div>
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-line bg-card">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="min-w-0"><span className="block truncate">{l.description || l.kind}</span><span className="text-xs text-muted">{new Date(l.created_at).toLocaleString()}</span></span>
              <b className={l.amount < 0 ? "text-red-400" : "text-green-500"}>{l.amount > 0 ? "+" : ""}{l.amount} pts</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

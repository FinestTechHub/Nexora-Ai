"use client";
import { useEffect, useState } from "react";
import { Coins, CreditCard } from "lucide-react";
import data from "@/lib/account.json";
import { createClient } from "@/lib/supabase/client";
import { usePoints } from "@/lib/points/PointsContext";
import { ToolHeader } from "./tool-ui";

type Log = { id: string; kind: string; amount: number; description: string | null; tool: string | null; created_at: string };

export default function PricingPage() {
  const { profile, loading } = usePoints();
  const [logs, setLogs] = useState<Log[] | null>(null);
  useEffect(() => {
    if (!profile) { setLogs(loading ? null : []); return; }
    createClient().from("usage_logs").select("id, kind, amount, description, tool, created_at").order("created_at", { ascending: false }).limit(8)
      .then(({ data: d }) => setLogs((d as Log[]) ?? []));
  }, [profile?.id, profile?.points, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={CreditCard} title="Pricing & Points" desc="Plans, point top-ups and your activity." />
      <div className="card mb-8 hover:!translate-y-0"><p className="text-sm text-muted">Your balance</p><p className="text-4xl font-extrabold">{profile ? profile.points.toLocaleString() : "—"} <span className="text-base font-medium text-muted">points</span></p></div>

      <h2 className="mb-4 text-xl font-bold">Plans</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {data.plans.map((p) => (
          <article key={p.name} className={`card flex flex-col hover:!translate-y-0 ${p.pop ? "!border-brand" : ""}`}>
            {p.pop && <span className="mb-2 w-fit rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold tracking-wider text-white">MOST POPULAR</span>}
            <h3 className="text-lg font-bold">{p.name}</h3>
            <p className="my-1.5 text-4xl font-extrabold">${p.price}<span className="text-sm font-medium text-muted">/mo</span></p>
            <p className="mb-3 text-sm text-muted">{p.points}</p>
            <ul className="mb-5 flex-1 list-disc space-y-1 pl-5 text-sm text-muted">{p.features.map((x) => <li key={x}>{x}</li>)}</ul>
            <button type="button" disabled className={`btn w-full opacity-70 ${p.pop ? "btn-p" : "btn-g"}`}>{p.price === "0" ? "Included" : "Coming soon"}</button>
          </article>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-xl font-bold">Top-up packs <span className="text-sm font-normal text-muted">(one-time)</span></h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.packs.map((k) => (
          <div key={k.points} className="card flex items-center justify-between hover:!translate-y-0">
            <span className="flex items-center gap-2 font-bold"><Coins size={18} className="text-brand" />{k.points.toLocaleString()} pts</span>
            <button type="button" disabled className="btn btn-g !px-4 !py-2 text-sm opacity-70">${k.price}</button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Online payments open soon. Plans and packs become available once payments are connected.</p>

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

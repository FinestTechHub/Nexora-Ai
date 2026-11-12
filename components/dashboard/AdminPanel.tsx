"use client";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePoints } from "@/lib/points/PointsContext";
import { Choice, ToolHeader } from "./tool-ui";

type Row = { created_at: string; email: string; kind: string; amount: number; balance_after: number; description: string | null; tool: string | null };
type Stats = { users: number; points_used: number; points_in_balances: number };
const KINDS = ["Credit", "Refund", "Adjust"] as const;
const friendly = (m: string) => m.includes("user_not_found") ? "No user with that email." : m.includes("not_authorized") ? "You don’t have permission." : m.includes("check constraint") ? "That would take the balance below zero." : m;

export default function AdminPanel() {
  const { profile, loading } = usePoints();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("Credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = createClient();
    const [s, r] = await Promise.all([sb.rpc("admin_stats"), sb.rpc("admin_recent_usage", { p_limit: 25 })]);
    if (!s.error) setStats(s.data as Stats);
    if (!r.error) setRows((r.data as Row[]) ?? []);
  }, []);
  useEffect(() => { if (profile?.role === "admin") load(); }, [profile?.role, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(amount, 10);
    if (!email.trim() || !Number.isInteger(n) || n === 0) { setMsg({ t: "Enter an email and a whole number of points." }); return; }
    if (kind !== "Adjust" && n < 0) { setMsg({ t: "Credit and Refund need a positive number. Use Adjust to deduct." }); return; }
    setBusy(true); setMsg({ t: "" });
    const { data, error } = await createClient().rpc("admin_adjust_points", { p_email: email.trim(), p_delta: n, p_kind: kind.toLowerCase(), p_reason: reason.trim() || null });
    setBusy(false);
    if (error) { setMsg({ t: friendly(error.message) }); return; }
    setMsg({ t: `Done. ${(data as { email: string }).email} now has ${(data as { balance: number }).balance} points.`, ok: true });
    setAmount(""); setReason(""); load();
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (profile?.role !== "admin") return <div className="mx-auto max-w-md rounded-3xl border border-line p-6 text-center"><ShieldCheck className="mx-auto mb-2 text-brand" /><h1 className="font-semibold">Owner access only</h1><p className="mt-1 text-sm text-muted">This page is only available to the owner account.</p></div>;
  return (
    <div className="mx-auto max-w-4xl">
      <ToolHeader Icon={ShieldCheck} title="Admin" desc="Users, point usage and manual point controls." />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[["Users", stats?.users], ["Points used", stats?.points_used], ["In balances", stats?.points_in_balances]].map(([l, v]) => <div key={l as string} className="card !p-4 hover:!translate-y-0"><p className="text-xs text-muted">{l}</p><p className="text-2xl font-extrabold">{v === undefined || v === null ? "—" : Number(v).toLocaleString()}</p></div>)}
      </div>
      <form onSubmit={submit} className="card mb-6 space-y-4 hover:!translate-y-0">
        <h2 className="text-lg font-bold">Credit, adjust or refund points</h2>
        <div><label htmlFor="ae" className="mb-1.5 block text-sm font-semibold">User email</label><input id="ae" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="field" /></div>
        <Choice label="Action" options={KINDS} value={kind} onChange={setKind} />
        <div className="grid grid-cols-2 gap-3"><div><label htmlFor="aa" className="mb-1.5 block text-sm font-semibold">Points</label><input id="aa" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={kind === "Adjust" ? "e.g. -50 or 50" : "e.g. 100"} className="field" /></div><div><label htmlFor="ar" className="mb-1.5 block text-sm font-semibold">Reason</label><input id="ar" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" className="field" /></div></div>
        <button type="submit" disabled={busy} className="btn btn-p w-full disabled:opacity-60">{busy ? "Working…" : `${kind} points`}</button>
        <p role="status" className={`min-h-[1.25rem] text-sm ${msg.ok ? "text-green-500" : "text-red-400"}`}>{msg.t}</p>
      </form>
      <h2 className="mb-3 text-lg font-bold">Recent usage</h2>
      {rows.length === 0 ? <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No activity yet.</div> : (
        <div className="divide-y divide-line rounded-2xl border border-line bg-card">
          {rows.map((r, i) => <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="min-w-0"><span className="block truncate">{r.email} · {r.description || r.kind}</span><span className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</span></span><b className={r.amount < 0 ? "text-red-400" : "text-green-500"}>{r.amount > 0 ? "+" : ""}{r.amount}</b></div>)}
        </div>
      )}
    </div>
  );
}

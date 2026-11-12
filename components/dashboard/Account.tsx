"use client";
import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import data from "@/lib/account.json";
import { ToolHeader } from "./tool-ui";

export function Help() {
  const [q, setQ] = useState(""), [note, setNote] = useState("");
  const faq = data.faq.filter((f) => (f.q + f.a).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-3xl">
      <ToolHeader Icon={LifeBuoy} title="Help & Support" desc="Answers to common questions." />
      <label htmlFor="hs" className="sr-only">Search help</label><input id="hs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help…" className="field mb-4" />
      <div className="space-y-2.5">{faq.length ? faq.map((f) => <details key={f.q} className="rounded-2xl border border-line bg-card px-5 py-3"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-muted">{f.a}</p></details>) : <p className="text-muted">No answers found.</p>}</div>
      <section className="card mt-8 space-y-4 hover:!translate-y-0"><h2 className="text-xl font-bold">Contact support</h2>
        <div><label htmlFor="cm" className="mb-1.5 block text-sm font-semibold">Message</label><textarea id="cm" rows={4} placeholder="How can we help?" className="field resize-none" /></div>
        <button type="button" onClick={() => setNote("Messages can’t be sent from here yet. Support chat is coming soon.")} className="btn btn-p">Send message</button>
        <p role="status" className="min-h-[1.25rem] text-sm text-muted">{note}</p></section>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { createClient, isConfigured } from "@/lib/supabase/client";
import { Choice, GRADS, ToolHeader } from "./tool-ui";

type Gen = { id: string; tool: string; model: string | null; prompt: string | null; result: { url?: string; text?: string } | null; status: string; points_charged: number; created_at: string };
const FILTERS = ["All", "Image", "Video", "Voice", "Text"] as const;
const group = (t: string) => (t === "image" || t === "thumbnails" ? "Image" : t === "video" || t === "image-to-video" ? "Video" : t === "voice" ? "Voice" : "Text");

export default function Library() {
  const [items, setItems] = useState<Gen[] | null>(null);
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  useEffect(() => {
    if (!isConfigured) { setItems([]); return; }
    createClient().from("generations").select("id, tool, model, prompt, result, status, points_charged, created_at").neq("status", "failed").order("created_at", { ascending: false }).limit(60)
      .then(({ data }) => setItems(((data as Gen[]) ?? []).filter((g) => g.status !== "failed")));
  }, []);
  const shown = (items ?? []).filter((g) => f === "All" || group(g.tool) === f);
  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={FolderOpen} title="My Creations" desc="Everything you generate is saved here automatically." />
      {items === null ? <p className="text-muted">Loading…</p> : items.length === 0 ? (
        <div className="grid min-h-[40dvh] place-items-center rounded-3xl border border-dashed border-line text-center">
          <div><div className="icon-box mx-auto"><FolderOpen size={22} /></div><h2 className="font-semibold">No creations yet</h2><p className="mt-1 max-w-xs text-sm text-muted">Results you generate will appear here, even if you close the app while they finish.</p><Link href="/dashboard/tools" className="btn btn-p mt-5 !py-2.5 text-sm">Start creating</Link></div>
        </div>
      ) : (
        <>
          <div className="mb-5"><Choice label="Type" options={FILTERS} value={f} onChange={setF} /></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((g, i) => (
              <article key={g.id} className="overflow-hidden rounded-2xl border border-line bg-card">
                <div className={`relative h-32 bg-gradient-to-br ${GRADS[i % GRADS.length]}`}>
                  {g.result?.url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(g.result.url) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={g.result.url} alt="" className="h-full w-full object-cover" />}
                  {g.status === "unpaid" && <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">UNPAID</span>}
                </div>
                <div className="p-4"><h3 className="line-clamp-2 text-sm font-semibold">{g.prompt || g.result?.text?.slice(0, 80) || "Untitled"}</h3><p className="mt-1 text-xs text-muted">{group(g.tool)} · {new Date(g.created_at).toLocaleDateString()} · {g.points_charged} pts</p></div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

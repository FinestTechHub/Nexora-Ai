"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, FolderOpen, MessageSquare, X } from "lucide-react";
import { Markdown, stripMarkdown } from "@/components/chat/Markdown";
import { createClient, isConfigured } from "@/lib/supabase/client";
import { Choice, GRADS, ToolHeader } from "./tool-ui";

type Res = { kind?: string; text?: string; items?: string[]; titles?: string[]; description?: string; tags?: string[]; url?: string };
type Gen = { id: string; tool: string; model: string | null; prompt: string | null; result: Res | null; status: string; points_charged: number; created_at: string };
const FILTERS = ["All", "Image", "Video", "Voice", "Text"] as const;
const group = (t: string) => (t === "image" || t === "thumbnails" ? "Image" : t === "video" || t === "image-to-video" ? "Video" : t === "voice" ? "Voice" : "Text");
const NAMES: Record<string, string> = { chat: "Chat", script: "Script Writer", ideas: "Content Ideas", "youtube-seo": "YouTube SEO" };

// Saved results as Markdown text (lists use real numbered-list syntax so they render nicely).
function asMarkdown(r: Res | null) {
  if (!r) return "";
  if (r.kind === "list") return (r.items ?? []).map((x, i) => `${i + 1}. ${x}`).join("\n");
  if (r.kind === "seo") return `**Titles**\n${(r.titles ?? []).map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n**Description**\n${r.description ?? ""}\n\n**Tags:** ${(r.tags ?? []).join(", ")}`;
  return r.text ?? "";
}

export default function Library() {
  const [items, setItems] = useState<Gen[] | null>(null);
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<Gen | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!isConfigured) { setItems([]); return; }
    createClient().from("generations").select("id, tool, model, prompt, result, status, points_charged, created_at").neq("status", "failed").order("created_at", { ascending: false }).limit(60)
      .then(({ data }) => setItems(((data as Gen[]) ?? []).filter((g) => g.status !== "failed")));
  }, []);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);
  const shown = (items ?? []).filter((g) => f === "All" || group(g.tool) === f);
  async function copy(g: Gen) { try { await navigator.clipboard.writeText(stripMarkdown(asMarkdown(g.result))); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }

  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={FolderOpen} title="My Creations" desc="Everything you generate is saved here automatically. Tap one to open it." />
      {items === null ? <p className="text-muted">Loading…</p> : items.length === 0 ? (
        <div className="grid min-h-[40dvh] place-items-center rounded-3xl border border-dashed border-line text-center">
          <div><div className="icon-box mx-auto"><FolderOpen size={22} /></div><h2 className="font-semibold">No creations yet</h2><p className="mt-1 max-w-xs text-sm text-muted">Results you generate will appear here, even if you close the app while they finish.</p><Link href="/dashboard/tools" className="btn btn-p mt-5 !py-2.5 text-sm">Start creating</Link></div>
        </div>
      ) : (
        <>
          <div className="mb-5"><Choice label="Type" options={FILTERS} value={f} onChange={setF} /></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((g, i) => (
              <button key={g.id} type="button" onClick={() => setOpen(g)} className="block w-full overflow-hidden rounded-2xl border border-line bg-card text-left transition active:scale-[.98]">
                <div className={`relative h-28 bg-gradient-to-br ${GRADS[i % GRADS.length]}`}>
                  <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white">{NAMES[g.tool] ?? group(g.tool)}</span>
                  {g.status === "unpaid" && <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">UNPAID</span>}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold">{g.prompt || "Untitled"}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{stripMarkdown(asMarkdown(g.result)).replace(/\n+/g, " ")}</p>
                  <p className="mt-2 text-[11px] text-muted">{new Date(g.created_at).toLocaleDateString()} · {g.points_charged} pts</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(null)}>
          <div role="dialog" aria-modal="true" aria-label="Saved result" onClick={(e) => e.stopPropagation()} className="page-in max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-[#111114] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
            <p className="text-xs text-muted">{NAMES[open.tool] ?? open.tool} · {new Date(open.created_at).toLocaleString()}</p>
            <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Prompt</p>
            <p className="whitespace-pre-wrap break-words text-sm">{open.prompt || "—"}</p>
            <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Response</p>
            <div className="rounded-2xl bg-white/5 p-4 text-sm">{asMarkdown(open.result) ? <Markdown text={asMarkdown(open.result)} /> : "No text saved for this result."}</div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(open)} className="btn btn-g !py-2 text-sm">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy"}</button>
              {open.tool === "chat"
                ? <Link href={`/dashboard/chat?g=${open.id}`} className="btn btn-p !py-2 text-sm"><MessageSquare size={15} />Open in Chat</Link>
                : <Link href={`/dashboard/${open.tool}`} className="btn btn-p !py-2 text-sm"><MessageSquare size={15} />Open tool</Link>}
              <button type="button" onClick={() => setOpen(null)} className="btn btn-g !py-2 text-sm"><X size={15} />Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

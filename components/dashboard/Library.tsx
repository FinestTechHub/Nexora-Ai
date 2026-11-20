"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, FolderOpen, MessageSquare, X } from "lucide-react";
import { Markdown, stripMarkdown } from "@/components/chat/Markdown";
import { createClient, isConfigured } from "@/lib/supabase/client";
import { groupSessions, loadCreations, type Creation, type Session } from "@/lib/image/client";
import SessionThread from "./SessionThread";
import { Choice, GRADS, ToolHeader } from "./tool-ui";

type Res = { kind?: string; text?: string; items?: string[]; titles?: string[]; description?: string; tags?: string[]; url?: string };
type Gen = { id: string; tool: string; model: string | null; prompt: string | null; result: Res | null; status: string; points_charged: number; created_at: string };
type Item = { key: string; at: string } & ({ type: "gen"; g: Gen } | { type: "ses"; s: Session });
const FILTERS = ["All", "Images", "Thumbnails", "Chats"] as const;
const NAMES: Record<string, string> = { chat: "Chat", script: "Script Writer", ideas: "Content Ideas", "youtube-seo": "YouTube SEO" };

function asMarkdown(r: Res | null) {
  if (!r) return "";
  if (r.kind === "list") return (r.items ?? []).map((x, i) => `${i + 1}. ${x}`).join("\n");
  if (r.kind === "seo") return `**Titles**\n${(r.titles ?? []).map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n**Description**\n${r.description ?? ""}\n\n**Tags:** ${(r.tags ?? []).join(", ")}`;
  return r.text ?? "";
}

export default function Library() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<Gen | null>(null);
  const [thread, setThread] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!isConfigured) { setItems([]); return; }
    Promise.all([
      createClient().from("generations").select("id, tool, model, prompt, result, status, points_charged, created_at").neq("status", "failed").order("created_at", { ascending: false }).limit(60),
      loadCreations({ limit: 200 }).catch(() => [] as Creation[]),
    ]).then(([g, c]) => {
      const all: Item[] = [
        ...((g.data as Gen[]) ?? []).filter((x) => x.status !== "failed").map((x) => ({ key: `g${x.id}`, at: x.created_at, type: "gen" as const, g: x })),
        ...groupSessions(c).map((s) => ({ key: `s${s.id}`, at: s.at, type: "ses" as const, s })), // image sessions: one card per thread
      ];
      setItems(all.sort((a, b) => b.at.localeCompare(a.at)));
    });
  }, []);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);
  const shown = (items ?? []).filter((i) => f === "All" || (f === "Images" && i.type === "ses" && i.s.tool_type === "image") || (f === "Thumbnails" && i.type === "ses" && i.s.tool_type === "thumbnail") || (f === "Chats" && i.type === "gen" && i.g.tool === "chat"));
  async function copy(g: Gen) { try { await navigator.clipboard.writeText(stripMarkdown(asMarkdown(g.result))); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }
  const cls = "block w-full overflow-hidden rounded-2xl border border-line bg-card text-left transition active:scale-[.98]";

  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={FolderOpen} title="My Creations" desc="Everything you generate is saved here automatically. Tap one to open it." />
      {items === null ? <p className="text-muted">Loading…</p> : items.length === 0 ? (
        <div className="grid min-h-[40dvh] place-items-center rounded-3xl border border-dashed border-line text-center">
          <div><div className="icon-box mx-auto"><FolderOpen size={22} /></div><h2 className="font-semibold">No creations yet</h2><p className="mt-1 max-w-xs text-sm text-muted">Results you generate will appear here, even if you close the app while they finish.</p><Link href="/dashboard/tools" className="btn btn-p mt-5 !py-2.5 text-sm">Start creating</Link></div>
        </div>
      ) : (
        <>
          <div className="mb-5"><Choice label="Show" options={FILTERS} value={f} onChange={setF} /></div>
          {shown.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {shown.map((it, i) => it.type === "ses" ? (
              <button key={it.key} type="button" onClick={() => setThread(it.s)} className={cls}>
                <div className="relative aspect-[4/3] bg-white/5">
                  {it.s.cover ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.s.cover} alt="" className="h-full w-full object-cover" /> : <div className={`h-full bg-gradient-to-br ${GRADS[i % GRADS.length]}`} />}
                  <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">{it.s.tool_type === "thumbnail" ? "Thumbnail" : "Image"}</span>
                  {it.s.count > 1 && <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{it.s.count} images</span>}
                </div>
                <div className="p-3"><h3 className="line-clamp-1 text-sm font-semibold">{it.s.title}</h3><p className="mt-1 text-[11px] text-muted">{new Date(it.s.at).toLocaleDateString()}</p></div>
              </button>
            ) : (
              <button key={it.key} type="button" onClick={() => setOpen(it.g)} className={cls}>
                <div className={`relative h-24 bg-gradient-to-br ${GRADS[i % GRADS.length]}`}>
                  <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white">{NAMES[it.g.tool] ?? it.g.tool}</span>
                  {it.g.status === "unpaid" && <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">UNPAID</span>}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold">{it.g.prompt || "Untitled"}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{stripMarkdown(asMarkdown(it.g.result)).replace(/\n+/g, " ")}</p>
                  <p className="mt-2 text-[11px] text-muted">{new Date(it.g.created_at).toLocaleDateString()} · {it.g.points_charged} pts</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {thread && <SessionThread session={thread} onClose={() => setThread(null)} />}
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

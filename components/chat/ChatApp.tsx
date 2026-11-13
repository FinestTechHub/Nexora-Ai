"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, History, Paperclip, Pencil, Plus, RefreshCw, Share2, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import Dock from "@/components/dashboard/Dock";
import HeaderSlot from "@/components/dashboard/HeaderSlot";
import ModelPicker from "@/components/dashboard/ModelPicker";
import { useAttachment } from "./useAttachment";
import { modelsFor, shortPts } from "@/lib/models";
import { usePoints } from "@/lib/points/PointsContext";
import { kindOf, mimeOf } from "@/lib/uploads/limits";
import { takeHandoff } from "@/lib/chat/handoff";
import { buildChatRequest, sendChatMessage, ChatError, type ChatMessage, type ChatRequest, type Conversation } from "@/lib/chat/api";

const KEY = "nexora-chats-v1";
const SUGGESTED = ["Give me 5 video ideas about budget travel", "Write a 30-second script about morning routines", "Explain what an API is in two sentences"];
const uid = () => Math.random().toString(36).slice(2, 10);
// Error notices and in-flight messages are never saved on the device.
const savable = (cs: Conversation[]) => cs.map((c) => ({ ...c, messages: c.messages.filter((m) => m.role !== "system" && m.status !== "sending") }));

export default function ChatApp() {
  const { points: BALANCE, refresh } = usePoints();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState(false);
  const [input, setInput] = useState("");
  const [renId, setRenId] = useState<string | null>(null);
  const [renVal, setRenVal] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState("");
  const [lastReq, setLastReq] = useState<ChatRequest | null>(null);
  const attach = useAttachment();
  const models = modelsFor("chat")!;
  const [modelId, setModelId] = useState(models[0].id);
  const model = models.find((m) => m.id === modelId) ?? models[0]; // points per message
  const endRef = useRef<HTMLDivElement>(null);
  const files = useRef<Record<string, File>>({}); // attachments live in memory only, so retry can reuse them
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const l: Conversation[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      const clean = l.map((c) => ({ ...c, messages: c.messages.filter((m) => m.role !== "system").map((m) => (m.status === "sending" ? { ...m, status: "failed" as const } : m)) }));
      setConvs(clean); setActiveId(clean[0]?.id ?? null);
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(savable(convs))); } catch { /* ignore */ } }, [convs, ready]);
  const active = convs.find((c) => c.id === activeId) ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length, busy]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { // a message typed on the Home screen arrives here
    if (!ready) return;
    const q = new URLSearchParams(location.search).get("q"), h = takeHandoff();
    if (q || h) { history.replaceState(null, "", "/dashboard/chat"); send(h?.text ?? q ?? "", h?.file ?? null); }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id: string, fn: (c: Conversation) => Conversation) => setConvs((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  async function run(id: string, messages: ChatMessage[], userMsgId: string) {
    setBusy(true);
    const req = buildChatRequest(messages, model.id);
    setLastReq(req);
    try {
      const reply = await sendChatMessage(req, files.current[userMsgId] ?? null); // -> /api/ai/chat
      patch(id, (c) => ({ ...c, updatedAt: Date.now(), messages: [...c.messages.map((m) => (m.id === userMsgId ? { ...m, status: undefined } : m)), { id: uid(), role: "assistant", content: reply, ts: Date.now() }] }));
      refresh(); // update the points in the header right away
    } catch (e) {
      const err = e instanceof ChatError ? e : null;
      if (err?.code === "upload_limit") attach.showLimit(Boolean(err.data?.upgraded));
      patch(id, (c) => ({ ...c, messages: [...c.messages.map((m) => (m.id === userMsgId ? { ...m, status: "failed" as const } : m)), { id: uid(), role: "system", content: e instanceof Error ? e.message : "Something went wrong. You weren’t charged.", ts: Date.now(), retryFor: userMsgId }] }));
    } finally { setBusy(false); }
  }
  function send(raw: string, fileArg?: File | null) {
    if (busy) return;
    const file = fileArg !== undefined ? fileArg : attach.file;
    const t = raw.trim();
    if ((!t && !file) || model.points > BALANCE) return;
    const msg: ChatMessage = { id: uid(), role: "user", content: t || "Please look at the attached file and tell me what it contains.", ts: Date.now(), status: "sending",
      attachment: file ? { name: file.name, size: file.size, kind: kindOf(mimeOf(file.name, file.type)) ?? "document" } : undefined };
    if (file) files.current[msg.id] = file;
    let id = activeId, base: ChatMessage[] = active?.messages.filter((m) => m.role !== "system") ?? [];
    if (!active) { id = uid(); setConvs((cs) => [{ id: id!, title: msg.content.slice(0, 40), updatedAt: Date.now(), messages: [msg] }, ...cs]); setActiveId(id); base = []; }
    else patch(active.id, (c) => ({ ...c, title: c.title === "New chat" ? msg.content.slice(0, 40) : c.title, updatedAt: Date.now(), messages: [...c.messages.filter((m) => m.role !== "system"), msg] }));
    setInput(""); attach.clear();
    run(id!, [...base, msg], msg.id);
  }
  // Retry sends the SAME message again (no duplicate): everything after it, including the error notice, is dropped first.
  function retry(userMsgId: string) {
    if (!active || busy) return;
    const i = active.messages.findIndex((m) => m.id === userMsgId);
    if (i < 0) return;
    const m = active.messages[i];
    if (m.attachment && !files.current[userMsgId]) { setToast("Please attach the file again and resend."); return; }
    if (model.points > BALANCE) { setToast("Not enough points."); return; }
    const base = active.messages.slice(0, i + 1).filter((x) => x.role !== "system").map((x) => (x.id === userMsgId ? { ...x, status: "sending" as const } : x));
    patch(active.id, (c) => ({ ...c, messages: base }));
    run(active.id, base, userMsgId);
  }
  function regenerate() {
    if (!active || busy) return;
    let i = active.messages.length - 1;
    while (i >= 0 && active.messages[i].role !== "user") i--;
    if (i >= 0) retry(active.messages[i].id);
  }
  const lastUserId = [...(active?.messages ?? [])].reverse().find((m) => m.role === "user")?.id;
  const longPress = (id: string) => ({
    onPointerDown: () => { press.current = setTimeout(() => retry(id), 600); },
    onPointerUp: () => { if (press.current) clearTimeout(press.current); },
    onPointerLeave: () => { if (press.current) clearTimeout(press.current); },
    onPointerCancel: () => { if (press.current) clearTimeout(press.current); },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  function newChat() {
    setHist(false);
    if (active && active.messages.length === 0) return;
    const c: Conversation = { id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] };
    setConvs((cs) => [c, ...cs]); setActiveId(c.id); setInput("");
  }
  function remove(id: string) { const rest = convs.filter((c) => c.id !== id); setConvs(rest); setDelId(null); if (id === activeId) setActiveId(rest[0]?.id ?? null); }
  function saveRename() { if (renId && renVal.trim()) patch(renId, (c) => ({ ...c, title: renVal.trim().slice(0, 60) })); setRenId(null); }
  async function copy(m: ChatMessage) { try { await navigator.clipboard.writeText(m.content); setCopied(m.id); setTimeout(() => setCopied(""), 1500); } catch { /* ignore */ } }
  async function share(m: ChatMessage) {
    try {
      if (navigator.share) await navigator.share({ text: m.content });
      else { await navigator.clipboard.writeText(m.content); setToast("Copied, ready to share"); }
    } catch { /* the person closed the share sheet */ }
  }
  const rate = (id: string, f: "up" | "down") => active && patch(active.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, feedback: m.feedback === f ? undefined : f } : m)) }));

  const msgs = active?.messages ?? [];
  const lastId = msgs[msgs.length - 1]?.id;
  const sorted = [...convs].sort((a, b) => b.updatedAt - a.updatedAt);
  const act = "flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/10 hover:text-brand";

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <HeaderSlot><ModelPicker compact models={models} value={model.id} onChange={setModelId} /></HeaderSlot>
      <div className="absolute right-3 top-1 z-10 flex gap-1">
        <button type="button" aria-label="Conversations" onClick={() => setHist(true)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-ink"><History size={18} /></button>
        <button type="button" aria-label="New chat" onClick={newChat} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-ink"><Plus size={18} /></button>
      </div>

      <div role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-10">
        {msgs.length === 0 && !busy ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center pb-10 text-center">
            <div className="relative mb-6"><div className="absolute inset-0 -z-10 scale-[2.2] rounded-full bg-brand/40 blur-3xl" /><Image src="/logo.png" alt="Nexora AI" width={76} height={62} priority /></div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What should we focus on?</h1>
            <div className="mt-6 flex flex-wrap justify-center gap-2">{SUGGESTED.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-zinc-400 transition hover:border-white/25 hover:text-zinc-200">{s}</button>)}</div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {msgs.map((m) => m.role === "user" ? (
              <div key={m.id} className="flex flex-col items-end">
                <div {...(m.status === "failed" && m.id === lastUserId ? longPress(m.id) : {})} className={`max-w-[88%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg px-4 py-2.5 text-white ${m.status === "failed" ? "bg-brand/60 ring-1 ring-red-400/60" : "bg-brand"}`}>
                  {m.attachment && <span className="mb-1 flex items-center gap-1 text-xs text-white/80"><Paperclip size={12} />{m.attachment.name}</span>}{m.content}
                </div>
                {m.status === "sending" && <p className="mt-1 text-[11px] text-muted">Sending…</p>}
                {m.status === "failed" && <p className="mt-1 text-[11px] text-red-400">Failed{m.id === lastUserId && <> · <button type="button" onClick={() => retry(m.id)} className="underline">Retry</button> <span className="text-muted">(or press and hold)</span></>}</p>}
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5"><Image src="/logo.png" alt="" width={22} height={18} /></div>
                <div className="min-w-0 max-w-[88%]">
                  <div className={`whitespace-pre-wrap break-words rounded-3xl rounded-tl-lg px-4 py-2.5 ${m.role === "system" ? "border border-dashed border-red-400/40 text-muted" : "bg-white/5"}`}>
                    {m.role === "system" && <b className="mb-1 block text-xs uppercase tracking-wider text-red-400">Couldn’t send</b>}{m.content}
                  </div>
                  {m.role === "system" ? (
                    m.retryFor === lastUserId && !busy && <div className="mt-2"><button type="button" onClick={() => retry(m.retryFor!)} className="btn btn-p !px-4 !py-1.5 text-sm"><RefreshCw size={14} />Retry</button></div>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-0.5 text-xs text-muted">
                      <button type="button" onClick={() => copy(m)} className={act}>{copied === m.id ? <Check size={13} /> : <Copy size={13} />}{copied === m.id ? "Copied" : "Copy"}</button>
                      {m.id === lastId && !busy && <button type="button" onClick={regenerate} className={act}><RefreshCw size={13} />Regenerate</button>}
                      <button type="button" onClick={() => share(m)} className={act}><Share2 size={13} />Share</button>
                      <button type="button" aria-label="Good response" aria-pressed={m.feedback === "up"} onClick={() => rate(m.id, "up")} className={`${act} ${m.feedback === "up" ? "text-brand" : ""}`}><ThumbsUp size={13} fill={m.feedback === "up" ? "currentColor" : "none"} /></button>
                      <button type="button" aria-label="Bad response" aria-pressed={m.feedback === "down"} onClick={() => rate(m.id, "down")} className={`${act} ${m.feedback === "down" ? "text-red-400" : ""}`}><ThumbsDown size={13} fill={m.feedback === "down" ? "currentColor" : "none"} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-3" role="status" aria-label="Thinking">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5"><Image src="/logo.png" alt="" width={22} height={18} /></div>
                <div className="flex items-center gap-2.5 rounded-3xl rounded-tl-lg bg-white/5 px-4 py-3"><span className="text-sm text-muted">Thinking…</span><span className="flex gap-1.5">{[0, 150, 300].map((d) => <i key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />)}</span></div>
              </div>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {toast && <p role="status" className="px-6 pb-2 text-center text-xs text-zinc-300">{toast}</p>}
      <Dock value={input} onChange={setInput} onSend={() => send(input)} placeholder="Ask Nexora…" cost={shortPts(model.points)} low={model.points > BALANCE} disabled={busy} canSendEmpty={Boolean(attach.file)} onPlus={attach.openSheet} above={attach.chip} />
      {attach.ui}

      {hist && <div className="absolute inset-0 z-20 bg-black/60" onClick={() => setHist(false)} />}
      <aside aria-label="Conversations" className={`absolute inset-y-0 right-0 z-30 flex w-72 max-w-[85%] flex-col border-l border-line bg-[#0d0d10] transition-transform ${hist ? "" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-3"><b className="px-1">Conversations</b><button className="p-1.5" aria-label="Close conversations" onClick={() => setHist(false)}><X size={18} /></button></div>
        <div className="px-3 pb-2"><button type="button" onClick={newChat} className="btn btn-p w-full !py-2.5 text-sm"><Plus size={16} />New chat</button></div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {sorted.length === 0 && <p className="px-3 py-4 text-sm text-muted">No conversations yet.</p>}
          {sorted.map((c) => renId === c.id ? (
            <input key={c.id} autoFocus value={renVal} aria-label="Rename conversation" onChange={(e) => setRenVal(e.target.value)} onBlur={saveRename} onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenId(null); }} className="field !py-2 text-sm" />
          ) : delId === c.id ? (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">Delete this chat?<span className="flex gap-3 font-semibold"><button type="button" onClick={() => remove(c.id)} className="text-red-400">Yes</button><button type="button" onClick={() => setDelId(null)} className="text-muted">No</button></span></div>
          ) : (
            <div key={c.id} className={`flex items-center rounded-xl pr-1 ${c.id === activeId ? "bg-white/10" : "hover:bg-white/5"}`}>
              <button type="button" onClick={() => { setActiveId(c.id); setHist(false); }} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-medium">{c.title}</button>
              <button type="button" aria-label={`Rename ${c.title}`} onClick={() => { setRenId(c.id); setRenVal(c.title); }} className="p-1.5 text-muted hover:text-brand"><Pencil size={14} /></button>
              <button type="button" aria-label={`Delete ${c.title}`} onClick={() => setDelId(c.id)} className="p-1.5 text-muted hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <details className="border-t border-line p-3 text-xs text-muted">
          <summary className="cursor-pointer">AI connection (developer)</summary>
          <p className="mt-2">Messages go to <code>/api/ai/chat</code> with the full conversation so follow-ups keep their context. Chats are also saved on this device; every answer is saved to your Library. Attached files are never stored.</p>
          {lastReq && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/5 p-2">{JSON.stringify(lastReq, null, 2)}</pre>}
        </details>
      </aside>
    </div>
  );
}

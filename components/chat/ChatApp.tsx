"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, History, Pencil, Plus, RefreshCw, Share2, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import Dock from "@/components/dashboard/Dock";
import HeaderSlot from "@/components/dashboard/HeaderSlot";
import ModelPicker from "@/components/dashboard/ModelPicker";
import { useAttachment } from "./useAttachment";
import AttachmentThumb from "./AttachmentThumb";
import { Markdown, stripMarkdown } from "./Markdown";
import { modelsFor, shortPts } from "@/lib/models";
import { usePoints } from "@/lib/points/PointsContext";
import { createClient, isConfigured } from "@/lib/supabase/client";
import { kindOf, mimeOf } from "@/lib/uploads/limits";
import { purgeExpired, saveChatImage } from "@/lib/chat/attachments";
import { takeHandoff } from "@/lib/chat/handoff";
import { buildChatRequest, sendChatMessage, ChatError, type ChatMessage, type ChatRequest, type Conversation } from "@/lib/chat/api";

const KEY = "nexora-chats-v1";
const SESSION_KEY = "nexora-chat-session"; // which chat is open right now (forgotten when the app is closed)
const IDLE_MS = 30 * 60 * 1000; // away longer than this = a brand-new chat
const SUGGESTED = ["Give me 5 video ideas about budget travel", "Write a 30-second script about morning routines", "Explain what an API is in two sentences"];
const NOTICE_12 = "You’ve used your 12 free daily messages on Nexora 1.0. Continuing will use 1 pt per message, or you can switch models anytime.";
const uid = () => Math.random().toString(36).slice(2, 10);
// Error notices and in-flight messages are never saved on the device.
const savable = (cs: Conversation[]) => cs.map((c) => ({ ...c, messages: c.messages.filter((m) => m.role !== "system" && m.status !== "sending") }));

export default function ChatApp() {
  const { points: BALANCE, refresh, profile } = usePoints();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hist, setHist] = useState(false);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [renId, setRenId] = useState<string | null>(null);
  const [renVal, setRenVal] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState("");
  const [freeLeft, setFreeLeft] = useState<number | null>(null); // free Nexora 1.0 messages left today (never shown as a counter)
  const [lastReq, setLastReq] = useState<ChatRequest | null>(null);
  const attach = useAttachment();
  const models = modelsFor("chat")!;
  const [modelId, setModelId] = useState(models[0].id);
  const model = models.find((m) => m.id === modelId) ?? models[0]; // points per message
  const isFree1 = Boolean(model.freeDaily) && (freeLeft ?? 1) > 0; // a free Nexora 1.0 message needs no points
  const needsPts = !isFree1;
  async function loadFree() { // quietly reads today's free messages left, so the send button can show "1 pt" from message 13
    if (!isConfigured || !model.freeDaily) return;
    const { data } = await createClient().from("nexora1_usage").select("count, window_start").maybeSingle();
    const fresh = !data || Date.parse(data.window_start) <= Date.now() - 86400000;
    setFreeLeft(Math.max(0, model.freeDaily - (fresh ? 0 : Number(data?.count ?? 0))));
  }
  useEffect(() => { if (ready) loadFree(); }, [ready, modelId]); // eslint-disable-line react-hooks/exhaustive-deps
  const endRef = useRef<HTMLDivElement>(null);
  const files = useRef<Record<string, File>>({}); // attachments live in memory only, so retry and edit can reuse them
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const l: Conversation[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      const clean = l.map((c) => ({ ...c, messages: c.messages.filter((m) => m.role !== "system").map((m) => (m.status === "sending" || m.status === "sent" ? { ...m, status: "failed" as const } : m)) }));
      let open: string | null = null; // reopen the same chat ONLY when you were just here; otherwise a fresh, empty chat opens
      try { const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); if (s?.id && Date.now() - s.at < IDLE_MS && clean.some((c) => c.id === s.id)) open = s.id; } catch { /* ignore */ }
      setConvs(clean); setActiveId(open);
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(savable(convs))); } catch { /* ignore */ } }, [convs, ready]);
  const lastAt = useRef(Date.now());
  useEffect(() => { if (!ready) return; lastAt.current = Date.now(); try { if (activeId) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: activeId, at: Date.now() })); } catch { /* ignore */ } }, [activeId, convs, ready]);
  useEffect(() => { // coming back after a long break: start a new chat (your old chats stay in the history)
    const f = () => { if (document.visibilityState === "visible" && Date.now() - lastAt.current > IDLE_MS) { setActiveId(null); setEditing(null); setInput(""); } };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  useEffect(() => { if (ready && isConfigured) purgeExpired(); }, [ready]); // removes this user's expired free-plan images
  const active = convs.find((c) => c.id === activeId) ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length, thinking]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { // arrives from the Home screen (?q=1) or from the Library (?g=...)
    if (!ready) return;
    const p = new URLSearchParams(location.search), q = p.get("q"), g = p.get("g"), h = takeHandoff();
    if (g) { history.replaceState(history.state, "", "/dashboard/chat"); openFromLibrary(g); }
    else if (h?.fill) { // a starter card from the Home screen: fill the box (and pick the model or open the photo picker) but do not send
      history.replaceState(history.state, "", "/dashboard/chat");
      if (h.model) setModelId(h.model);
      setInput(h.text);
      setTimeout(() => document.getElementById("dock-input")?.focus(), 60);
      if (h.picker) { attach.openSheet(); try { attach.pickKind(h.picker); } catch { /* the sheet stays open */ } }
    }
    else if (q || h) { history.replaceState(history.state, "", "/dashboard/chat"); send(h?.text ?? q ?? "", h?.file ?? null); }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opens a saved answer from the Library as a conversation (the same one if it is still on this device).
  async function openFromLibrary(g: string) {
    const local = convs.find((x) => x.id === `lib-${g}`);
    if (local) { setActiveId(local.id); return; }
    if (!isConfigured) return;
    const { data } = await createClient().from("generations").select("prompt, result, created_at").eq("id", g).maybeSingle();
    if (!data) { setToast("That answer couldn’t be found."); return; }
    const t = Date.parse(data.created_at) || Date.now();
    const ask = String(data.prompt ?? "").replace(/^\[Attachment: [^\]]*\]\s*/, "");
    const conv: Conversation = { id: `lib-${g}`, title: ask.slice(0, 40) || "Saved chat", updatedAt: t, messages: [
      { id: uid(), role: "user", content: ask, ts: t }, { id: uid(), role: "assistant", content: String(data.result?.text ?? ""), ts: t }] };
    setConvs((cs) => [conv, ...cs]); setActiveId(conv.id);
  }
  const patch = (id: string, fn: (c: Conversation) => Conversation) => setConvs((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  const setStatus = (id: string, mid: string, status: ChatMessage["status"], only?: ChatMessage["status"]) =>
    patch(id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === mid && (!only || m.status === only) ? { ...m, status } : m)) }));

  async function run(id: string, messages: ChatMessage[], userMsgId: string) {
    setBusy(true); setThinking(false);
    const req = buildChatRequest(messages, model.id);
    setLastReq(req);
    const request = sendChatMessage(req, files.current[userMsgId] ?? null); // dispatched now
    // "Sending…" shows for a moment, then it becomes "Sent" and "Thinking…" starts.
    const t = setTimeout(() => { setStatus(id, userMsgId, "sent", "sending"); setThinking(true); }, 600);
    try {
      const r = await request;
      const reply = r.text;
      clearTimeout(t);
      patch(id, (c) => ({ ...c, updatedAt: Date.now(), messages: [...c.messages.map((m) => (m.id === userMsgId ? { ...m, status: undefined } : m)), { id: uid(), role: "assistant", content: reply, ts: Date.now(), notice: r.limitReached ? NOTICE_12 : undefined }] }));
      refresh(); // update the points in the header right away
      if (typeof r.freeLeft === "number") setFreeLeft(r.freeLeft);
    } catch (e) {
      clearTimeout(t);
      const err = e instanceof ChatError ? e : null;
      if (err?.code === "upload_limit") attach.showLimit(Boolean(err.data?.upgraded));
      patch(id, (c) => ({ ...c, messages: [...c.messages.map((m) => (m.id === userMsgId ? { ...m, status: "failed" as const } : m)), { id: uid(), role: "system", content: e instanceof Error ? e.message : "Something went wrong. You weren’t charged.", ts: Date.now(), retryFor: userMsgId }] }));
    } finally { setBusy(false); setThinking(false); }
  }
  function send(raw: string, fileArg?: File | null) {
    if (busy) return;
    const file = fileArg !== undefined ? fileArg : attach.file;
    const t = raw.trim();
    if ((!t && !file) || (needsPts && model.points > BALANCE)) return;
    const kind = file ? kindOf(mimeOf(file.name, file.type)) ?? "document" : null;
    const msg: ChatMessage = { id: uid(), role: "user", content: t || "Please look at the attached file and tell me what it contains.", ts: Date.now(), status: "sending",
      attachment: file && kind ? { name: file.name, size: file.size, kind, type: file.type } : undefined };
    if (file) files.current[msg.id] = file;
    let id = activeId, base: ChatMessage[] = (active?.messages ?? []).filter((m) => m.role !== "system");
    if (editing) { const i = base.findIndex((m) => m.id === editing); if (i >= 0) base = base.slice(0, i); } // an edited message replaces the old one and what followed it
    setEditing(null);
    if (!active) { id = uid(); setConvs((cs) => [{ id: id!, title: msg.content.slice(0, 40), updatedAt: Date.now(), messages: [msg] }, ...cs]); setActiveId(id); base = []; }
    else patch(active.id, (c) => ({ ...c, title: c.title === "New chat" ? msg.content.slice(0, 40) : c.title, updatedAt: Date.now(), messages: [...base, msg] }));
    setInput(""); attach.clear();
    if (file && kind === "image" && profile) { // photos are also saved privately so they stay viewable (14 days on the free plan)
      saveChatImage(profile.id, file).then((s) => { if (s) setConvs((cs) => cs.map((c) => ({ ...c, messages: c.messages.map((m) => (m.id === msg.id && m.attachment ? { ...m, attachment: { ...m.attachment, path: s.path, expiresAt: s.expiresAt } } : m)) }))); });
    }
    run(id!, [...base, msg], msg.id);
  }
  // Retry sends the SAME message again (no duplicate): everything after it, including the error notice, is dropped first.
  function retry(userMsgId: string) {
    if (!active || busy) return;
    const i = active.messages.findIndex((m) => m.id === userMsgId);
    if (i < 0) return;
    const m = active.messages[i];
    if (m.attachment && !files.current[userMsgId]) { setToast("Please attach the file again and resend."); return; }
    if (needsPts && model.points > BALANCE) { setToast("Not enough points."); return; }
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
  function startEdit(m: ChatMessage) {
    if (busy) return;
    setEditing(m.id); setInput(m.content);
    const f = files.current[m.id];
    if (f) attach.setFile(f);
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
    setHist(false); setEditing(null);
    if (active && active.messages.length === 0) return;
    const c: Conversation = { id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] };
    setConvs((cs) => [c, ...cs]); setActiveId(c.id); setInput("");
  }
  function remove(id: string) { const rest = convs.filter((c) => c.id !== id); setConvs(rest); setDelId(null); if (id === activeId) setActiveId(rest[0]?.id ?? null); }
  function saveRename() { if (renId && renVal.trim()) patch(renId, (c) => ({ ...c, title: renVal.trim().slice(0, 60) })); setRenId(null); }
  async function copy(m: ChatMessage) { try { await navigator.clipboard.writeText(m.role === "user" ? m.content : stripMarkdown(m.content)); setCopied(m.id); setTimeout(() => setCopied(""), 1500); } catch { /* ignore */ } }
  async function share(m: ChatMessage) {
    const text = stripMarkdown(m.content);
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setToast("Copied, ready to share"); }
    } catch { /* the person closed the share sheet */ }
  }
  const rate = (id: string, f: "up" | "down") => active && patch(active.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, feedback: m.feedback === f ? undefined : f } : m)) }));

  const msgs = active?.messages ?? [];
  const lastId = msgs[msgs.length - 1]?.id;
  const sorted = [...convs].sort((a, b) => b.updatedAt - a.updatedAt);
  const act = "flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/10 hover:text-brand";
  const above = editing || attach.chip ? (
    <div className="space-y-2">
      {editing && <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs"><Pencil size={12} className="text-brand" />Editing message<button type="button" aria-label="Cancel editing" onClick={() => { setEditing(null); setInput(""); attach.clear(); }} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/10"><X size={12} /></button></div>}
      {attach.chip}
    </div>
  ) : null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <HeaderSlot><ModelPicker compact chat models={models} value={model.id} onChange={setModelId} /></HeaderSlot>
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
                  {m.attachment && <AttachmentThumb att={m.attachment} file={files.current[m.id]} />}{m.content}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                  {m.status === "sending" && <span>Sending…</span>}
                  {m.status === "sent" && <span className="flex items-center gap-1"><Check size={11} />Sent</span>}
                  {m.status === "failed" && <span className="text-red-400">Failed{m.id === lastUserId && <> · <button type="button" onClick={() => retry(m.id)} className="underline">Retry</button> <span className="text-muted">(or press and hold)</span></>}</span>}
                  {!m.status && (
                    <>
                      <button type="button" aria-label="Copy message" onClick={() => copy(m)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/10 hover:text-brand">{copied === m.id ? <Check size={13} /> : <Copy size={13} />}</button>
                      <button type="button" aria-label="Edit message" disabled={busy} onClick={() => startEdit(m)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/10 hover:text-brand disabled:opacity-40"><Pencil size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5"><Image src="/logo.png" alt="" width={22} height={18} /></div>
                <div className="min-w-0 max-w-[88%]">
                  <div className={`rounded-3xl rounded-tl-lg px-4 py-2.5 ${m.role === "system" ? "whitespace-pre-wrap break-words border border-dashed border-red-400/40 text-muted" : "bg-white/5"}`}>
                    {m.role === "system" ? <><b className="mb-1 block text-xs uppercase tracking-wider text-red-400">Couldn’t send</b>{m.content}</> : <><Markdown text={m.content} />{m.notice && <p className="mt-3 border-t border-white/10 pt-2 text-xs italic text-muted">{m.notice}</p>}</>}
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
            {thinking && (
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
      <Dock value={input} onChange={setInput} onSend={() => send(input)} placeholder="Ask Nexora…" cost={model.freeDaily ? (freeLeft === 0 ? shortPts(model.points) : undefined) : shortPts(model.points)} low={needsPts && model.points > BALANCE} disabled={busy} canSendEmpty={Boolean(attach.file)} onPlus={attach.openSheet} above={above} />
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
              <button type="button" onClick={() => { setActiveId(c.id); setHist(false); setEditing(null); }} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-medium">{c.title}</button>
              <button type="button" aria-label={`Rename ${c.title}`} onClick={() => { setRenId(c.id); setRenVal(c.title); }} className="p-1.5 text-muted hover:text-brand"><Pencil size={14} /></button>
              <button type="button" aria-label={`Delete ${c.title}`} onClick={() => setDelId(c.id)} className="p-1.5 text-muted hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <details className="border-t border-line p-3 text-xs text-muted">
          <summary className="cursor-pointer">AI connection (developer)</summary>
          <p className="mt-2">Messages go to <code>/api/ai/chat</code> with the full conversation so follow-ups keep their context. Chats are also saved on this device; every answer is saved to your Library. Photos are saved privately (14 days on the free plan); videos and documents are never stored.</p>
          {lastReq && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/5 p-2">{JSON.stringify(lastReq, null, 2)}</pre>}
        </details>
      </aside>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, History, Info, MessageSquare, Pencil, Plus, RefreshCw, SendHorizontal, Trash2, X } from "lucide-react";
import ModelPicker from "@/components/dashboard/ModelPicker";
import PointsInfo from "@/components/dashboard/PointsInfo";
import { BALANCE, modelsFor } from "@/lib/models";
import { buildChatRequest, sendChatMessage, NotConnectedError, type ChatMessage, type ChatRequest, type Conversation } from "@/lib/chat/api";

const KEY = "nexora-chats-v1";
const SUGGESTED = ["Give me 5 video ideas about budget travel", "Write a 30-second script about morning routines", "Explain what an API is in two sentences", "Suggest 3 titles for a video about phone cameras"];
const uid = () => Math.random().toString(36).slice(2, 10);
const NOTICE = "Nexora AI Chat isn’t connected to an AI service yet. Your message is saved on this device and will be sent once the backend is connected.";

export default function ChatApp() {
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
  const [lastReq, setLastReq] = useState<ChatRequest | null>(null);
  const models = modelsFor("chat")!;
  const [modelId, setModelId] = useState(models[0].id);
  const model = models.find((m) => m.id === modelId) ?? models[0]; // points per message
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { const l: Conversation[] = JSON.parse(localStorage.getItem(KEY) || "[]"); setConvs(l); setActiveId(l[0]?.id ?? null); } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(convs)); } catch { /* ignore */ } }, [convs, ready]);
  const active = convs.find((c) => c.id === activeId) ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length, busy]);

  const patch = (id: string, fn: (c: Conversation) => Conversation) => setConvs((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  const push = (id: string, m: ChatMessage) => patch(id, (c) => ({ ...c, updatedAt: Date.now(), messages: [...c.messages, m] }));

  async function run(id: string, messages: ChatMessage[]) {
    setBusy(true);
    const req = buildChatRequest(messages, model.id);
    setLastReq(req);
    try {
      const reply = await sendChatMessage(req); // <-- backend connection point (lib/chat/api.ts)
      push(id, { id: uid(), role: "assistant", content: reply, ts: Date.now() });
    } catch (e) {
      push(id, { id: uid(), role: "system", content: e instanceof NotConnectedError ? NOTICE : "Something went wrong. Please try again.", ts: Date.now() });
    } finally { setBusy(false); }
  }
  function send(raw: string) {
    const t = raw.trim();
    if (!t || busy || model.points > BALANCE) return;
    const msg: ChatMessage = { id: uid(), role: "user", content: t, ts: Date.now() };
    let id = activeId, base: ChatMessage[] = active?.messages ?? [];
    if (!active) { id = uid(); setConvs((cs) => [{ id: id!, title: t.slice(0, 40), updatedAt: Date.now(), messages: [msg] }, ...cs]); setActiveId(id); base = []; }
    else patch(active.id, (c) => ({ ...c, title: c.title === "New chat" ? t.slice(0, 40) : c.title, updatedAt: Date.now(), messages: [...c.messages, msg] }));
    setInput(""); if (taRef.current) taRef.current.style.height = "auto";
    run(id!, [...base, msg]);
  }
  function regenerate() {
    if (!active || busy) return;
    let i = active.messages.length - 1;
    while (i >= 0 && active.messages[i].role !== "user") i--;
    if (i < 0) return;
    const base = active.messages.slice(0, i + 1);
    patch(active.id, (c) => ({ ...c, messages: base }));
    run(active.id, base);
  }
  function newChat() {
    setHist(false);
    if (active && active.messages.length === 0) return;
    const c: Conversation = { id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] };
    setConvs((cs) => [c, ...cs]); setActiveId(c.id); setInput("");
  }
  function remove(id: string) {
    const rest = convs.filter((c) => c.id !== id);
    setConvs(rest); setDelId(null);
    if (id === activeId) setActiveId(rest[0]?.id ?? null);
  }
  function saveRename() { if (renId && renVal.trim()) patch(renId, (c) => ({ ...c, title: renVal.trim().slice(0, 60) })); setRenId(null); }
  async function copy(m: ChatMessage) { try { await navigator.clipboard.writeText(m.content); setCopied(m.id); setTimeout(() => setCopied(""), 1500); } catch { /* ignore */ } }
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const touch = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (e.key === "Enter" && !e.shiftKey && !touch) { e.preventDefault(); send(input); }
  }

  const msgs = active?.messages ?? [];
  const lastId = msgs[msgs.length - 1]?.id;
  const sorted = [...convs].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="relative -mx-4 -my-6 flex h-[calc(100dvh-4rem)] overflow-hidden bg-bg lg:-mx-8">
      {hist && <div className="absolute inset-0 z-10 bg-black/40 lg:hidden" onClick={() => setHist(false)} />}
      <aside aria-label="Conversations" className={`absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-line bg-card transition-transform lg:static lg:translate-x-0 ${hist ? "" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-3"><b className="px-1">Conversations</b><button className="p-1.5 lg:hidden" aria-label="Close conversations" onClick={() => setHist(false)}><X size={18} /></button></div>
        <div className="px-3 pb-2"><button type="button" onClick={newChat} className="btn btn-p w-full !py-2.5 text-sm"><Plus size={16} />New chat</button></div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {sorted.length === 0 && <p className="px-3 py-4 text-sm text-muted">No conversations yet.</p>}
          {sorted.map((c) => renId === c.id ? (
            <input key={c.id} autoFocus value={renVal} aria-label="Rename conversation" onChange={(e) => setRenVal(e.target.value)} onBlur={saveRename} onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenId(null); }} className="field !py-2 text-sm" />
          ) : delId === c.id ? (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-soft px-3 py-2 text-sm">Delete this chat?<span className="flex gap-3 font-semibold"><button type="button" onClick={() => remove(c.id)} className="text-red-500">Yes</button><button type="button" onClick={() => setDelId(null)} className="text-muted">No</button></span></div>
          ) : (
            <div key={c.id} className={`group flex items-center rounded-xl pr-1 ${c.id === activeId ? "bg-soft" : "hover:bg-soft"}`}>
              <button type="button" onClick={() => { setActiveId(c.id); setHist(false); }} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-medium">{c.title}</button>
              <button type="button" aria-label={`Rename ${c.title}`} onClick={() => { setRenId(c.id); setRenVal(c.title); }} className="p-1.5 text-muted hover:text-brand"><Pencil size={14} /></button>
              <button type="button" aria-label={`Delete ${c.title}`} onClick={() => setDelId(c.id)} className="p-1.5 text-muted hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <button type="button" className="p-2 lg:hidden" aria-label="Open conversations" onClick={() => setHist(true)}><History size={20} /></button>
          <h1 className="min-w-0 flex-1 truncate font-bold">{active?.title ?? "Nexora AI Chat"}</h1>
          <button type="button" onClick={newChat} className="btn btn-g !px-4 !py-2 text-sm"><Plus size={16} /><span className="hidden sm:inline">New chat</span></button>
        </div>
        <details className="border-b border-line bg-soft px-4 py-2 text-xs text-muted">
          <summary className="flex cursor-pointer items-center gap-1.5"><Info size={14} className="text-brand" /><b className="text-brand">AI not connected yet.</b> Chats are saved on this device only. Tap for connection details.</summary>
          <p className="mt-2">Backend connection point: <code>lib/chat/api.ts</code> → <code>sendChatMessage()</code>. The full conversation is sent each time so follow-up questions keep their context.</p>
          {lastReq && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-card p-2">{JSON.stringify(lastReq, null, 2)}</pre>}
        </details>

        <div role="log" aria-live="polite" className="flex-1 overflow-y-auto px-4 py-5">
          {msgs.length === 0 && !busy ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <Image src="/logo.png" alt="" width={64} height={52} />
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">How can I help <span className="grad">today?</span></h2>
              <p className="mt-2 text-muted">Ask a question, or start with one of these.</p>
              <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                {SUGGESTED.map((s) => <button key={s} type="button" onClick={() => send(s)} className="card flex items-start gap-3 !p-4 text-left text-sm font-medium"><MessageSquare size={18} className="mt-0.5 shrink-0 text-brand" />{s}</button>)}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {msgs.map((m) => m.role === "user" ? (
                <div key={m.id} className="flex justify-end"><div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-white">{m.content}</div></div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft"><Image src="/logo.png" alt="" width={22} height={18} /></div>
                  <div className="min-w-0 max-w-[88%]">
                    <div className={`whitespace-pre-wrap break-words rounded-2xl rounded-tl-md px-4 py-2.5 ${m.role === "system" ? "border border-dashed border-brand/50 bg-soft text-muted" : "border border-line bg-card"}`}>
                      {m.role === "system" && <b className="mb-1 block text-xs uppercase tracking-wider text-brand">Not connected</b>}{m.content}
                    </div>
                    <div className="mt-1.5 flex gap-1 text-xs text-muted">
                      <button type="button" onClick={() => copy(m)} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-soft hover:text-brand">{copied === m.id ? <Check size={13} /> : <Copy size={13} />}{copied === m.id ? "Copied" : "Copy"}</button>
                      {m.id === lastId && !busy && <button type="button" onClick={regenerate} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-soft hover:text-brand"><RefreshCw size={13} />Regenerate</button>}
                    </div>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex gap-3" role="status" aria-label="Waiting for a response">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft"><Image src="/logo.png" alt="" width={22} height={18} /></div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3">{[0, 150, 300].map((d) => <i key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />)}</div>
                </div>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line bg-bg px-3 pb-3 pt-3">
          <div className="mx-auto mb-2 max-w-3xl space-y-2"><ModelPicker models={models} value={model.id} onChange={setModelId} up label={false} /><PointsInfo cost={model.points} per="per message" /></div>
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-line bg-card p-2 shadow-[0_20px_40px_-30px_rgba(37,99,235,.5)] focus-within:border-brand">
            <label htmlFor="chat-input" className="sr-only">Message Nexora AI Chat</label>
            <textarea id="chat-input" ref={taRef} rows={1} value={input} onKeyDown={onKey} onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }} placeholder="Message Nexora AI Chat…" className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none" />
            <button type="button" onClick={() => send(input)} disabled={!input.trim() || busy || model.points > BALANCE} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"><SendHorizontal size={18} /></button>
          </div>
          <p className="mt-1.5 hidden text-center text-xs text-muted sm:block">Enter to send · Shift+Enter for a new line</p>
        </div>
      </section>
    </div>
  );
}

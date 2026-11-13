import { GLOBAL_RULES, TOOL_RULES } from "@/lib/ai/engine";

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = {
  id: string; role: ChatRole; content: string; ts: number;
  status?: "sending" | "failed";                       // user messages only; cleared when the AI answers
  retryFor?: string;                                   // on an error notice: the user message to retry
  feedback?: "up" | "down";                            // thumbs on an AI answer
  attachment?: { name: string; size: number; kind: "image" | "video" | "document" }; // metadata only, the file itself is never stored
};
export type Conversation = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };
export type ChatRequest = { model: string; system: string; messages: { role: "user" | "assistant"; content: string }[] };

export class NotConnectedError extends Error {}
export class ChatError extends Error {
  constructor(message: string, public code = "error", public data?: { upgraded?: boolean }) { super(message); }
}

/** The full conversation is sent every time so the assistant keeps context. Error notices are never sent. */
export function buildChatRequest(history: ChatMessage[], model: string): ChatRequest {
  const real = history.filter((m) => m.role !== "system");
  return {
    model,
    system: [...GLOBAL_RULES, ...((TOOL_RULES as Record<string, string[]>).chat ?? [])].join("\n"),
    messages: real.map((m, i) => ({
      role: m.role as "user" | "assistant",
      content: m.attachment && i < real.length - 1 ? `[The user attached "${m.attachment.name}" (${m.attachment.kind}) here. That file is no longer available.]\n${m.content}` : m.content,
    })),
  };
}

/** Sends the conversation (and an optional file) to app/api/ai/chat/route.ts. Files go as raw bytes, not base64, to stay under Vercel's request limit. */
export async function sendChatMessage(req: ChatRequest, file?: File | null): Promise<string> {
  const payload = JSON.stringify({ messages: req.messages, model: req.model });
  let res: Response;
  try {
    if (file) { const fd = new FormData(); fd.append("payload", payload); fd.append("file", file); res = await fetch("/api/ai/chat", { method: "POST", body: fd }); }
    else res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
  } catch { throw new ChatError("Couldn’t reach the server. You weren’t charged.", "network"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ChatError(data.message ?? "Something went wrong. You weren’t charged.", data.error ?? "error", data.quota);
  return data.text as string;
}

import { GLOBAL_RULES, TOOL_RULES } from "@/lib/ai/engine";

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatRole; content: string; ts: number };
export type Conversation = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };
export type ChatRequest = { model: string; system: string; messages: { role: "user" | "assistant"; content: string }[] };

export class NotConnectedError extends Error {}
export class ChatError extends Error {}

/** The full conversation is sent every time so the assistant keeps context. "system" notices are never sent. */
export function buildChatRequest(history: ChatMessage[], model: string): ChatRequest {
  return {
    model,
    system: [...GLOBAL_RULES, ...((TOOL_RULES as Record<string, string[]>).chat ?? [])].join("\n"),
    messages: history.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  };
}

/**
 * Sends the conversation to our own server route (app/api/ai/chat/route.ts). That route checks login and points,
 * calls Gemini with the secret key, and only charges points after a valid answer.
 */
export async function sendChatMessage(req: ChatRequest): Promise<string> {
  const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: req.messages, model: req.model }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ChatError(data.message ?? "Something went wrong. You weren’t charged.");
  return data.text as string;
}

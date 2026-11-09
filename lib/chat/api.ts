import { GLOBAL_RULES, TOOL_RULES } from "@/lib/ai/engine";

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatRole; content: string; ts: number };
export type Conversation = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };
export type ChatRequest = { model: string; system: string; messages: { role: "user" | "assistant"; content: string }[] };

export class NotConnectedError extends Error {}

/**
 * Builds the request for the AI service. The FULL conversation history is sent every time so the
 * assistant can answer follow-up questions in context. "system" notices are never sent.
 */
export function buildChatRequest(history: ChatMessage[], model: string): ChatRequest {
  return {
    model,
    system: [...GLOBAL_RULES, ...((TOOL_RULES as Record<string, string[]>).chat ?? [])].join("\n"),
    messages: history.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  };
}

/**
 * ============================================================
 *  BACKEND CONNECTION POINT: Nexora AI Chat
 * ============================================================
 *  The AI service will be connected HERE and nowhere else in the UI.
 *  When the backend exists, replace the body below with something like:
 *
 *    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
 *    if (!res.ok) throw new Error("Request failed");
 *    return (await res.json()).reply as string;
 *
 *  (/api/chat is a future server route that calls the AI provider with a secret key. Never call the
 *  provider directly from the browser.) The UI already handles loading, errors, copy and regenerate.
 */
export async function sendChatMessage(req: ChatRequest): Promise<string> {
  void req;
  // Short wait so the loading indicator is visible in this front-end-only build. Remove when connected.
  await new Promise((r) => setTimeout(r, 700));
  throw new NotConnectedError("Nexora AI Chat isn’t connected to an AI service yet.");
}

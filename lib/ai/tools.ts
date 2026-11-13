import { buildRequest } from "@/lib/ai/engine";
import { AIError, generateText } from "./gemini";
import { OFF_TOPIC_MESSAGES, TOOL_SYSTEM, toolUserPrompt } from "./prompts";

export type Output =
  | { kind: "script"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "seo"; titles: string[]; description: string; tags: string[] };
type C = { targetWords?: number; quantity?: number; durationSeconds?: number };
type Parsed = { ok: true; out: Output } | { ok: false; problem: string };

const words = (s: string) => (s.trim().match(/\S+/g) || []).length;
const unfence = (s: string) => s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
const LINE = /^\s*(?:\d+[.)]|[-*•])\s*(.+?)\s*$/;
const clean = (s: string) => s.replace(/^\*+|\*+$/g, "").replace(/^["“]|["”]$/g, "").trim();
function lines(block: string) {
  const all = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const numbered = all.map((l) => LINE.exec(l)?.[1]).filter((x): x is string => Boolean(x));
  return (numbered.length ? numbered : all).map(clean).filter(Boolean);
}

function parse(slug: string, raw: string, c: C, final: boolean): Parsed {
  const text = unfence(raw);
  if (!text) return { ok: false, problem: "the answer was empty" };
  if (slug === "script") {
    const T = c.targetWords ?? 75, w = words(text);
    if (!final && Math.abs(w - T) > T * 0.3) return { ok: false, problem: `it had ${w} words but must be about ${T}` };
    return { ok: true, out: { kind: "script", text } };
  }
  const n = c.quantity ?? 5;
  if (slug === "ideas") {
    const items = lines(text);
    if (items.length < n) return { ok: false, problem: `it had ${items.length} ideas but exactly ${n} are required` };
    return { ok: true, out: { kind: "list", items: items.slice(0, n) } };
  }
  const m = /TITLES:\s*([\s\S]*?)DESCRIPTION:\s*([\s\S]*?)TAGS:\s*([\s\S]*)/i.exec(text);
  if (!m) return { ok: false, problem: "it did not follow the TITLES / DESCRIPTION / TAGS format" };
  const titles = lines(m[1]);
  if (titles.length < n) return { ok: false, problem: `it had ${titles.length} titles but exactly ${n} are required` };
  if (!final && titles.slice(0, n).some((t) => t.length > 100)) return { ok: false, problem: "a title was longer than 100 characters" };
  const tags = m[3].replace(/\n/g, ",").split(",").map(clean).filter(Boolean).slice(0, 15);
  const description = clean(m[2]);
  if (!description || !tags.length) return { ok: false, problem: "the description or tags were missing" };
  return { ok: true, out: { kind: "seo", titles: titles.slice(0, n).map((t) => t.slice(0, 100)), description, tags } };
}

/** Runs one text tool. Tries up to twice so the answer follows the quantity and format rules. Throws if no valid result. */
export async function runTool(slug: string, text: string, v: Record<string, string>): Promise<Output> {
  const c = buildRequest(slug, text, v).constraints as unknown as C;
  const base = toolUserPrompt(slug, text, v, c);
  let user = base;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await generateText({ system: TOOL_SYSTEM[slug], turns: [{ role: "user", content: user }], maxOutputTokens: slug === "script" ? 6144 : 3072, chain: "text" });
    if (/^\s*OFF_TOPIC\b/i.test(raw)) throw new AIError("off_topic", OFF_TOPIC_MESSAGES[slug] ?? "Please enter a topic for this tool.", 422); // not a task for this tool: no result, no charge
    const p = parse(slug, raw, c, attempt === 1);
    if (p.ok) return p.out;
    user = `${base}\n\nYour previous answer broke a rule: ${p.problem}. Write it again and follow every rule exactly.`;
  }
  throw new AIError("invalid", "The AI didn’t return a usable result. Please try again.");
}

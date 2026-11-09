"use client";
import { GLOBAL_RULES, IMPROVE_RULES, TOOL_RULES, buildRequest } from "@/lib/ai/engine";

export default function StandardsPanel({ slug, text, values }: { slug: string; text: string; values: Record<string, string> }) {
  const rules = (TOOL_RULES as Record<string, string[]>)[slug] ?? [];
  const req = buildRequest(slug, text, values);
  return (
    <details className="mt-4 rounded-2xl border border-line bg-card px-5 py-3 text-sm">
      <summary className="cursor-pointer font-semibold">How Nexora Ai follows your request</summary>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">{[...rules, ...GLOBAL_RULES, ...IMPROVE_RULES.map((r) => `Improve button: ${r}`)].map((r) => <li key={r}>{r}</li>)}</ul>
      <p className="mt-4 font-semibold">Request preview <span className="font-normal text-muted">(what will be sent to the AI later)</span></p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-soft p-3 text-xs">{JSON.stringify({ tool: req.tool, user: req.user, constraints: req.constraints }, null, 2)}</pre>
    </details>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { InsufficientPointsError } from "@/lib/points/server";
import { AIError } from "@/lib/ai/gemini";

export const fail = (status: number, error: string, message: string) => NextResponse.json({ error, message }, { status });

/** Reads the signed-in user from the Supabase session cookie. */
export async function requireUser(): Promise<{ ok: true; userId: string } | { ok: false; res: NextResponse }> {
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (data.user) return { ok: true, userId: data.user.id };
  } catch { /* fall through */ }
  return { ok: false, res: fail(401, "unauthorized", "Please log in again.") };
}

/** Every failure becomes a clear message. Failures never charge points. */
export function handle(e: unknown) {
  if (e instanceof InsufficientPointsError) return fail(402, "insufficient_points", "You don’t have enough points. Top up in Pricing & Points.");
  if (e instanceof AIError) return fail(e.status, e.code, `${e.message} You weren’t charged.`);
  console.error("AI route error:", e);
  return fail(500, "server_error", "Something went wrong on our side. You weren’t charged.");
}

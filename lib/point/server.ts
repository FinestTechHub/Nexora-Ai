import { createClient } from "@supabase/supabase-js";

/**
 * SERVER ONLY. Zero-loss point policy for real AI generations (not used until the AI is connected).
 *  1. Check the user has enough points (nothing is taken yet).
 *  2. Call the model. If it fails or returns nothing valid, the failure is logged and NO points are taken.
 *  3. Only after valid output: complete_generation() saves the result AND charges the points in one database step.
 *     Even if the user's phone disconnects or reloads, the result is already in their Library.
 * Needs SUPABASE_SERVICE_ROLE_KEY in Vercel (a secret, never NEXT_PUBLIC_).
 */
export class InsufficientPointsError extends Error {}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server keys are not set.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function runPaidGeneration<T>(a: { userId: string; tool: string; model: string; prompt: string; cost: number; produce: () => Promise<T>; isValid: (r: T) => boolean }) {
  const db = admin();
  const { data: p } = await db.from("profiles").select("points").eq("id", a.userId).single();
  if (!p || p.points < a.cost) throw new InsufficientPointsError("Not enough points.");
  let result: T;
  try {
    result = await a.produce();
    if (!a.isValid(result)) throw new Error("The model returned no valid output.");
  } catch (e) {
    await db.from("generations").insert({ user_id: a.userId, tool: a.tool, model: a.model, prompt: a.prompt, status: "failed", points_charged: 0, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
  const { data, error } = await db.rpc("complete_generation", { p_user_id: a.userId, p_tool: a.tool, p_model: a.model, p_prompt: a.prompt, p_result: result, p_amount: a.cost });
  if (error) throw error;
  return data as { generation_id: string; status: string; points_charged: number; balance: number };
}

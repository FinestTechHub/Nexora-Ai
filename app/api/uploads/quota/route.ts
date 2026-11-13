import { NextResponse } from "next/server";
import { fail, requireUser } from "@/lib/ai/route-helpers";
import { limitsFor, type Quota } from "@/lib/uploads/limits";
import { admin } from "@/lib/points/server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  const { data, error } = await admin().rpc("upload_status", { p_user_id: auth.userId });
  if (error) return fail(500, "server_error", "Upload limits aren’t set up yet.");
  const lim = limitsFor(Boolean(data?.upgraded));
  const q: Quota = { upgraded: Boolean(data?.upgraded), maxFile: lim.maxFile, daily: lim.daily, used: Number(data?.used_24h ?? 0), resetsAt: data?.resets_at ?? null };
  return NextResponse.json(q);
}

"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/client";

export type Profile = { id: string; points: number; role: "user" | "admin"; full_name: string | null; email: string | null };
type Ctx = { profile: Profile | null; loading: boolean; refresh: () => Promise<void> };
const PointsCtx = createContext<Ctx>({ profile: null, loading: false, refresh: async () => {} });

// Keeps the signed-in user's live profile (points, role, name) from Supabase. Refreshes on every page change and when the app regains focus.
export function PointsProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("id, points, role, full_name, email").eq("id", auth.user.id).maybeSingle();
    setProfile(data ? (data as Profile) : null);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [path, refresh]);
  useEffect(() => { const f = () => { refresh(); }; window.addEventListener("focus", f); return () => window.removeEventListener("focus", f); }, [refresh]);
  return <PointsCtx.Provider value={{ profile, loading, refresh }}>{children}</PointsCtx.Provider>;
}

// "points" is Infinity until the balance is known, so nothing is blocked while loading.
export function usePoints() {
  const { profile, loading, refresh } = useContext(PointsCtx);
  return { profile, loading, refresh, known: profile !== null, points: profile ? profile.points : Number.POSITIVE_INFINITY };
}

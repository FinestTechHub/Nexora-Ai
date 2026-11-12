"use client";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { createClient, isConfigured } from "@/lib/supabase/client";
import { usePoints } from "@/lib/points/PointsContext";
import { ToolHeader } from "./tool-ui";

export default function SettingsPage() {
  const { profile, loading, refresh } = usePoints();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) setName(profile.full_name ?? ""); }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!profile || !name.trim()) { setMsg({ t: "Please enter your name." }); return; }
    setBusy(true); setMsg({ t: "" });
    const sb = createClient();
    const { error } = await sb.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
    if (!error) await sb.auth.updateUser({ data: { full_name: name.trim() } });
    setBusy(false);
    if (error) { setMsg({ t: error.message }); return; }
    await refresh();
    setMsg({ t: "Saved.", ok: true });
  }
  async function resetPassword() {
    if (!profile?.email) return;
    const { error } = await createClient().auth.resetPasswordForEmail(profile.email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
    setMsg(error ? { t: error.message } : { t: "A password reset link was sent to your email.", ok: true });
  }
  return (
    <div className="mx-auto max-w-3xl">
      <ToolHeader Icon={Settings} title="Settings" desc="Your profile and security." />
      {!isConfigured ? <p className="text-muted">Login isn’t set up yet.</p> : loading ? <p className="text-muted">Loading…</p> : (
        <div className="space-y-5">
          <section className="card space-y-4 hover:!translate-y-0">
            <h2 className="text-xl font-bold">Profile</h2>
            <div><label htmlFor="sn" className="mb-1.5 block text-sm font-semibold">Full name</label><input id="sn" value={name} onChange={(e) => setName(e.target.value)} className="field" /></div>
            <div><label htmlFor="se" className="mb-1.5 block text-sm font-semibold">Email</label><input id="se" value={profile?.email ?? ""} readOnly className="field opacity-70" /></div>
            <button type="button" onClick={save} disabled={busy} className="btn btn-p disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
          </section>
          <section className="card hover:!translate-y-0"><h2 className="mb-3 text-xl font-bold">Security</h2><button type="button" onClick={resetPassword} className="btn btn-g">Change password</button><p className="mt-2 text-xs text-muted">We’ll email you a secure link to set a new password.</p></section>
          <p role="status" className={`min-h-[1.25rem] text-sm ${msg.ok ? "text-green-500" : "text-red-400"}`}>{msg.t}</p>
        </div>
      )}
    </div>
  );
}

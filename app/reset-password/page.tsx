"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { createClient, isConfigured } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    if (!isConfigured) { setMsg("Login isn’t set up yet. Add your Supabase keys (see README)."); return; }
    const { error } = await createClient().auth.updateUser({ password: pw });
    if (error) setMsg(error.message); else router.push("/dashboard");
  }
  return (
    <AuthShell>
      <h1 className="text-4xl font-extrabold tracking-tight">Set a new <span className="grad">password</span></h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label htmlFor="pw" className="mb-1.5 block text-sm font-semibold">New password</label><input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" className="field" /></div>
        <button type="submit" className="btn btn-p w-full">Save password</button>
        <p role="alert" className="min-h-[1.4em] text-center text-sm text-red-500">{msg}</p>
      </form>
    </AuthShell>
  );
}

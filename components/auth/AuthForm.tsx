"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [bad, setBad] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim(), email = String(f.get("email")).trim(), pw = String(f.get("password"));
    const err =
      signup && !name ? ["name", "Please enter your name."] :
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? ["email", "Please enter a valid email address."] :
      pw.length < 8 ? ["password", "Password must be at least 8 characters."] :
      signup && !f.get("terms") ? ["terms", "Please accept the Terms and Privacy Policy."] : null;
    setBad(err ? err[0] : "");
    if (err) { setMsg({ t: err[1] }); return; }
    if (!isConfigured) { setMsg({ t: "Login isn’t set up yet. Add your Supabase keys (see README)." }); return; }
    setBusy(true); setMsg({ t: "" });
    const supabase = createClient();
    if (signup) {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setMsg({ t: error.message });
      else if (data.session) router.push("/dashboard");
      else setMsg({ t: "Check your email to confirm your account, then log in.", ok: true });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg({ t: error.message }); else { router.push("/dashboard"); router.refresh(); }
    }
    setBusy(false);
  }
  const soon = () => setMsg({ t: "Apple sign-in isn’t available yet." });
  async function google() {
    if (!isConfigured) { setMsg({ t: "Login isn’t set up yet. Add your Supabase keys (see README)." }); return; }
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
    if (error) setMsg({ t: error.message });
  }
  async function forgot() {
    const email = (document.getElementById("email") as HTMLInputElement | null)?.value.trim() ?? "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setMsg({ t: "Enter your email above first, then tap Forgot password." }); return; }
    if (!isConfigured) { setMsg({ t: "Login isn’t set up yet. Add your Supabase keys (see README)." }); return; }
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
    setMsg(error ? { t: error.message } : { t: "If that email has an account, a reset link is on its way.", ok: true });
  }

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tight">{signup ? <>Create your <span className="grad">account</span></> : <>Welcome <span className="grad">back</span></>}</h1>
      <p className="mb-6 mt-2.5 text-muted">{signup ? "Join Nexora Ai and start creating in minutes." : "Log in to continue creating with Nexora Ai."}</p>
      <div className="mb-6 grid grid-cols-2 rounded-2xl border border-line bg-soft p-1 font-semibold">
        <Link href="/login" className={`rounded-xl py-2 text-center ${!signup ? "bg-card text-brand shadow" : "text-muted"}`}>Log in</Link>
        <Link href="/signup" className={`rounded-xl py-2 text-center ${signup ? "bg-card text-brand shadow" : "text-muted"}`}>Sign up</Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {["Google", "Apple"].map((p) => <button key={p} type="button" onClick={p === "Google" ? google : soon} className="rounded-2xl border border-line bg-card py-3 font-semibold transition hover:border-brand">{p}</button>)}
      </div>
      <div className="my-5 flex items-center gap-3 text-sm text-muted before:flex-1 before:border-t before:border-line after:flex-1 after:border-t after:border-line">or with email</div>
      <form onSubmit={submit} noValidate className="space-y-4">
        {signup && <div><label htmlFor="name" className="mb-1.5 block text-sm font-semibold">Full name</label><input id="name" name="name" autoComplete="name" placeholder="Your name" aria-invalid={bad === "name"} className="field" /></div>}
        <div><label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={bad === "email"} className="field" /></div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Password</label>
          <div className="relative">
            <input id="password" name="password" type={show ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "At least 8 characters" : "Your password"} aria-invalid={bad === "password"} className="field pr-12" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-brand">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </div>
        {signup ? (
          <label className="flex items-start gap-2.5 text-sm text-muted"><input type="checkbox" name="terms" className="mt-1 h-4 w-4 accent-brand" /><span>I agree to the <Link href="/terms" className="font-semibold text-brand">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-brand">Privacy Policy</Link>.</span></label>
        ) : (
          <div className="text-right text-sm"><button type="button" onClick={forgot} className="font-semibold text-brand">Forgot password?</button></div>
        )}
        <button type="submit" disabled={busy} className="btn btn-p w-full disabled:opacity-60">{busy ? "Please wait…" : signup ? "Create account" : "Log in"}</button>
        <p role="alert" className={`min-h-[1.4em] text-center text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.t}</p>
      </form>
    </>
  );
}

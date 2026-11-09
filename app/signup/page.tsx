import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign up" };
export default function SignupPage() { return <AuthShell><AuthForm mode="signup" /></AuthShell>; }

import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Log in" };
export default function LoginPage() { return <AuthShell><AuthForm mode="login" /></AuthShell>; }

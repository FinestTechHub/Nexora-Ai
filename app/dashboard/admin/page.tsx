import type { Metadata } from "next";
import AdminPanel from "@/components/dashboard/AdminPanel";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export default function Page() { return <AdminPanel />; }

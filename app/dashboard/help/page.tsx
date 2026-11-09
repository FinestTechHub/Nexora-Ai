import type { Metadata } from "next";
import { Help } from "@/components/dashboard/Account";

export const metadata: Metadata = { title: "Help & Support" };
export default function Page() { return <Help />; }

import type { Metadata } from "next";
import { Creations } from "@/components/dashboard/Account";

export const metadata: Metadata = { title: "My Creations" };
export default function Page() { return <Creations />; }

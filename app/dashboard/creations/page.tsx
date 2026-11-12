import type { Metadata } from "next";
import Library from "@/components/dashboard/Library";

export const metadata: Metadata = { title: "My Creations" };
export default function Page() { return <Library />; }

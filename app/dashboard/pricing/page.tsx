import type { Metadata } from "next";
import { Pricing } from "@/components/dashboard/Account";

export const metadata: Metadata = { title: "Pricing & Points" };
export default function Page() { return <Pricing />; }

import type { Metadata } from "next";
import PricingPage from "@/components/dashboard/PricingPage";

export const metadata: Metadata = { title: "Pricing & Points" };
export default function Page() { return <PricingPage />; }

import type { Metadata } from "next";
import { headers } from "next/headers";
import PricingPage from "@/components/dashboard/PricingPage";

export const metadata: Metadata = { title: "Pricing & Points" };

// Vercel tells us the visitor's country in a header, which decides the currency shown.
export default async function Page() {
  const country = (await headers()).get("x-vercel-ip-country");
  return <PricingPage ipCountry={country} />;
}

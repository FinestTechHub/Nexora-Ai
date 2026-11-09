import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import Why from "@/components/sections/Why";
import Download from "@/components/sections/Download";

export default function Home() {
  return (<><Navbar /><main><Hero /><Features /><HowItWorks /><Why /><Download /></main><Footer /></>);
}

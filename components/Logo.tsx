import Image from "next/image";
import Link from "next/link";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Nexora Ai home" className={`flex items-center gap-2 text-xl font-extrabold tracking-tight ${className}`}>
      <Image src="/logo.png" alt="" width={40} height={33} priority />
      <span>Nexora <span className="grad">Ai</span></span>
    </Link>
  );
}

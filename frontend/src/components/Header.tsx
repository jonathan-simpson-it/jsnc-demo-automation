"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Chat", href: "/chat" },
  { label: "Documents", href: "/documents" },
  { label: "Eval", href: "/eval" },
  { label: "Summary", href: "/summary" },
  { label: "Config", href: "/config" },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-surface">
      <div className="container flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-serif text-sm font-semibold tracking-widest uppercase text-accent">
            JonathanSimpson
          </span>
          <span className="hidden sm:inline text-xs text-muted tracking-wider uppercase">
            AI Platform
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 text-xs uppercase tracking-wider rounded-full transition-colors",
                pathname === item.href
                  ? "bg-accent text-white"
                  : "text-muted hover:text-ink hover:bg-accent-soft",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

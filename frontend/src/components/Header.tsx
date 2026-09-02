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
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header border-b border-line bg-surface">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="brand-mark">
            JonathanSimpson
          </Link>
          <nav className="main-nav flex items-center gap-1" role="navigation" aria-label="Main">
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
    </>
  );
}

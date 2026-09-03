"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { KeySettings } from "@/components/KeySettings";

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
        <div className="container flex items-center justify-between h-14 gap-2">
          <Link
            href="/"
            className="flex items-center gap-3 shrink-0 -ml-2"
            aria-label="Jonathan Simpson & Co. — home"
          >
            <img
              src="/jsco-logo.png"
              alt=""
              width={30}
              height={30}
              className="rounded-sm"
              style={{ objectFit: "cover" }}
            />
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap hidden sm:inline" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Jonathan Simpson & Co.</span>
          </Link>
          <nav
            className="main-nav flex items-center gap-1 overflow-x-auto"
            role="navigation"
            aria-label="Main"
            style={{ minWidth: 0 }}
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 whitespace-nowrap text-xs uppercase tracking-wider rounded-full transition-colors shrink-0",
                  pathname === item.href
                    ? "bg-accent text-white"
                    : "text-muted hover:text-ink hover:bg-accent-soft",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <KeySettings />
        </div>
      </header>
    </>
  );
}

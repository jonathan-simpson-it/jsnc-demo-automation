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
            aria-label="Jonathan Simpson and Co., home"
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
            className="main-nav flex items-stretch self-stretch gap-0.5 overflow-x-auto"
            role="navigation"
            aria-label="Main"
            style={{ minWidth: 0 }}
          >
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center px-3.5 whitespace-nowrap text-xs uppercase tracking-wider transition-colors shrink-0",
                    active ? "text-ink" : "text-muted hover:text-accent",
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2.5 bottom-0 h-0.5",
                      active ? "bg-accent" : "bg-transparent",
                    )}
                  />
                </Link>
              );
            })}
          </nav>
          <KeySettings />
        </div>
      </header>
    </>
  );
}

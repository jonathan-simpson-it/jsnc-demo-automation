"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { KeySettings } from "@/components/KeySettings";
import { siteConfig } from "@/content/site";

const TOOL_NAV = [
  { label: "Chat", href: "/chat" },
  { label: "Documents", href: "/documents" },
  { label: "Eval", href: "/eval" },
  { label: "Summary", href: "/summary" },
  { label: "Config", href: "/config" },
];

function isMarketingPath(pathname: string): boolean {
  return siteConfig.marketingPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function Header() {
  const pathname = usePathname();
  const marketing = isMarketingPath(pathname ?? "");
  const NAV = marketing ? siteConfig.marketingNavigation : TOOL_NAV;
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="site-header border-b border-line bg-surface">
        <div className="container flex items-center justify-between h-14 gap-2">
          <Link href="/" className="flex items-center gap-3 shrink-0 -ml-2" aria-label="Jonathan Simpson and Co., home">
            <img src="/jsco-logo.png" alt="" width={30} height={30} className="rounded-sm" style={{ objectFit: "cover" }} />
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap hidden sm:inline" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Jonathan Simpson & Co.
            </span>
          </Link>
          <nav className="main-nav flex items-stretch self-stretch gap-0.5 overflow-x-auto" role="navigation" aria-label="Main" style={{ minWidth: 0 }}>
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : (pathname ?? "").startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center px-3.5 whitespace-nowrap text-xs uppercase tracking-wider transition-colors shrink-0",
                    active ? "text-ink" : "text-muted hover:text-accent",
                  )}
                >
                  {item.label}
                  <span aria-hidden="true" className={cn("absolute inset-x-2.5 bottom-0 h-0.5", active ? "bg-accent" : "bg-transparent")} />
                </Link>
              );
            })}
          </nav>
          {!marketing && <KeySettings />}
          {marketing && (
            <Link href="/chat"
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface px-3.5 text-xs font-semibold uppercase tracking-wider text-ink transition hover:border-accent hover:text-accent"
            >
              Live demo
            </Link>
          )}
        </div>
      </header>
    </>
  );
}

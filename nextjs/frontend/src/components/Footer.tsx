"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/content/site";

function isMarketingPath(pathname: string): boolean {
  return siteConfig.marketingPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function Footer() {
  const pathname = usePathname();
  const marketing = isMarketingPath(pathname ?? "");
  if (pathname?.startsWith("/documents")) return null;
  const columns = marketing
    ? {
        tagline: siteConfig.brandTagline,
        connect: [{ label: "LinkedIn", href: "https://www.linkedin.com/company/jonathan-simpson-co" }],
        read: [
          { label: "Blog", href: "/blog" },
          { label: "Case studies", href: "/work" },
          { label: "Products", href: "/products" },
          { label: "Applications", href: "/applications" },
        ],
        help: [{ label: "Support & FAQ", href: "/support" }],
        start: { label: "Start a project", href: "/contact" },
      }
    : {
        tagline: "Digital Strategy & Engineering",
        connect: [{ label: "LinkedIn", href: "https://www.linkedin.com/company/jonathan-simpson-co" }],
        read: [
          { label: "Platform", href: "/" },
          { label: "AI Chat", href: "/chat" },
          { label: "Eval Dashboard", href: "/eval" },
          { label: "Mailbox", href: "/mailbox" },
        ],
        help: [
          { label: "Configuration", href: "/config" },
          { label: "Documents", href: "/documents" },
        ],
        start: { label: "Start a query", href: "/chat" },
      };
  return (
    <footer className="site-footer border-t border-line mt-auto">
      <div className="container footer-inner">
        <div>
          <p className="footer-brand-large">Jonathan<br />Simpson &amp; Co.</p>
          <p className="text-muted" style={{ fontSize: "0.88rem" }}>{columns.tagline}</p>
        </div>
        <div>
          <p className="footer-heading">Connect</p>
          <ul className="footer-links">
            {columns.connect.map((l) => (
              <li key={l.label}>
                <Link href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="footer-heading">Read</p>
          <ul className="footer-links">
            {columns.read.map((l) => (
              <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="footer-heading">Help</p>
          <ul className="footer-links">
            {columns.help.map((l) => (
              <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="footer-heading">Start</p>
          <Link href={columns.start.href} className="button button--ghost button--small">
            {columns.start.label}
          </Link>
        </div>
      </div>
      <div className="container footer-meta">
        <p>&copy; {new Date().getFullYear()} Jonathan Simpson &amp; Co. All rights reserved.</p>
      </div>
    </footer>
  );
}

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer border-t border-line mt-auto">
      <div className="container footer-inner">
        {/* Brand — 2fr */}
        <div>
          <p className="footer-brand-large">
            Jonathan
            <br />
            Simpson &amp; Co.
          </p>
          <p className="text-muted" style={{ fontSize: "0.88rem" }}>
            Digital Strategy &amp; Engineering
          </p>
        </div>

        {/* Connect — 1fr */}
        <div>
          <p className="footer-heading">Connect</p>
          <ul className="footer-links">
            <li>
              <Link
                href="https://www.linkedin.com/company/jonathan-simpson-co"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </Link>
            </li>
          </ul>
        </div>

        {/* Read — 1fr */}
        <div>
          <p className="footer-heading">Read</p>
          <ul className="footer-links">
            <li>
              <Link href="/">Platform</Link>
            </li>
            <li>
              <Link href="/chat">AI Chat</Link>
            </li>
            <li>
              <Link href="/eval">Eval Dashboard</Link>
            </li>
          </ul>
        </div>

        {/* Help — 1fr */}
        <div>
          <p className="footer-heading">Help</p>
          <ul className="footer-links">
            <li>
              <Link href="/config">Configuration</Link>
            </li>
            <li>
              <Link href="/documents">Documents</Link>
            </li>
          </ul>
        </div>

        {/* Start — 1fr */}
        <div>
          <p className="footer-heading">Start</p>
          <Link
            href="/chat"
            className="button button--ghost button--small"
          >
            Start a query
          </Link>
        </div>
      </div>

      <div className="container footer-meta">
        <p>
          &copy; {new Date().getFullYear()} Jonathan Simpson &amp; Co. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}

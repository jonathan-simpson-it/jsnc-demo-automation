import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line mt-auto">
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-serif text-lg text-ink">
              Jonathan Simpson & Co.
            </p>
            <p className="text-xs text-muted mt-1">
              Digital Strategy & Engineering
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted">
            <Link href="/" className="hover:text-accent transition-colors">
              Platform
            </Link>
            <Link
              href="https://www.linkedin.com/company/jonathan-simpson-co"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              LinkedIn
            </Link>
          </div>
        </div>
        <div className="border-t border-line mt-6 pt-4">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Jonathan Simpson & Co. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

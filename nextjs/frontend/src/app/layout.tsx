import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ApiKeyProvider } from "@/components/ApiKeyProvider";
import { siteConfig } from "@/content/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://jonathansimpson.co",
  ),
  title: "Jonathan Simpson & Co. | Private Markets AI Platform",
  description:
    "AI-powered Private Equity workflow automation with RAG and multi-agent systems",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.brandName,
  url: siteConfig.siteUrl,
  description: siteConfig.siteDescription,
  sameAs: siteConfig.socialLinks.map((l) => l.href),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ApiKeyProvider>
          <Header />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
        </ApiKeyProvider>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </body>
    </html>
  );
}

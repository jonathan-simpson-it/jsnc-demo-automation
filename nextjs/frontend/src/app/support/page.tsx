import type { Metadata } from "next";
import SectionIntro from "@/components/marketing/SectionIntro";
import SupportFaq from "@/components/marketing/SupportFaq";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "Support & FAQ — Jonathan Simpson & Co.",
  description: "Frequently asked questions.",
};

export default function SupportPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: siteConfig.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <div className="marketing-page">
      <section className="section">
        <div className="container">
          <SectionIntro eyebrow="Support" title="Frequently asked questions" />
          <SupportFaq faqs={siteConfig.faqs} />
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}

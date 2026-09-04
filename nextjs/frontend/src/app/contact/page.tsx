import type { Metadata } from "next";
import SectionIntro from "@/components/marketing/SectionIntro";
import ContactForm from "@/components/marketing/ContactForm";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact — Jonathan Simpson & Co.",
  description: "Start a project with Jonathan Simpson & Co.",
};

export default function ContactPage() {
  return (
    <div className="marketing-page">
      <section className="section">
        <div className="container">
          <SectionIntro
            eyebrow="Contact"
            title="Start a project"
            description="Tell us about your challenge. We'll respond within one business day."
          />
          <div className="grid-contact">
            <div>
              <ContactForm />
            </div>
            <div>
              <div className="panel-card" style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 1rem" }}>Get in touch</h3>
                <p style={{ margin: "0 0 1.5rem" }}>{siteConfig.contactInfo.region}</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  <li style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--color-line)", color: "var(--color-muted)" }}>
                    <strong style={{ color: "var(--color-ink)" }}>Email</strong>
                    <br />
                    {siteConfig.contactInfo.email}
                  </li>
                  <li style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--color-line)", color: "var(--color-muted)" }}>
                    <strong style={{ color: "var(--color-ink)" }}>LinkedIn</strong>
                    <br />
                    <a href={siteConfig.socialLinks[0].href} target="_blank" rel="noopener noreferrer">
                      {siteConfig.socialLinks[0].label}
                    </a>
                  </li>
                  <li style={{ padding: "0.5rem 0", color: "var(--color-muted)" }}>
                    <strong style={{ color: "var(--color-ink)" }}>Response time</strong>
                    <br />
                    Within 1 business day
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

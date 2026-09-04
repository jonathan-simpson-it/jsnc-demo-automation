/** Marketing site data, ported verbatim from the Astro site's data module
    (siteConfig) and page arrays on 2026-09-04 (Astro removed). */

export interface NavItem {
  label: string;
  href: string;
}
export interface Blurb {
  title: string;
  description: string;
  tags: string[];
}
export interface Product extends Blurb {
  status: string;
}
export interface Faq {
  q: string;
  a: string;
}

export const siteConfig = {
  brandName: "Jonathan Simpson & Co.",
  brandTagline:
    "We build digital systems that move money, manage risk, and scale operations for growth-stage companies.",
  siteTitle: "Jonathan Simpson & Co. — Digital Strategy & Engineering",
  siteDescription: "Strategy, design, and engineering for companies that move money.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://jonathansimpson.co",
  // Marketing nav shown in the header while browsing marketing routes.
  marketingNavigation: [
    { label: "Services", href: "/services" },
    { label: "Work", href: "/work" },
    { label: "Blog", href: "/blog" },
    { label: "Products", href: "/products" },
    { label: "Applications", href: "/applications" },
    { label: "Contact", href: "/contact" },
  ],
  // Marketing routes — used by Header/Footer/sitemap to decide context.
  marketingPaths: [
    "/services",
    "/work",
    "/blog",
    "/products",
    "/applications",
    "/contact",
    "/support",
  ],
  socialLinks: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/jonathan-simpson-co" },
  ],
  services: [
    {
      phase: "01",
      title: "Strategy & Architecture",
      description:
        "We audit your existing systems, map workflows, and design technology that fits your operations.",
      details: [
        "Current-state technology audit",
        "Workflow mapping and bottleneck analysis",
        "Technology selection and architecture design",
        "Implementation roadmap with milestones",
      ],
      tags: ["Discovery", "Architecture", "Roadmap"],
    },
    {
      phase: "02",
      title: "Design & Build",
      description: "From wireframe to production. We design interfaces your team will actually use.",
      details: [
        "UI/UX design with user research",
        "Full-stack development (Python, TypeScript, React)",
        "API design and integration",
        "Automated testing and CI/CD",
      ],
      tags: ["UI/UX", "Full-Stack", "APIs"],
    },
    {
      phase: "03",
      title: "Deploy & Iterate",
      description: "CI/CD pipelines, monitoring, training. We don't hand off and disappear.",
      details: [
        "Cloud infrastructure setup (AWS, GCP, Azure)",
        "CI/CD pipeline configuration",
        "Team training and documentation",
        "Ongoing support and iteration",
      ],
      tags: ["DevOps", "Training", "Support"],
    },
  ],
  capabilities: [
    {
      title: "Private Equity Workflow Automation",
      description:
        "Term-sheet analysis, covenant monitoring, LP reporting — retrieval-grounded AI that your team actually trusts.",
      tags: ["RAG", "Multi-Agent", "Grounded Answers"],
    },
    {
      title: "Regulatory Compliance Systems",
      description:
        "SFC, HKMA and AMLO-aware compliance built into your tools — with audit trails, explainability exports, and human review.",
      tags: ["Audit", "Explainability", "Human Review"],
    },
    {
      title: "Financial Operations Platforms",
      description: "Cash flow forecasting, multi-currency handling, document management.",
      tags: ["Forecasting", "Multi-Currency", "Documents"],
    },
    {
      title: "Data Engineering & Analytics",
      description: "From raw data to decision-ready dashboards.",
      tags: ["Pipelines", "Warehousing", "Dashboards"],
    },
  ],
  processSteps: [
    { number: "01", title: "Discovery", description: "Audit existing systems, understand workflows, identify bottlenecks." },
    { number: "02", title: "Strategy", description: "Define success metrics, choose technology, plan architecture." },
    { number: "03", title: "Design", description: "Wireframe → high-fidelity mockup → prototype. Iterative, client-reviewed." },
    { number: "04", title: "Build", description: "Production-grade code, CI/CD pipelines, automated testing." },
    { number: "05", title: "Launch & Iterate", description: "Deploy, monitor, train team, continuous improvement." },
  ],
  products: [
    {
      title: "PE AI Engineering Platform",
      description:
        "A production-grade AI workspace for private-equity firms: retrieval-grounded answers, human review, and a tamper-evident audit trail. A live demo ships with every engagement.",
      tags: ["Live demo", "Multi-agent", "Audit-ready"],
      status: "In Production",
    },
    {
      title: "Compliance Toolkit",
      description:
        "Compliance infrastructure your regulators expect: immutable audit trails, PII redaction, explainability exports, and jurisdiction-aware checks — SFC, HKMA and AMLO first.",
      tags: ["Audit Trail", "PII Redaction", "SFC · HKMA · AMLO"],
      status: "In Production",
    },
    {
      title: "Financial Operations Suite",
      description:
        "Covenant monitoring, cash-flow forecasting, and multi-currency handling — the operational layer behind the numbers.",
      tags: ["Forecasting", "Multi-Currency", "Monitoring"],
      status: "Beta",
    },
  ],
  applications: [
    { title: "AI Chat Interface", description: "Natural-language analysis of your documents with cited, reviewable answers.", tags: ["SSE Streaming", "Multi-Agent", "Real-time"] },
    { title: "Document Manager", description: "Upload, manage, and browse the knowledge base.", tags: ["Drag & Drop", "Auto-Summary", "Version Control"] },
    { title: "Eval Dashboard", description: "View accuracy metrics across 180 test questions.", tags: ["180 Questions", "Per-Doc Metrics", "Pipeline Trace"] },
    { title: "Pipeline Inspector", description: "Transparent breakdown: agent routing, execution path, per-node timing.", tags: ["Confidence", "Citations", "Timing"] },
  ],
  faqs: [
    { q: "What types of financial institutions do you work with?", a: "We work with growth-stage financial institutions including mid-market PE firms, regional banks, fund administrators, and licensed corporations across Hong Kong, Singapore, and London." },
    { q: "How long does a typical engagement take?", a: "Most projects run 8-16 weeks from discovery to production deployment." },
    { q: "Do you work with existing technology stacks?", a: "Yes. We audit your current systems and design solutions that integrate with what you already have." },
    { q: "What about data security and compliance?", a: "Every system we build includes audit trails, PII redaction, RBAC, and compliance controls as first-class features." },
    { q: "Can you support systems after launch?", a: "Yes. We offer ongoing support and iteration contracts." },
    { q: "What technologies do you use?", a: "Python (LangGraph, LangChain, FastAPI), TypeScript (Next.js, React), ChromaDB, DeepSeek API, and cloud platforms." },
  ],
  contactInfo: {
    email: "hello@jonathansimpson.co",
    region: "We work with growth-stage financial institutions across Hong Kong, Singapore, and London.",
  },
  cta: {
    headline: "Ready to eliminate operational friction?",
    description: "We help financial institutions automate the workflows that slow them down.",
    buttonText: "Start a project",
    buttonHref: "/contact",
  },
  seo: {
    defaultTitle: "Jonathan Simpson & Co. — Digital Strategy & Engineering",
    defaultDescription: "Strategy, design, and engineering for companies that move money.",
  },
} as const;

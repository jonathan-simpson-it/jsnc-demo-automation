export interface NavItem { label: string; href: string; }
export interface Service { title: string; description: string; tags: string[]; }
export interface Capability { title: string; description: string; tags: string[]; }
export interface TeamMember { name: string; role: string; bio?: string; }
export interface SocialLink { label: string; href: string; }

export const siteConfig = {
  brandName: "Jonathan Simpson & Co.",
  brandTagline: "We build digital systems that move money, manage risk, and scale operations for growth-stage companies.",
  siteTitle: "Jonathan Simpson & Co. — Digital Strategy & Engineering",
  siteDescription: "Strategy, design, and engineering for companies that move money.",
  siteUrl: "https://jonathansimpson.co",
  navigation: [
    { label: "Services", href: "/services/" },
    { label: "Work", href: "/work/" },
    { label: "Blog", href: "/blog/" },
    { label: "Products", href: "/products/" },
    { label: "Applications", href: "/applications/" },
    { label: "Contact", href: "/contact/" },
  ],
  socialLinks: [{ label: "LinkedIn", href: "https://www.linkedin.com/company/jonathan-simpson-co" }],
  services: [
    { title: "Strategy & Architecture", description: "We audit your existing systems, map workflows, and design technology that fits your operations.", tags: ["Discovery", "Architecture", "Roadmap"] },
    { title: "Design & Build", description: "From wireframe to production. We design interfaces your team will actually use.", tags: ["UI/UX", "Full-Stack", "APIs"] },
    { title: "Deploy & Iterate", description: "CI/CD pipelines, monitoring, training. We don't hand off and disappear.", tags: ["DevOps", "Training", "Support"] },
  ],
  capabilities: [
    { title: "Private Equity Workflow Automation", description: "Term sheet analysis, covenant monitoring, LP reporting.", tags: ["RAG", "Multi-Agent", "LangGraph"] },
    { title: "Regulatory Compliance Systems", description: "HKMA, SFC, AMLO compliance built into your tools.", tags: ["Audit", "RBAC", "Redaction"] },
    { title: "Financial Operations Platforms", description: "Cash flow forecasting, multi-currency handling, document management.", tags: ["Forecasting", "Multi-Currency", "Documents"] },
    { title: "Data Engineering & Analytics", description: "From raw data to decision-ready dashboards.", tags: ["Pipelines", "Warehousing", "Dashboards"] },
  ],
  team: [{ name: "Jonathan Simpson", role: "Founder", bio: "15+ years building technology for financial institutions." }],
  cta: {
    headline: "Ready to eliminate operational friction?",
    description: "We help financial institutions automate the workflows that slow them down.",
    buttonText: "Start a project",
    buttonHref: "/contact/",
  },
  seo: {
    defaultTitle: "Jonathan Simpson & Co. — Digital Strategy & Engineering",
    defaultDescription: "Strategy, design, and engineering for companies that move money.",
    ogImage: "/og-image.png",
  },
};

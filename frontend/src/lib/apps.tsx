import type { ReactNode } from "react";

export type AppCategory =
  | "Applications"
  | "Specialist Agents"
  | "Workbenches"
  | "Compliance & Risk"
  | "Operations"
  | "Developer";

export interface LaunchpadApp {
  key: string;
  name: string;
  description: string;
  href: string;
  category: AppCategory;
  icon: ReactNode;
}

const CATEGORY_ORDER: AppCategory[] = [
  "Applications",
  "Workbenches",
  "Compliance & Risk",
  "Operations",
  "Developer",
  "Specialist Agents",
];

export const LAUNCHPAD_APPS: LaunchpadApp[] = [
  {
    key: "chat",
    href: "/chat",
    name: "AI Chat",
    category: "Applications",
    description:
      "Grounded, cited answers across your workspace, with pipeline transparency and saved history.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6h20v14H14l-6 5v-5H6z" />
        <line x1="11" y1="11" x2="21" y2="11" />
        <line x1="11" y1="15" x2="17" y2="15" />
      </svg>
    ),
  },
  {
    key: "documents",
    href: "/documents",
    name: "Documents",
    category: "Applications",
    description:
      "Upload, tag, and assign documents to clients and projects. This is the knowledge base behind every answer.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3h9l6 6v18a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <polyline points="19 3 19 9 25 9" />
        <line x1="12" y1="15" x2="21" y2="15" />
        <line x1="12" y1="19" x2="21" y2="19" />
        <line x1="12" y1="23" x2="17" y2="23" />
      </svg>
    ),
  },
  {
    key: "eval",
    href: "/eval",
    name: "Eval Dashboard",
    category: "Applications",
    description:
      "Question-level accuracy metrics with a per-document breakdown, so you can show the system earns your trust.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="26" x2="27" y2="26" />
        <rect x="8" y="15" width="4" height="11" rx="1" />
        <rect x="14" y="9" width="4" height="17" rx="1" />
        <rect x="20" y="5" width="4" height="21" rx="1" />
      </svg>
    ),
  },
  {
    key: "email",
    href: "/mailbox",
    name: "Email Reports",
    category: "Applications",
    description:
      "Weekly or monthly email-ready reports drawn from the tamper-evident audit trail.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="7" width="24" height="18" rx="2" />
        <polyline points="4,9 16,17 28,9" />
      </svg>
    ),
  },
  {
    key: "config",
    href: "/config",
    name: "System Config",
    category: "Applications",
    description:
      "System status, active features, and registered agent types. Full observability.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="3" />
        <path d="M16 4v4M16 24v4M4 16h4M24 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3" />
      </svg>
    ),
  },
  {
    key: "due_diligence",
    href: "/chat?agent=due_diligence",
    name: "Due Diligence Agent",
    category: "Specialist Agents",
    description:
      "Analyse investment opportunities and surface the risks a senior analyst would catch.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14" cy="14" r="8" />
        <line x1="20" y1="20" x2="28" y2="28" />
        <line x1="11" y1="14" x2="17" y2="14" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
  },
  {
    key: "term_sheet",
    href: "/chat?agent=term_sheet",
    name: "Term Sheet Extractor",
    category: "Specialist Agents",
    description:
      "Extract structured term-sheet data in seconds, not spreadsheets.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="20" height="24" rx="2" />
        <line x1="10" y1="10" x2="22" y2="10" />
        <line x1="10" y1="15" x2="22" y2="15" />
        <line x1="10" y1="20" x2="18" y2="20" />
      </svg>
    ),
  },
  {
    key: "lp_report",
    href: "/chat?agent=lp_report",
    name: "LP Report Generator",
    category: "Specialist Agents",
    description:
      "Quarterly LP reports drafted from the documents you already hold.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="18" width="6" height="10" rx="1" />
        <rect x="13" y="12" width="6" height="16" rx="1" />
        <rect x="22" y="6" width="6" height="22" rx="1" />
        <line x1="4" y1="4" x2="28" y2="4" />
      </svg>
    ),
  },
  {
    key: "compliance",
    href: "/chat?agent=compliance",
    name: "Compliance Checker",
    category: "Specialist Agents",
    description:
      "Regulatory compliance checks grounded in the knowledge base: SFC, HKMA and AMLO-aware.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3 L28 9 L28 17 C28 23 22 28 16 30 C10 28 4 23 4 17 L4 9 Z" />
        <polyline points="11,16 14,19 21,12" />
      </svg>
    ),
  },
  {
    key: "cross_doc",
    href: "/chat?agent=cross_doc",
    name: "Cross-Document Comparison",
    category: "Specialist Agents",
    description:
      "Compare and synthesise across documents to find the differences that change a deal.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="12" height="16" rx="2" />
        <rect x="17" y="6" width="12" height="16" rx="2" />
        <line x1="6" y1="11" x2="12" y2="11" />
        <line x1="6" y1="15" x2="12" y2="15" />
        <line x1="20" y1="11" x2="26" y2="11" />
        <line x1="20" y1="15" x2="26" y2="15" />
        <path d="M15 12 L17 12" strokeDasharray="2 2" />
        <path d="M15 16 L17 16" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    key: "term_sheet_workbench",
    href: "/workbench/term-sheet",
    name: "Term Sheet Workbench",
    category: "Workbenches",
    description:
      "Extract and analyse term sheets with a guided, reviewable workflow.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="20" height="24" rx="2" />
        <line x1="10" y1="10" x2="22" y2="10" />
        <line x1="10" y1="15" x2="22" y2="15" />
        <line x1="10" y1="20" x2="18" y2="20" />
      </svg>
    ),
  },
  {
    key: "lp_report_workbench",
    href: "/workbench/lp-report",
    name: "LP Report Workbench",
    category: "Workbenches",
    description:
      "Draft quarterly LP reports and investor narratives from uploaded documents.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="18" width="6" height="10" rx="1" />
        <rect x="13" y="12" width="6" height="16" rx="1" />
        <rect x="22" y="6" width="6" height="22" rx="1" />
        <line x1="4" y1="4" x2="28" y2="4" />
      </svg>
    ),
  },
  {
    key: "compliance_audit",
    href: "/workbench/compliance-audit",
    name: "Compliance Auditor",
    category: "Compliance & Risk",
    description:
      "Audit documents against SFC, HKMA and AMLO expectations with cited findings and corrective actions.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3 L28 9 L28 17 C28 23 22 28 16 30 C10 28 4 23 4 17 L4 9 Z" />
        <polyline points="11,16 14,19 21,12" />
      </svg>
    ),
  },
  {
    key: "review_hub",
    href: "/review-hub",
    name: "Review Hub",
    category: "Compliance & Risk",
    description:
      "Approve, edit, or reject AI answers before anything is delivered. Humans stay in the loop.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 26h20" />
        <path d="M8 26V10l8-6 8 6v16" />
        <path d="M12 14h8M12 18h8M12 22h4" />
      </svg>
    ),
  },
  {
    key: "filing_cabinet",
    href: "/workbench/filing-cabinet",
    name: "Filing Cabinet",
    category: "Operations",
    description:
      "Ingest and route target-company files into the right project workspaces.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h8l2 2h10a2 2 0 0 1 2 2v14H4V6z" />
        <line x1="4" y1="20" x2="28" y2="20" />
      </svg>
    ),
  },
  {
    key: "telemetry",
    href: "/telemetry",
    name: "Pipeline & Cost",
    category: "Developer",
    description: "Live pipeline traces, token usage, and DeepSeek cost analytics.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 14 10 14 13 7 19 23 22 16 28 16" />
        <line x1="4" y1="28" x2="28" y2="28" />
      </svg>
    ),
  },
  {
    key: "radar",
    href: "/radar",
    name: "Regulatory Radar",
    category: "Compliance & Risk",
    description:
      "Live SFC and HKMA circulars with recency-weighted retrieval, grounded in today's guidance.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="12" />
        <circle cx="16" cy="16" r="6" />
        <line x1="16" y1="16" x2="26" y2="6" />
        <line x1="16" y1="16" x2="16" y2="4" />
      </svg>
    ),
  },
];

export function appsByCategory(): [AppCategory, LaunchpadApp[]][] {
  const grouped = new Map<AppCategory, LaunchpadApp[]>();
  for (const app of LAUNCHPAD_APPS) {
    const list = grouped.get(app.category);
    if (list) {
      list.push(app);
    } else {
      grouped.set(app.category, [app]);
    }
  }
  const result: [AppCategory, LaunchpadApp[]][] = [];
  for (const category of CATEGORY_ORDER) {
    const apps = grouped.get(category);
    if (apps) {
      result.push([category, apps]);
    }
  }
  return result;
}

export interface DueDiligenceResult {
  summary: string;
  risks: string[];
  opportunities: string[];
  recommendation: string;
  confidence_score: number;
}

export interface TermSheetData {
  company_name: string;
  round_type: string;
  pre_money_valuation: number;
  investment_amount: number;
  liquidation_preference: string;
  anti_dilution: string;
  board_seats: string;
  price_per_share: string;
  shares_issued: string;
  esop_pool: string;
  esop_refresh: string;
  founder_ownership_post: string;
  protective_provisions: string[];
  information_rights: string[];
  exclusivity: string;
  governing_law: string;
  dispute_resolution: string;
  key_person_insurance: string;
  lead_investor: string;
  key_terms: Record<string, string>;
}

export interface LPReport {
  quarter: string;
  portfolio_highlights: string[];
  financial_summary: Record<string, string | number>;
  risk_factors: string[];
}

export interface ComplianceCheck {
  document_name: string;
  compliant: boolean;
  issues: string[];
  jurisdiction: string;
  regulations_checked: string[];
}

export interface CrossDocComparison {
  query: string;
  synthesis: string;
  documents_compared: string[];
  key_differences: string[];
  key_similarities: string[];
}

export interface AgentQuery {
  query: string;
  agent_type?: string | null;
  conversation_history?: { role: string; content: string }[];
}

export interface AgentResponse {
  agent_type: string;
  result: string;
  metadata: Record<string, unknown>;
  citations: string[];
  confidence_score: number;
}

export interface AgentInfo {
  type: string;
  name: string;
  description: string;
}

export interface DocumentInfo {
  id?: number;
  filename: string;
  collection: string;
  chunks: number;
  summary: string;
  doc_type?: string;
  client_id?: number | null;
  project_id?: number | null;
  client_name?: string | null;
  project_name?: string | null;
  source?: string;
  tags?: Tag[];
}

export interface DocumentStats {
  total_documents: number;
  collection_name: string;
  documents: DocumentInfo[];
}

export interface UploadResult {
  id?: number;
  filename: string;
  size: number;
  status: string;
  chunks_ingested: number;
}

export interface EvalQuestion {
  id: number;
  query: string;
  question?: string;
  doc: string;
  expected: string;
  actual?: string;
  pass?: boolean;
  passed?: boolean;
  latency_ms?: number;
  trace?: TraceEntry[];
}

export interface EvalMeta {
  questions: number;
  passed: number;
  pct: number;
  timestamp: string;
  avg_ms_per_question?: number;
  avg_latency_ms?: number;
  llm_node_calls?: number;
  node_usage?: Record<string, number>;
}

export interface EvalResults {
  meta: EvalMeta;
  questions: EvalQuestion[];
  error?: string;
}

export interface SummaryResponse {
  period: string;
  period_label: string;
  since: string;
  total_queries: number;
  avg_confidence: number;
  agent_breakdown: { agent: string; count: number; pct: number }[];
  user_activity: { user: string; queries: number }[];
  top_queries: {
    query: string;
    agent: string;
    confidence: number | null;
    timestamp: string;
  }[];
  email_markdown: string;
}

export interface HealthStatus {
  status: string;
  version: string;
}

export interface TraceEntry {
  node: string;
  ms: number;
}

export interface StreamEvent {
  node?: string;
  update?: { trace?: TraceEntry[]; [key: string]: unknown };
  done?: boolean;
  response?: AgentResponse;
}

/* ---- New: Clients, Projects, Tags, OneDrive ---- */

export interface Client {
  id: number;
  name: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  client_id: number | null;
  client_name: string | null;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface OneDriveFile {
  id: string;
  name: string;
  is_folder: boolean;
  size: number;
  path: string;
  last_modified: string;
  mime_type: string;
}

export interface OneDriveStatus {
  connected: boolean;
  user_email: string | null;
}

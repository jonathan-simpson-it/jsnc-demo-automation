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
  conversation_id?: number | null;
  /** Exact document filenames resolved from @-mentions; the backend intersects
      them with the conversation's project scope (never crosses projects). */
  tagged_filenames?: string[];
}

export interface AgentResponse {
  agent_type: string;
  result: string;
  metadata: Record<string, unknown>;
  citations: string[];
  confidence_score: number;
}

export interface Conversation {
  id: number;
  project_id: number | null;
  title: string;
  message_count: number;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  agent_type: string | null;
  citations: string[];
  trace: TraceEntry[];
  confidence: number | null;
  is_error: boolean;
  created_at: string | null;
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
  created_at?: string | null;
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

export interface ReindexResult {
  id: number;
  filename: string;
  chunks_ingested: number;
  status: string;
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
  server_key_configured: boolean;
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

export interface ReviewItem {
  id: number;
  conversation_id: number | null;
  query: string;
  draft_answer: string;
  agent_type: string | null;
  citations: string[];
  trace: TraceEntry[];
  confidence: number | null;
  reason: string;
  status: "pending" | "approved" | "edited" | "rejected";
  edited_answer: string | null;
  created_at: string;
  updated_at: string;
}

/* ---- Telemetry ---- */

export interface TelemetryRun {
  ts: number;
  query: string;
  agent_type: string;
  routing_method: string | null;
  confidence: number;
  trace: TraceEntry[];
  total_ms: number;
  error: boolean;
  cost: number;
}
export interface CostSummary {
  calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  by_node: Record<string, { calls: number; tokens: number; cost: number }>;
}

/* ---- Regulatory ---- */

export interface RegulatoryFeedItem {
  id: number;
  source_key: string;
  external_id: string;
  regulator: string;
  kind: string;
  title: string;
  url: string;
  issued_at: string | null;
  fetched_at: string;
  summary: string;
  chunks: number;
  status: string;
}

export interface RegulatoryState {
  last_run: string | null;
  last_status: string;
  last_error: string | null;
  running: boolean;
}

export interface GraphEmail {
  id: string;
  subject: string;
  from: string;
  from_email: string;
  received_at: string | null;
  body_preview: string;
  web_link: string;
}

export interface GraphMailStatus {
  configured: boolean;
  reason?: string;
  mailbox?: string;
}

export interface GraphDraftResult {
  id: string;
  subject: string;
  draft_link: string;
}

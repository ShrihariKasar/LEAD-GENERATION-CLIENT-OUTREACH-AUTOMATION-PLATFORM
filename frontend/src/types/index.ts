export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  company_name?: string;
  website?: string;
  industry?: string;
  company_description?: string;
  product_description?: string;
  target_geography?: string;
  target_company_size?: string;
  target_decision_makers?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  workspace?: Workspace;
}

export interface ICPProfile {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  target_industries: string[];
  target_company_sizes: string[];
  target_revenue_range: string[];
  target_geographies: string[];
  target_job_titles: string[];
  target_seniorities: string[];
  target_technologies: string[];
  business_signals: string[];
  negative_criteria: {
    excluded_industries?: string[];
    excluded_locations?: string[];
    excluded_titles?: string[];
    excluded_domains?: string[];
  };
  weights: {
    title: number;
    industry: number;
    company_size: number;
    geography: number;
    technology: number;
    business_signal: number;
  };
  min_qualification_score: number;
  auto_qualification_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface LeadEnrichment {
  id: string;
  lead_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  source: string;
  confidence: number;
  created_at: string;
}

export interface Lead {
  id: string;
  workspace_id: string;
  company_id?: string;
  icp_profile_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  job_title?: string;
  seniority?: string;
  email?: string;
  email_status: "VERIFIED" | "UNVERIFIED" | "CATCH_ALL" | "INVALID" | "UNKNOWN";
  phone?: string;
  linkedin_url?: string;
  telegram_identifier?: string;
  telegram_chat_id?: string;
  telegram_opt_in_status: "NOT_OPTED_IN" | "OPT_IN_PENDING" | "OPTED_IN" | "OPTED_OUT";
  telegram_deep_link_token?: string;
  company_name?: string;
  company_domain?: string;
  industry?: string;
  employee_count?: number;
  location?: string;
  country?: string;
  website?: string;
  source: string;
  source_record_id?: string;
  source_created_at?: string;
  last_enriched_at?: string;
  enrichment_confidence?: number;
  icp_score?: number;
  qualification_status: "UNQUALIFIED" | "POTENTIAL" | "QUALIFIED" | "NOT_QUALIFIED" | "NEEDS_HUMAN";
  lead_status: "NEW" | "RESEARCHING" | "CONTACTED" | "ENGAGED" | "QUALIFYING" | "QUALIFIED" | "MEETING_PENDING" | "MEETING_SCHEDULED" | "NURTURE" | "NOT_QUALIFIED" | "DO_NOT_CONTACT" | "CONVERTED" | "CLOSED";
  outreach_status: "IDLE" | "ENROLLED" | "ACTIVE" | "WAITING" | "REPLIED" | "PAUSED" | "OPTED_OUT" | "COMPLETED";
  buying_intent: "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";
  next_best_action?: string;
  ai_summary?: string;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface DecisionTraceItem {
  category: string;
  status: "MATCHED" | "FAILED" | "UNKNOWN";
  label: string;
  details?: string;
}

export interface DecisionTrace {
  lead_id: string;
  overall_score?: number;
  icp_name?: string;
  items: DecisionTraceItem[];
  explanation: string;
  recommendation: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: "PROSPECT" | "AI" | "HUMAN" | "SYSTEM";
  sender_id?: string;
  sender_name?: string;
  direction: "INBOUND" | "OUTBOUND";
  channel: string;
  content: string;
  delivery_status: string;
  error_details?: string;
  created_at: string;
}

export interface QualificationAnswer {
  id: string;
  conversation_id: string;
  lead_id: string;
  question_key: string;
  question_text: string;
  extracted_answer?: string;
  signal_type: string;
  confidence: number;
  status: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  lead_id: string;
  channel: string;
  state: "NEW" | "CONTACTED" | "AWAITING_RESPONSE" | "ENGAGED" | "DISCOVERY" | "QUALIFYING" | "QUALIFIED" | "POTENTIAL" | "NOT_QUALIFIED" | "MEETING_INTENT" | "MEETING_PROPOSED" | "MEETING_SCHEDULED" | "HUMAN_REVIEW" | "PAUSED" | "OPTED_OUT" | "CLOSED";
  ai_paused: boolean;
  human_assigned_to?: string;
  last_message_at?: string;
  last_intent?: string;
  context_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  messages: Message[];
  qualification_answers: QualificationAnswer[];
}

export interface SequenceStep {
  id?: string;
  step_number: number;
  channel: string;
  delay_hours: number;
  condition_rule: string;
  template_content: string;
}

export interface OutreachSequence {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: string;
  min_icp_score: number;
  stop_conditions: string[];
  steps: SequenceStep[];
  enrollments_count: number;
  active_count: number;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  workspace_id: string;
  lead_id: string;
  calendar_id: string;
  provider_event_id?: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  timezone: string;
  attendees: string[];
  meeting_link?: string;
  status: string;
  lead_name?: string;
  lead_email?: string;
  lead_company?: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  start_at: string;
  end_at: string;
  timezone: string;
  formatted: string;
}

export interface DiagnosticError {
  cause: string;
  action: string;
  technical_code: string;
  timestamp: string;
  raw_message?: string;
}

export interface Integration {
  id: string;
  workspace_id: string;
  provider: "OPENAI" | "APOLLO" | "HUNTER" | "TELEGRAM" | "GOOGLE_CALENDAR" | "LINKEDIN" | "HUBSPOT";
  status: "CONNECTED" | "NOT_CONNECTED" | "ERROR" | "RESTRICTED";
  authentication_type: string;
  scopes: string[];
  account_identifier?: string;
  health_status?: string;
  last_successful_request?: string;
  last_failed_request?: string;
  error_message?: string;
  error_code?: string;
  diagnostic?: DiagnosticError;
  created_at: string;
  updated_at: string;
}

export interface DashboardOverview {
  attention_items: {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
    entity_id?: string;
    timestamp: string;
  }[];
  conversations_needing_attention: number;
  qualified_leads_today: number;
  meetings_today: number;
  failed_automations_count: number;
  pending_integrations_count: number;
  total_leads: number;
  leads_by_stage: Record<string, number>;
  qualification_rate: number;
  meeting_conversion_rate: number;
  messages_sent_count: number;
  responses_received_count: number;
  response_rate: number;
  positive_response_rate: number;
  follow_ups_due_count: number;
  ai_conversations_count: number;
  human_handoff_count: number;
  average_ai_confidence: number;
  failed_ai_runs_count: number;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  actor_type: "USER" | "AI" | "SYSTEM" | "INTEGRATION" | "WEBHOOK";
  actor_id?: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  metadata_json: Record<string, any>;
  created_at: string;
}

export interface AIRun {
  id: string;
  workspace_id: string;
  lead_id?: string;
  conversation_id?: string;
  model: string;
  prompt_category: string;
  prompt_version: number;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms: number;
  success: boolean;
  error?: string;
  confidence?: number;
  structured_output?: Record<string, any>;
  created_at: string;
}

export interface SetupStatus {
  database_ready: boolean;
  redis_ready: boolean;
  workspace_configured: boolean;
  icp_configured: boolean;
  services: {
    name: string;
    provider_key: string;
    status: "CONNECTED" | "RESTRICTED" | "MISSING" | "ERROR";
    is_required: boolean;
    summary: string;
    details?: string;
    last_tested?: string;
    instructions: string;
  }[];
  ready_for_outreach: boolean;
}

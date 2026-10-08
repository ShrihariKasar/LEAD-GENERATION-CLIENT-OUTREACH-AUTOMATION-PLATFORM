from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- AUTH & USER SCHEMAS -----------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"
    workspace: Optional["WorkspaceResponse"] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    workspace_id: Optional[str] = None
    role: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    workspace_name: Optional[str] = "Primary Workspace"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ----------------- WORKSPACE SCHEMAS -----------------
class WorkspaceCreate(BaseModel):
    name: str
    company_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_description: Optional[str] = None
    product_description: Optional[str] = None
    target_geography: Optional[str] = None
    target_company_size: Optional[str] = None
    target_decision_makers: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_description: Optional[str] = None
    product_description: Optional[str] = None
    target_geography: Optional[str] = None
    target_company_size: Optional[str] = None
    target_decision_makers: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    company_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_description: Optional[str] = None
    product_description: Optional[str] = None
    target_geography: Optional[str] = None
    target_company_size: Optional[str] = None
    target_decision_makers: Optional[str] = None
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class WorkspaceMemberResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: str
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class MemberInviteRequest(BaseModel):
    email: EmailStr
    role: str = "SALES_REP"  # ADMIN, SALES_MANAGER, SALES_REP, VIEWER

# ----------------- ICP SCHEMAS -----------------
class ICPProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    target_industries: List[str] = []
    target_company_sizes: List[str] = []
    target_revenue_range: List[str] = []
    target_geographies: List[str] = []
    target_job_titles: List[str] = []
    target_seniorities: List[str] = []
    target_technologies: List[str] = []
    business_signals: List[str] = []
    negative_criteria: Dict[str, Any] = {
        "excluded_industries": [],
        "excluded_locations": [],
        "excluded_titles": [],
        "excluded_domains": []
    }
    weights: Dict[str, int] = {
        "title": 25,
        "industry": 20,
        "company_size": 15,
        "geography": 15,
        "technology": 15,
        "business_signal": 10
    }
    min_qualification_score: int = 65
    auto_qualification_threshold: int = 80

class ICPProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    target_industries: Optional[List[str]] = None
    target_company_sizes: Optional[List[str]] = None
    target_revenue_range: Optional[List[str]] = None
    target_geographies: Optional[List[str]] = None
    target_job_titles: Optional[List[str]] = None
    target_seniorities: Optional[List[str]] = None
    target_technologies: Optional[List[str]] = None
    business_signals: Optional[List[str]] = None
    negative_criteria: Optional[Dict[str, Any]] = None
    weights: Optional[Dict[str, int]] = None
    min_qualification_score: Optional[int] = None
    auto_qualification_threshold: Optional[int] = None

class ICPProfileResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    target_industries: List[str]
    target_company_sizes: List[str]
    target_revenue_range: List[str]
    target_geographies: List[str]
    target_job_titles: List[str]
    target_seniorities: List[str]
    target_technologies: List[str]
    business_signals: List[str]
    negative_criteria: Dict[str, Any]
    weights: Dict[str, int]
    min_qualification_score: int
    auto_qualification_threshold: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ----------------- COMPANY SCHEMAS -----------------
class CompanyCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    employee_range: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    technologies: List[str] = []
    description: Optional[str] = None
    linkedin_url: Optional[str] = None
    stage: str = "TARGET"

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    employee_range: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    technologies: Optional[List[str]] = None
    description: Optional[str] = None
    linkedin_url: Optional[str] = None
    stage: Optional[str] = None

class CompanyResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    domain: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    employee_range: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    technologies: List[str]
    description: Optional[str] = None
    linkedin_url: Optional[str] = None
    stage: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ----------------- LEAD & SCORING SCHEMAS -----------------
class LeadCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    seniority: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    telegram_identifier: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    location: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    source: str = "MANUAL"
    icp_profile_id: Optional[str] = None

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    seniority: Optional[str] = None
    email: Optional[str] = None
    email_status: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    telegram_identifier: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    location: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    qualification_status: Optional[str] = None
    lead_status: Optional[str] = None
    outreach_status: Optional[str] = None
    buying_intent: Optional[str] = None
    do_not_contact: Optional[bool] = None
    icp_profile_id: Optional[str] = None

class LeadScoreResponse(BaseModel):
    id: str
    lead_id: str
    icp_profile_id: str
    score: int
    confidence: float
    matched_criteria: List[str]
    failed_criteria: List[str]
    unknown_criteria: List[str]
    breakdown: Dict[str, Any]
    explanation: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class LeadEnrichmentResponse(BaseModel):
    id: str
    lead_id: str
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    source: str
    confidence: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class DecisionTraceItem(BaseModel):
    category: str
    status: str  # "MATCHED", "FAILED", "UNKNOWN"
    label: str
    details: Optional[str] = None

class DecisionTraceResponse(BaseModel):
    lead_id: str
    overall_score: Optional[int] = None
    icp_name: Optional[str] = None
    items: List[DecisionTraceItem] = []
    explanation: str
    recommendation: str

class NextBestActionResponse(BaseModel):
    lead_id: str
    action_type: str  # "WAIT_REPLY", "ASK_QUALIFICATION", "SEND_FOLLOW_UP", "HUMAN_REVIEW", "PROPOSE_SLOTS", "CONFIRM_MEETING", "DO_NOT_CONTACT", "ENROLL_SEQUENCE", "ENRICH_LEAD"
    title: str
    description: str
    urgency: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    channel: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None

class LeadResponse(BaseModel):
    id: str
    workspace_id: str
    company_id: Optional[str] = None
    icp_profile_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    seniority: Optional[str] = None
    email: Optional[str] = None
    email_status: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    telegram_identifier: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_opt_in_status: str
    telegram_deep_link_token: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    location: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    source: str
    source_record_id: Optional[str] = None
    source_created_at: Optional[datetime] = None
    last_enriched_at: Optional[datetime] = None
    enrichment_confidence: Optional[float] = None
    icp_score: Optional[int] = None
    qualification_status: str
    lead_status: str
    outreach_status: str
    buying_intent: str
    next_best_action: Optional[str] = None
    ai_summary: Optional[str] = None
    do_not_contact: bool
    created_at: datetime
    updated_at: datetime
    
    # Nested relations if populated
    latest_score: Optional[LeadScoreResponse] = None
    
    class Config:
        from_attributes = True

class LeadSearchParams(BaseModel):
    query: Optional[str] = None
    qualification_status: Optional[List[str]] = None
    lead_status: Optional[List[str]] = None
    outreach_status: Optional[List[str]] = None
    icp_profile_id: Optional[str] = None
    min_icp_score: Optional[int] = None
    source: Optional[str] = None
    limit: int = 50
    offset: int = 0
    sort_by: str = "created_at"
    sort_order: str = "desc"

class LeadDiscoveryRequest(BaseModel):
    icp_profile_id: Optional[str] = None
    source: str = "APOLLO"  # APOLLO, CSV, MANUAL
    job_titles: Optional[List[str]] = None
    seniorities: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    employee_ranges: Optional[List[str]] = None
    keywords: Optional[str] = None
    domain: Optional[str] = None
    limit: int = 10

class LeadBulkActionRequest(BaseModel):
    lead_ids: List[str]
    action: str  # "QUALIFY", "PAUSE", "ENROLL_SEQUENCE", "REMOVE_SEQUENCE", "MARK_DO_NOT_CONTACT", "DELETE"
    sequence_id: Optional[str] = None
    qualification_status: Optional[str] = None

# ----------------- CONVERSATION & MESSAGE SCHEMAS -----------------
class MessageCreate(BaseModel):
    content: str
    channel: Optional[str] = "TELEGRAM"

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_type: str
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    direction: str
    channel: str
    content: str
    raw_payload: Optional[Dict[str, Any]] = None
    external_message_id: Optional[str] = None
    delivery_status: str
    error_details: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class QualificationAnswerResponse(BaseModel):
    id: str
    conversation_id: str
    lead_id: str
    question_key: str
    question_text: str
    extracted_answer: Optional[str] = None
    signal_type: str
    confidence: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    workspace_id: str
    lead_id: str
    channel: str
    state: str
    ai_paused: bool
    human_assigned_to: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_intent: Optional[str] = None
    context_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    lead: Optional[LeadResponse] = None
    messages: List[MessageResponse] = []
    qualification_answers: List[QualificationAnswerResponse] = []
    
    class Config:
        from_attributes = True

class TelegramWebhookUpdate(BaseModel):
    update_id: int
    message: Optional[Dict[str, Any]] = None
    callback_query: Optional[Dict[str, Any]] = None

# ----------------- SEQUENCE SCHEMAS -----------------
class SequenceStepCreate(BaseModel):
    step_number: int
    channel: str = "TELEGRAM"  # TELEGRAM, EMAIL, LINKEDIN, MANUAL_TASK
    delay_hours: int = 24
    condition_rule: str = "IF_NO_REPLY"  # ALWAYS, IF_NO_REPLY
    template_content: str

class OutreachSequenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = False
    trigger_type: str = "MANUAL"
    min_icp_score: int = 70
    stop_conditions: List[str] = ["REPLIED", "MEETING_BOOKED", "OPTED_OUT", "HUMAN_TAKEOVER"]
    steps: List[SequenceStepCreate] = []

class OutreachSequenceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    trigger_type: Optional[str] = None
    min_icp_score: Optional[int] = None
    stop_conditions: Optional[List[str]] = None
    steps: Optional[List[SequenceStepCreate]] = None

class SequenceStepResponse(BaseModel):
    id: str
    sequence_id: str
    step_number: int
    channel: str
    delay_hours: int
    condition_rule: str
    template_content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SequenceEnrollmentResponse(BaseModel):
    id: str
    sequence_id: str
    lead_id: str
    current_step_number: int
    status: str
    next_execution_at: Optional[datetime] = None
    last_executed_at: Optional[datetime] = None
    termination_reason: Optional[str] = None
    lead_name: Optional[str] = None
    lead_company: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class OutreachSequenceResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    trigger_type: str
    min_icp_score: int
    stop_conditions: List[str]
    created_at: datetime
    updated_at: datetime
    steps: List[SequenceStepResponse] = []
    enrollments_count: int = 0
    active_count: int = 0
    
    class Config:
        from_attributes = True

# ----------------- MEETING & CALENDAR SCHEMAS -----------------
class AvailableSlot(BaseModel):
    start_at: datetime
    end_at: datetime
    timezone: str
    formatted: str

class AvailabilityRequest(BaseModel):
    duration_minutes: int = 30
    days_ahead: int = 7
    timezone: str = "UTC"

class MeetingCreateRequest(BaseModel):
    lead_id: str
    title: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    timezone: str = "UTC"
    attendees: List[str] = []

class MeetingResponse(BaseModel):
    id: str
    workspace_id: str
    lead_id: str
    calendar_id: str
    provider_event_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    timezone: str
    attendees: List[str]
    meeting_link: Optional[str] = None
    status: str
    lead_name: Optional[str] = None
    lead_email: Optional[str] = None
    lead_company: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ----------------- INTEGRATION SCHEMAS -----------------
class IntegrationConnectRequest(BaseModel):
    credentials: Dict[str, Any]
    account_identifier: Optional[str] = None

class DiagnosticError(BaseModel):
    cause: str
    action: str
    technical_code: str
    timestamp: datetime
    raw_message: Optional[str] = None

class IntegrationResponse(BaseModel):
    id: str
    workspace_id: str
    provider: str  # OPENAI, APOLLO, HUNTER, TELEGRAM, GOOGLE_CALENDAR, LINKEDIN, HUBSPOT
    status: str  # CONNECTED, NOT_CONNECTED, ERROR, RESTRICTED
    authentication_type: str
    scopes: List[str]
    account_identifier: Optional[str] = None
    health_status: Optional[str] = None
    last_successful_request: Optional[datetime] = None
    last_failed_request: Optional[datetime] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    diagnostic: Optional[DiagnosticError] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class IntegrationTestResponse(BaseModel):
    provider: str
    success: bool
    status: str
    message: str
    diagnostic: Optional[DiagnosticError] = None
    latency_ms: int

# ----------------- ANALYTICS & DASHBOARD SCHEMAS -----------------
class DashboardAttentionItem(BaseModel):
    id: str
    type: str  # "NEEDS_HUMAN", "MEETING_TODAY", "INTEGRATION_ERROR", "QUALIFIED_LEAD"
    title: str
    description: str
    severity: str
    entity_id: Optional[str] = None
    timestamp: datetime

class DashboardOverviewResponse(BaseModel):
    attention_items: List[DashboardAttentionItem] = []
    
    # Today stats
    conversations_needing_attention: int = 0
    qualified_leads_today: int = 0
    meetings_today: int = 0
    failed_automations_count: int = 0
    pending_integrations_count: int = 0
    
    # Pipeline summary
    total_leads: int = 0
    leads_by_stage: Dict[str, int] = {}
    qualification_rate: float = 0.0
    meeting_conversion_rate: float = 0.0
    
    # Outreach health
    messages_sent_count: int = 0
    responses_received_count: int = 0
    response_rate: float = 0.0
    positive_response_rate: float = 0.0
    follow_ups_due_count: int = 0
    
    # AI Health
    ai_conversations_count: int = 0
    human_handoff_count: int = 0
    average_ai_confidence: float = 0.0
    failed_ai_runs_count: int = 0

class PipelineAnalyticsResponse(BaseModel):
    stages_breakdown: List[Dict[str, Any]] = []
    conversion_funnel: List[Dict[str, Any]] = []
    average_time_to_qualification_hours: float = 0.0
    average_time_to_meeting_hours: float = 0.0

class OutreachAnalyticsResponse(BaseModel):
    channels_breakdown: List[Dict[str, Any]] = []
    sequences_performance: List[Dict[str, Any]] = []
    daily_volume: List[Dict[str, Any]] = []

# ----------------- AUDIT & AI OBSERVABILITY SCHEMAS -----------------
class AuditLogResponse(BaseModel):
    id: str
    workspace_id: str
    actor_type: str  # USER, AI, SYSTEM, INTEGRATION, WEBHOOK
    actor_id: Optional[str] = None
    entity_type: str
    entity_id: Optional[str] = None
    action: str
    metadata_json: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

class AIRunResponse(BaseModel):
    id: str
    workspace_id: str
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None
    model: str
    prompt_category: str
    prompt_version: int
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    latency_ms: int
    success: bool
    error: Optional[str] = None
    confidence: Optional[float] = None
    structured_output: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ----------------- NOTIFICATION SCHEMAS -----------------
class NotificationResponse(BaseModel):
    id: str
    workspace_id: str
    type: str
    title: str
    message: str
    severity: str
    is_read: bool
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ----------------- SETUP WIZARD STATUS -----------------
class ServiceStatusItem(BaseModel):
    name: str
    provider_key: str
    status: str  # "CONNECTED", "RESTRICTED", "MISSING", "ERROR"
    is_required: bool
    summary: str
    details: Optional[str] = None
    last_tested: Optional[datetime] = None
    instructions: str

class SystemSetupStatusResponse(BaseModel):
    database_ready: bool
    redis_ready: bool
    workspace_configured: bool
    icp_configured: bool
    services: List[ServiceStatusItem]
    ready_for_outreach: bool

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, DateTime, ForeignKey, Index, JSON, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace_memberships: Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    
    # Company Profile / Product Context
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    product_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_geography: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_company_size: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_decision_makers: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Operational & Safety Settings
    settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default=lambda: {
        "max_daily_outreach": 50,
        "max_follow_ups": 3,
        "min_follow_up_delay_hours": 24,
        "quiet_hours_enabled": True,
        "quiet_hours_start": "20:00",
        "quiet_hours_end": "08:00",
        "working_days": ["MON", "TUE", "WED", "THU", "FRI"],
        "human_approval_required": False,
        "opt_out_keywords": ["stop", "unsubscribe", "remove me", "not interested", "opt out", "cancel", "cease"]
    }, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    members: Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    icp_profiles: Mapped[List["ICPProfile"]] = relationship("ICPProfile", back_populates="workspace", cascade="all, delete-orphan")
    companies: Mapped[List["Company"]] = relationship("Company", back_populates="workspace", cascade="all, delete-orphan")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="workspace", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="workspace", cascade="all, delete-orphan")
    sequences: Mapped[List["OutreachSequence"]] = relationship("OutreachSequence", back_populates="workspace", cascade="all, delete-orphan")
    meetings: Mapped[List["Meeting"]] = relationship("Meeting", back_populates="workspace", cascade="all, delete-orphan")
    integrations: Mapped[List["Integration"]] = relationship("Integration", back_populates="workspace", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="workspace", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), default="SALES_REP", nullable=False)  # OWNER, ADMIN, SALES_MANAGER, SALES_REP, VIEWER
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="workspace_memberships")
    
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),)


class ICPProfile(Base):
    __tablename__ = "icp_profiles"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Criteria definitions (JSON lists and dicts)
    target_industries: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    target_company_sizes: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)  # e.g. ["1-10", "11-50", "51-200", "201-500", "500+"]
    target_revenue_range: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    target_geographies: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    target_job_titles: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    target_seniorities: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)  # e.g. ["Founder", "C-Level", "VP", "Director", "Head"]
    target_technologies: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    business_signals: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    
    negative_criteria: Mapped[Dict[str, Any]] = mapped_column(JSON, default=lambda: {
        "excluded_industries": [],
        "excluded_locations": [],
        "excluded_titles": [],
        "excluded_domains": []
    }, nullable=False)
    
    # Deterministic Scoring Weights (Total = 100)
    weights: Mapped[Dict[str, int]] = mapped_column(JSON, default=lambda: {
        "title": 25,
        "industry": 20,
        "company_size": 15,
        "geography": 15,
        "technology": 15,
        "business_signal": 10
    }, nullable=False)
    
    min_qualification_score: Mapped[int] = mapped_column(Integer, default=65, nullable=False)
    auto_qualification_threshold: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="icp_profiles")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="icp_profile")


class Company(Base):
    __tablename__ = "companies"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    employee_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    employee_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    technologies: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    stage: Mapped[str] = mapped_column(String(50), default="TARGET", nullable=False)  # DISCOVERED, TARGET, ENGAGED, CUSTOMER, CHURNED, DO_NOT_CONTACT
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="companies")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="company")


class Lead(Base):
    __tablename__ = "leads"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    icp_profile_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("icp_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    seniority: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    email_status: Mapped[str] = mapped_column(String(50), default="UNKNOWN", nullable=False)  # VERIFIED, UNVERIFIED, CATCH_ALL, INVALID, UNKNOWN
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Telegram tracking & verified opt-in mechanism
    telegram_identifier: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    telegram_opt_in_status: Mapped[str] = mapped_column(String(50), default="NOT_OPTED_IN", nullable=False)  # NOT_OPTED_IN, OPT_IN_PENDING, OPTED_IN, OPTED_OUT
    telegram_deep_link_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, unique=True, index=True)
    
    # Company snapshot
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    employee_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Provenance & Source Metadata
    source: Mapped[str] = mapped_column(String(50), default="MANUAL", nullable=False)  # APOLLO, CSV_IMPORT, MANUAL, HUNTER, WEBSITE
    source_record_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_enriched_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    enrichment_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Scoring & Status
    icp_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    qualification_status: Mapped[str] = mapped_column(String(50), default="UNQUALIFIED", nullable=False)  # UNQUALIFIED, POTENTIAL, QUALIFIED, NOT_QUALIFIED, NEEDS_HUMAN
    lead_status: Mapped[str] = mapped_column(String(50), default="NEW", nullable=False)  # NEW, RESEARCHING, CONTACTED, ENGAGED, QUALIFYING, QUALIFIED, MEETING_PENDING, MEETING_SCHEDULED, NURTURE, NOT_QUALIFIED, DO_NOT_CONTACT, CONVERTED, CLOSED
    outreach_status: Mapped[str] = mapped_column(String(50), default="IDLE", nullable=False)  # IDLE, ENROLLED, ACTIVE, WAITING, REPLIED, PAUSED, OPTED_OUT, COMPLETED
    buying_intent: Mapped[str] = mapped_column(String(50), default="UNKNOWN", nullable=False)  # UNKNOWN, LOW, MEDIUM, HIGH
    
    next_best_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    do_not_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="leads")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="leads")
    icp_profile: Mapped[Optional["ICPProfile"]] = relationship("ICPProfile", back_populates="leads")
    scores: Mapped[List["LeadScore"]] = relationship("LeadScore", back_populates="lead", cascade="all, delete-orphan")
    enrichments: Mapped[List["LeadEnrichment"]] = relationship("LeadEnrichment", back_populates="lead", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="lead", cascade="all, delete-orphan")
    qualification_answers: Mapped[List["QualificationAnswer"]] = relationship("QualificationAnswer", back_populates="lead", cascade="all, delete-orphan")
    enrollments: Mapped[List["SequenceEnrollment"]] = relationship("SequenceEnrollment", back_populates="lead", cascade="all, delete-orphan")
    meetings: Mapped[List["Meeting"]] = relationship("Meeting", back_populates="lead", cascade="all, delete-orphan")


class LeadScore(Base):
    __tablename__ = "lead_scores"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    icp_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("icp_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 - 100
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    matched_criteria: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    failed_criteria: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    unknown_criteria: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    breakdown: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    
    lead: Mapped["Lead"] = relationship("Lead", back_populates="scores")


class LeadEnrichment(Base):
    __tablename__ = "lead_enrichments"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # hunter, apollo, manual, verification
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    
    lead: Mapped["Lead"] = relationship("Lead", back_populates="enrichments")


class Conversation(Base):
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(50), default="TELEGRAM", nullable=False)  # TELEGRAM, EMAIL, LINKEDIN, MANUAL
    state: Mapped[str] = mapped_column(String(50), default="NEW", nullable=False)
    # NEW, CONTACTED, AWAITING_RESPONSE, ENGAGED, DISCOVERY, QUALIFYING, QUALIFIED, POTENTIAL, NOT_QUALIFIED, MEETING_INTENT, MEETING_PROPOSED, MEETING_SCHEDULED, HUMAN_REVIEW, PAUSED, OPTED_OUT, CLOSED
    
    ai_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    human_assigned_to: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_intent: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    context_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=lambda: {
        "known_facts": {},
        "objections": [],
        "buying_signals": [],
        "asked_questions": [],
        "proposed_slots": []
    }, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="conversations")
    lead: Mapped["Lead"] = relationship("Lead", back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    qualification_answers: Mapped[List["QualificationAnswer"]] = relationship("QualificationAnswer", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PROSPECT, AI, HUMAN, SYSTEM
    sender_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sender_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # INBOUND, OUTBOUND
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    raw_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    external_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    delivery_status: Mapped[str] = mapped_column(String(50), default="SENT", nullable=False)  # QUEUED, SENT, DELIVERED, FAILED, RECEIVED
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False, index=True)
    
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")


class QualificationAnswer(Base):
    __tablename__ = "qualification_answers"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    question_key: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. current_volume, budget_range, decision_timeline
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signal_type: Mapped[str] = mapped_column(String(50), default="NEED", nullable=False)  # PAIN_POINT, BUDGET, TIMELINE, AUTHORITY, NEED, OBJECTION, GENERAL
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ASKED", nullable=False)  # ASKED, ANSWERED, SKIPPED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="qualification_answers")
    lead: Mapped["Lead"] = relationship("Lead", back_populates="qualification_answers")


class OutreachSequence(Base):
    __tablename__ = "outreach_sequences"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(50), default="MANUAL", nullable=False)  # MANUAL, ICP_SCORE_THRESHOLD, LEAD_CREATED
    min_icp_score: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    stop_conditions: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["REPLIED", "MEETING_BOOKED", "OPTED_OUT", "HUMAN_TAKEOVER"], nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="sequences")
    steps: Mapped[List["SequenceStep"]] = relationship("SequenceStep", back_populates="sequence", cascade="all, delete-orphan", order_by="SequenceStep.step_number")
    enrollments: Mapped[List["SequenceEnrollment"]] = relationship("SequenceEnrollment", back_populates="sequence", cascade="all, delete-orphan")


class SequenceStep(Base):
    __tablename__ = "sequence_steps"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    sequence_id: Mapped[str] = mapped_column(String(36), ForeignKey("outreach_sequences.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    channel: Mapped[str] = mapped_column(String(50), default="TELEGRAM", nullable=False)  # TELEGRAM, EMAIL, LINKEDIN, MANUAL_TASK
    delay_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    condition_rule: Mapped[str] = mapped_column(String(50), default="IF_NO_REPLY", nullable=False)  # ALWAYS, IF_NO_REPLY
    template_content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    
    sequence: Mapped["OutreachSequence"] = relationship("OutreachSequence", back_populates="steps")


class SequenceEnrollment(Base):
    __tablename__ = "sequence_enrollments"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    sequence_id: Mapped[str] = mapped_column(String(36), ForeignKey("outreach_sequences.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    current_step_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, WAITING, STEP_DUE, COMPLETED, PAUSED, TERMINATED
    next_execution_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    termination_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    sequence: Mapped["OutreachSequence"] = relationship("OutreachSequence", back_populates="enrollments")
    lead: Mapped["Lead"] = relationship("Lead", back_populates="enrollments")


class Meeting(Base):
    __tablename__ = "meetings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    calendar_id: Mapped[str] = mapped_column(String(255), default="primary", nullable=False)
    provider_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), default="UTC", nullable=False)
    attendees: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    meeting_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="CONFIRMED", nullable=False)  # CONFIRMED, TENTATIVE, CANCELLED, COMPLETED, NO_SHOW
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="meetings")
    lead: Mapped["Lead"] = relationship("Lead", back_populates="meetings")


class Integration(Base):
    __tablename__ = "integrations"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # OPENAI, APOLLO, HUNTER, TELEGRAM, GOOGLE_CALENDAR, LINKEDIN, HUBSPOT
    status: Mapped[str] = mapped_column(String(50), default="NOT_CONNECTED", nullable=False)  # CONNECTED, NOT_CONNECTED, ERROR, RESTRICTED
    authentication_type: Mapped[str] = mapped_column(String(50), default="API_KEY", nullable=False)  # API_KEY, OAUTH2, BOT_TOKEN
    encrypted_credentials: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Fernet encrypted JSON string
    scopes: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    account_identifier: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    health_status: Mapped[Optional[str]] = mapped_column(String(50), default="UNTESTED", nullable=True)
    last_successful_request: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_failed_request: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rate_limit_remaining: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rate_limit_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="integrations")
    
    __table_args__ = (UniqueConstraint("workspace_id", "provider", name="uq_workspace_provider"),)


class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # LEAD_RELEVANCE, LEAD_ENRICHMENT_SUMMARY, INITIAL_OUTREACH, FOLLOW_UP, RESPONSE_ANALYSIS, QUALIFICATION, OBJECTION_HANDLING, MEETING_INTENT, MEETING_SCHEDULING, HUMAN_HANDOFF, LEAD_SUMMARY
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    output_schema: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class AIRun(Base):
    __tablename__ = "ai_runs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_category: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    input_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    structured_output: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    tool_calls: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)  # USER, AI, SYSTEM, INTEGRATION, WEBHOOK
    actor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False, index=True)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="audit_logs")


class Notification(Base):
    __tablename__ = "notifications"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False)  # HUMAN_HANDOFF, LEAD_QUALIFIED, MEETING_BOOKED, INTEGRATION_ERROR, SEQUENCE_PAUSED, OPT_OUT
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="INFO", nullable=False)  # INFO, WARNING, CRITICAL, SUCCESS
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    related_entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False, index=True)
    
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="notifications")

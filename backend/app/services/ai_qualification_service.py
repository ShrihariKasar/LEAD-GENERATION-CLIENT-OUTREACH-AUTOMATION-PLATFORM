import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models import Lead, Conversation, Message, QualificationAnswer, Workspace, ICPProfile, AIRun, Integration
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret
from backend.app.services.audit_service import AuditService

QUALIFICATION_SYSTEM_PROMPT = """You are THREADLINE Revenue Intelligence Engine.
You operate as an expert, grounded B2B qualification and conversation intelligence system.

STRICT OPERATIONAL RULES:
1. Ground every claim and qualification assessment STRICTLY in verified lead information and the conversation history provided.
2. DO NOT hallucinate or invent company achievements, funding rounds, news announcements, fake requirements, or fake pain points.
3. NEVER repeat questions that have already been asked. Check the list of PREVIOUS QUESTIONS carefully.
4. If the prospect raises pricing negotiation, complex legal/security terms, angry complaints, or explicitly asks for a human, set `needs_human_review: true` and `recommended_action: "HUMAN_TAKEOVER"`.
5. If the prospect asks to meet, schedule a call, or discusses availability, identify intent as `MEETING_REQUEST` and set `recommended_action: "PROPOSE_SLOTS"`.
6. If the prospect asks to stop, unsubscribe, or remove them, set `recommended_action: "DO_NOT_CONTACT"`.
7. Output must be strictly valid JSON matching the required schema.

COMPANY & PRODUCT CONTEXT:
Company Name: {company_name}
Product/Service: {product_description}
Target ICP Goals: {icp_description}

LEAD CONTEXT:
Name: {lead_name}
Title: {job_title}
Company: {lead_company}
Industry: {industry}
Location: {location}
ICP Match Score: {icp_score}/100

PREVIOUS QUESTIONS ASKED (DO NOT REPEAT):
{previous_questions}

CONVERSATION HISTORY:
{conversation_history}

Analyze the latest prospect message and produce a JSON response with:
{
  "intent_category": "INTERESTED" | "MEETING_REQUEST" | "QUESTION" | "OBJECTION" | "OPT_OUT" | "UNCERTAIN",
  "buying_intent": "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN",
  "qualification_status": "QUALIFIED" | "POTENTIAL" | "NOT_QUALIFIED" | "NEEDS_HUMAN",
  "pain_points": ["string"],
  "requirements": ["string"],
  "objections": ["string"],
  "next_recommended_question": "single non-repetitive question" or null,
  "recommended_action": "WAIT_REPLY" | "ASK_QUALIFICATION" | "PROPOSE_SLOTS" | "CONFIRM_MEETING" | "HUMAN_TAKEOVER" | "DO_NOT_CONTACT",
  "next_best_action_text": "One concise sentence describing exact next operational move",
  "response_message": "Friendly, professional, concise direct outreach message to send to prospect (max 3 sentences)",
  "needs_human_review": boolean,
  "human_handoff_reason": "string" or null,
  "confidence": 0.0 to 1.0,
  "summary": "Brief 1-2 sentence lead intelligence summary"
}
"""

class AIQualificationService:
    @staticmethod
    async def process_conversation_turn(
        db: AsyncSession,
        conversation_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        # 1. Fetch conversation, lead, messages, workspace, icp
        c_stmt = select(Conversation).where(Conversation.id == conversation_id, Conversation.workspace_id == workspace_id)
        c_res = await db.execute(c_stmt)
        conversation = c_res.scalar_one_or_none()
        if not conversation:
            raise ValueError("Conversation not found.")
            
        l_stmt = select(Lead).where(Lead.id == conversation.lead_id)
        l_res = await db.execute(l_stmt)
        lead = l_res.scalar_one_or_none()
        if not lead:
            raise ValueError("Lead not found.")
            
        w_stmt = select(Workspace).where(Workspace.id == workspace_id)
        w_res = await db.execute(w_stmt)
        workspace = w_res.scalar_one_or_none()
        
        icp = None
        if lead.icp_profile_id:
            icp_stmt = select(ICPProfile).where(ICPProfile.id == lead.icp_profile_id)
            icp_res = await db.execute(icp_stmt)
            icp = icp_res.scalar_one_or_none()
            
        # Fetch messages in order
        m_stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
        m_res = await db.execute(m_stmt)
        messages = m_res.scalars().all()
        
        # Fetch previously asked qualification questions
        q_stmt = select(QualificationAnswer).where(QualificationAnswer.conversation_id == conversation_id)
        q_res = await db.execute(q_stmt)
        previous_q_records = q_res.scalars().all()
        previous_questions_list = [f"- {q.question_text}" for q in previous_q_records]
        previous_questions_str = "\n".join(previous_questions_list) if previous_questions_list else "None asked yet."
        
        # Format conversation history
        conv_lines = []
        for m in messages:
            role = "PROSPECT" if m.direction == "INBOUND" else f"OUTREACH ({m.sender_type})"
            conv_lines.append(f"[{role}]: {m.content}")
        conversation_history_str = "\n".join(conv_lines) if conv_lines else "No previous messages."
        
        # Build prompt
        system_prompt = QUALIFICATION_SYSTEM_PROMPT.format(
            company_name=workspace.company_name if workspace else "Revenue Ops",
            product_description=workspace.product_description if workspace else "B2B Outreach Platform",
            icp_description=icp.description if icp else "Qualified Decision Makers",
            lead_name=lead.full_name or f"{lead.first_name or ''} {lead.last_name or ''}".strip() or "Prospect",
            job_title=lead.job_title or "Unknown Title",
            lead_company=lead.company_name or "Unknown Company",
            industry=lead.industry or "Unknown Industry",
            location=lead.location or "Unknown Location",
            icp_score=lead.icp_score or 0,
            previous_questions=previous_questions_str,
            conversation_history=conversation_history_str
        )
        
        # 2. Get OpenAI Provider
        int_stmt = select(Integration).where(
            Integration.workspace_id == workspace_id,
            Integration.provider == "OPENAI",
            Integration.status == "CONNECTED"
        )
        int_res = await db.execute(int_stmt)
        openai_int = int_res.scalar_one_or_none()
        
        if not openai_int or not openai_int.encrypted_credentials:
            # If no OpenAI provider connected, return a truthful deterministic fallback
            return {
                "success": False,
                "error": "OpenAI integration not connected. Please connect OpenAI in Integration Center.",
                "needs_human_review": True
            }
            
        creds = json.loads(decrypt_secret(openai_int.encrypted_credentials))
        ai_provider = get_provider_instance("OPENAI", creds)
        
        start_time = time.time()
        ai_run = AIRun(
            workspace_id=workspace_id,
            lead_id=lead.id,
            conversation_id=conversation.id,
            model=creds.get("model", "gpt-4o"),
            prompt_category="QUALIFICATION",
            prompt_version=1,
            created_at=datetime.now(timezone.utc)
        )
        
        try:
            ai_result = await ai_provider.generate_structured_response(
                system_prompt=system_prompt,
                user_prompt="Analyze the conversation state and produce the structured qualification assessment.",
                response_schema={"type": "json_object"}
            )
            
            structured = ai_result.get("structured_output") or {}
            ai_run.latency_ms = ai_result.get("latency_ms", 0)
            ai_run.input_tokens = ai_result.get("input_tokens")
            ai_run.output_tokens = ai_result.get("output_tokens")
            ai_run.structured_output = structured
            ai_run.confidence = float(structured.get("confidence", 0.8))
            ai_run.success = True
            
            db.add(ai_run)
            
            # 3. Apply state machine transitions & lead updates
            intent = structured.get("intent_category", "INTERESTED")
            buying_intent = structured.get("buying_intent", "MEDIUM")
            qualification_status = structured.get("qualification_status", "POTENTIAL")
            recommended_action = structured.get("recommended_action", "WAIT_REPLY")
            next_action_text = structured.get("next_best_action_text", "Review conversation")
            needs_human = structured.get("needs_human_review", False)
            summary = structured.get("summary")
            
            lead.buying_intent = buying_intent
            lead.qualification_status = qualification_status
            lead.next_best_action = next_action_text
            if summary:
                lead.ai_summary = summary
                
            conversation.last_intent = intent
            
            # Anti-repetition: if AI proposes a new question, store it in qualification_answers
            new_question = structured.get("next_recommended_question")
            if new_question and not any(new_question.strip().lower() in q.question_text.lower() for q in previous_q_records):
                qa = QualificationAnswer(
                    conversation_id=conversation.id,
                    lead_id=lead.id,
                    question_key=f"q_{len(previous_q_records) + 1}",
                    question_text=new_question,
                    signal_type="NEED",
                    confidence=0.9,
                    status="ASKED",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(qa)
                
            # State transitions
            if intent == "OPT_OUT" or recommended_action == "DO_NOT_CONTACT":
                lead.do_not_contact = True
                lead.outreach_status = "OPTED_OUT"
                lead.lead_status = "DO_NOT_CONTACT"
                conversation.state = "OPTED_OUT"
                conversation.ai_paused = True
            elif needs_human or recommended_action == "HUMAN_TAKEOVER":
                conversation.state = "HUMAN_REVIEW"
                conversation.ai_paused = True
                lead.qualification_status = "NEEDS_HUMAN"
            elif intent == "MEETING_REQUEST" or recommended_action == "PROPOSE_SLOTS":
                conversation.state = "MEETING_INTENT"
                lead.lead_status = "MEETING_PENDING"
            elif qualification_status == "QUALIFIED":
                conversation.state = "QUALIFIED"
                lead.lead_status = "QUALIFIED"
            else:
                conversation.state = "ENGAGED"
                lead.lead_status = "ENGAGED"
                
            await AuditService.log_event(
                db=db,
                workspace_id=workspace_id,
                action="ai_qualification_updated",
                actor_type="AI",
                entity_type="CONVERSATION",
                entity_id=conversation.id,
                metadata={
                    "intent": intent,
                    "buying_intent": buying_intent,
                    "qualification_status": qualification_status,
                    "recommended_action": recommended_action,
                    "needs_human": needs_human
                }
            )
            
            await db.commit()
            
            return {
                "success": True,
                "structured": structured,
                "ai_run_id": ai_run.id
            }
        except Exception as e:
            ai_run.success = False
            ai_run.error = str(e)
            ai_run.latency_ms = int((time.time() - start_time) * 1000)
            db.add(ai_run)
            await db.commit()
            return {
                "success": False,
                "error": str(e),
                "needs_human_review": True
            }

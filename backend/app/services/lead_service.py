import secrets
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, delete, update
from backend.app.models import Lead, Company, ICPProfile, LeadScore, LeadEnrichment, SequenceEnrollment
from backend.app.services.scoring_engine import ScoringEngine
from backend.app.services.audit_service import AuditService

class LeadService:
    @staticmethod
    def generate_deep_link_token() -> str:
        return secrets.token_urlsafe(16)

    @staticmethod
    async def create_lead(
        db: AsyncSession,
        workspace_id: str,
        lead_data: Dict[str, Any],
        actor_type: str = "USER",
        actor_id: Optional[str] = None
    ) -> Tuple[Lead, bool]:
        """
        Create a new lead with deduplication.
        Returns (lead, is_created).
        """
        email = lead_data.get("email")
        company_domain = lead_data.get("company_domain")
        full_name = lead_data.get("full_name") or f"{lead_data.get('first_name', '')} {lead_data.get('last_name', '')}".strip() or None
        
        # Deduplication check
        dup_conditions = []
        if email:
            dup_conditions.append(and_(Lead.workspace_id == workspace_id, Lead.email == email))
        if company_domain and full_name:
            dup_conditions.append(and_(Lead.workspace_id == workspace_id, Lead.company_domain == company_domain, Lead.full_name == full_name))
            
        if dup_conditions:
            check_stmt = select(Lead).where(or_(*dup_conditions))
            existing = (await db.execute(check_stmt)).scalar_one_or_none()
            if existing:
                return existing, False
                
        # Link or create Company
        company_id = lead_data.get("company_id")
        company_name = lead_data.get("company_name")
        if not company_id and company_name:
            c_stmt = select(Company).where(
                Company.workspace_id == workspace_id,
                or_(
                    Company.name == company_name,
                    Company.domain == company_domain if company_domain else False
                )
            )
            comp = (await db.execute(c_stmt)).scalar_one_or_none()
            if not comp:
                comp = Company(
                    workspace_id=workspace_id,
                    name=company_name,
                    domain=company_domain,
                    website=lead_data.get("website"),
                    industry=lead_data.get("industry"),
                    employee_count=lead_data.get("employee_count"),
                    location=lead_data.get("location"),
                    country=lead_data.get("country"),
                    created_at=datetime.now(timezone.utc)
                )
                db.add(comp)
                await db.flush()
            company_id = comp.id
            
        # Get active ICP profile if not specified
        icp_profile_id = lead_data.get("icp_profile_id")
        icp = None
        if icp_profile_id:
            icp_stmt = select(ICPProfile).where(ICPProfile.id == icp_profile_id, ICPProfile.workspace_id == workspace_id)
            icp = (await db.execute(icp_stmt)).scalar_one_or_none()
        else:
            default_icp_stmt = select(ICPProfile).where(ICPProfile.workspace_id == workspace_id, ICPProfile.is_active == True)
            icp = (await db.execute(default_icp_stmt)).scalar_one_or_none()
            if icp:
                icp_profile_id = icp.id

        deep_link_token = LeadService.generate_deep_link_token()

        lead = Lead(
            workspace_id=workspace_id,
            company_id=company_id,
            icp_profile_id=icp_profile_id,
            first_name=lead_data.get("first_name"),
            last_name=lead_data.get("last_name"),
            full_name=full_name,
            job_title=lead_data.get("job_title"),
            seniority=lead_data.get("seniority"),
            email=email,
            email_status=lead_data.get("email_status", "UNKNOWN"),
            phone=lead_data.get("phone"),
            linkedin_url=lead_data.get("linkedin_url"),
            telegram_identifier=lead_data.get("telegram_identifier"),
            telegram_opt_in_status="NOT_OPTED_IN",
            telegram_deep_link_token=deep_link_token,
            company_name=company_name,
            company_domain=company_domain,
            industry=lead_data.get("industry"),
            employee_count=lead_data.get("employee_count"),
            location=lead_data.get("location"),
            country=lead_data.get("country"),
            website=lead_data.get("website"),
            source=lead_data.get("source", "MANUAL"),
            source_record_id=lead_data.get("source_record_id"),
            source_created_at=lead_data.get("source_created_at") or datetime.now(timezone.utc),
            qualification_status=lead_data.get("qualification_status", "UNQUALIFIED"),
            lead_status=lead_data.get("lead_status", "NEW"),
            outreach_status="IDLE",
            buying_intent="UNKNOWN",
            created_at=datetime.now(timezone.utc)
        )
        db.add(lead)
        await db.flush()

        # Score lead against ICP
        if icp:
            eval_res = ScoringEngine.evaluate(lead, icp)
            lead.icp_score = eval_res["score"]
            if eval_res["auto_qualified"]:
                lead.qualification_status = "QUALIFIED"
                lead.lead_status = "QUALIFIED"
            
            score_rec = LeadScore(
                lead_id=lead.id,
                icp_profile_id=icp.id,
                score=eval_res["score"],
                confidence=eval_res["confidence"],
                matched_criteria=eval_res["matched_criteria"],
                failed_criteria=eval_res["failed_criteria"],
                unknown_criteria=eval_res["unknown_criteria"],
                breakdown=eval_res["breakdown"],
                explanation=eval_res["explanation"],
                created_at=datetime.now(timezone.utc)
            )
            db.add(score_rec)
            
        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            action="lead_created",
            actor_type=actor_type,
            actor_id=actor_id,
            entity_type="LEAD",
            entity_id=lead.id,
            metadata={"source": lead.source, "icp_score": lead.icp_score}
        )

        await db.commit()
        await db.refresh(lead)
        return lead, True

    @staticmethod
    async def get_decision_trace(db: AsyncSession, lead_id: str, workspace_id: str) -> Dict[str, Any]:
        l_stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == workspace_id)
        lead = (await db.execute(l_stmt)).scalar_one_or_none()
        if not lead:
            raise ValueError("Lead not found.")
            
        icp = None
        if lead.icp_profile_id:
            icp = (await db.execute(select(ICPProfile).where(ICPProfile.id == lead.icp_profile_id))).scalar_one_or_none()
            
        company = None
        if lead.company_id:
            company = (await db.execute(select(Company).where(Company.id == lead.company_id))).scalar_one_or_none()
            
        if not icp:
            return {
                "lead_id": lead.id,
                "overall_score": lead.icp_score,
                "icp_name": "No ICP Profile Linked",
                "items": [
                    {"category": "ICP", "status": "UNKNOWN", "label": "No ICP Configured", "details": "Assign an ICP profile to evaluate fit."}
                ],
                "explanation": "Assign an ICP profile to view deterministic criteria fit.",
                "recommendation": "Link lead to an ICP profile."
            }
            
        eval_res = ScoringEngine.evaluate(lead, icp, company)
        
        # Calculate next best action
        rec = "Engage in sequence"
        if lead.qualification_status == "QUALIFIED":
            rec = "Offer meeting availability or review calendar slots."
        elif lead.qualification_status == "NEEDS_HUMAN":
            rec = "Human review required before sending outreach."
        elif not lead.email and not lead.telegram_chat_id:
            rec = "Enrich contact details to discover verified email or send Telegram opt-in link."
        elif lead.icp_score and lead.icp_score >= 80:
            rec = "High-priority prospect. Enroll in primary sequence."
            
        return {
            "lead_id": lead.id,
            "overall_score": eval_res["score"],
            "icp_name": icp.name,
            "items": eval_res["decision_trace_items"],
            "explanation": eval_res["explanation"],
            "recommendation": rec
        }

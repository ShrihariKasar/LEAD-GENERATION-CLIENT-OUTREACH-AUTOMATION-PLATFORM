from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models import Lead, Company, LeadEnrichment, Integration, ICPProfile, LeadScore
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret
from backend.app.services.audit_service import AuditService
from backend.app.services.scoring_engine import ScoringEngine
import json

class EnrichmentService:
    @staticmethod
    async def enrich_lead(
        db: AsyncSession,
        lead_id: str,
        workspace_id: str,
        providers: Optional[List[str]] = None
    ) -> Lead:
        lead_stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == workspace_id)
        result = await db.execute(lead_stmt)
        lead = result.scalar_one_or_none()
        if not lead:
            raise ValueError("Lead not found.")
            
        company = None
        if lead.company_id:
            c_stmt = select(Company).where(Company.id == lead.company_id)
            c_res = await db.execute(c_stmt)
            company = c_res.scalar_one_or_none()
            
        # Get active integrations for workspace
        int_stmt = select(Integration).where(
            Integration.workspace_id == workspace_id,
            Integration.status.in_(["CONNECTED", "RESTRICTED"])
        )
        int_res = await db.execute(int_stmt)
        integrations = {i.provider: i for i in int_res.scalars().all()}
        
        enrichment_records: List[LeadEnrichment] = []
        fields_updated = []
        
        # 1. Hunter.io Email Verification & Discovery
        if (not providers or "HUNTER" in providers) and "HUNTER" in integrations:
            hunter_int = integrations["HUNTER"]
            creds = {}
            if hunter_int.encrypted_credentials:
                try:
                    creds = json.loads(decrypt_secret(hunter_int.encrypted_credentials))
                except Exception:
                    pass
            hunter_client = get_provider_instance("HUNTER", creds)
            
            # Verify existing email
            if lead.email:
                try:
                    verif = await hunter_client.verify_email(lead.email)
                    if verif and verif.get("result"):
                        old_val = lead.email_status
                        new_val = "VERIFIED" if verif["result"] == "deliverable" else ("UNVERIFIED" if verif["result"] == "risky" else "INVALID")
                        if old_val != new_val:
                            lead.email_status = new_val
                            enrichment_records.append(LeadEnrichment(
                                lead_id=lead.id,
                                field_name="email_status",
                                old_value=old_val,
                                new_value=new_val,
                                source="hunter.io",
                                confidence=verif.get("confidence", 0.9),
                                created_at=datetime.now(timezone.utc)
                            ))
                            fields_updated.append("email_status")
                except Exception:
                    pass
            elif lead.company_domain and lead.first_name and lead.last_name:
                try:
                    found = await hunter_client.find_email(lead.company_domain, lead.first_name, lead.last_name)
                    if found and found.get("email"):
                        lead.email = found["email"]
                        lead.email_status = "VERIFIED" if (found.get("score", 0) > 80) else "UNVERIFIED"
                        enrichment_records.append(LeadEnrichment(
                            lead_id=lead.id,
                            field_name="email",
                            old_value=None,
                            new_value=lead.email,
                            source="hunter.io",
                            confidence=found.get("confidence", 0.8),
                            created_at=datetime.now(timezone.utc)
                        ))
                        fields_updated.append("email")
                except Exception:
                    pass

        # Update lead enrichment metadata
        lead.last_enriched_at = datetime.now(timezone.utc)
        lead.enrichment_confidence = 0.9 if lead.email_status == "VERIFIED" else 0.6
        
        for rec in enrichment_records:
            db.add(rec)
            
        # Recalculate ICP Score if ICP profile is linked
        if lead.icp_profile_id:
            icp_stmt = select(ICPProfile).where(ICPProfile.id == lead.icp_profile_id)
            icp_res = await db.execute(icp_stmt)
            icp = icp_res.scalar_one_or_none()
            if icp:
                eval_res = ScoringEngine.evaluate(lead, icp, company)
                lead.icp_score = eval_res["score"]
                if eval_res["auto_qualified"] and lead.qualification_status == "UNQUALIFIED":
                    lead.qualification_status = "QUALIFIED"
                    lead.lead_status = "QUALIFIED"
                
                # Save LeadScore record
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
            action="lead_enriched",
            actor_type="SYSTEM",
            entity_type="LEAD",
            entity_id=lead.id,
            metadata={
                "fields_updated": fields_updated,
                "enrichment_records_count": len(enrichment_records),
                "new_icp_score": lead.icp_score
            }
        )
        
        await db.commit()
        await db.refresh(lead)
        return lead

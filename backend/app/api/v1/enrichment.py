from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import Lead, LeadEnrichment, WorkspaceMember
from backend.app.schemas import LeadEnrichmentRequest, LeadEnrichmentResponse, LeadResponse
from backend.app.auth.dependencies import get_current_workspace_context, require_roles
from backend.app.services.enrichment_service import EnrichmentService

router = APIRouter(prefix="/enrichment", tags=["Enrichment"])

@router.post("/leads/{lead_id}", response_model=LeadResponse)
async def trigger_lead_enrichment(
    lead_id: str,
    payload: Optional[LeadEnrichmentRequest] = None,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Trigger verified enrichment pipeline for a lead."""
    try:
        providers = payload.providers if payload else None
        lead = await EnrichmentService.enrich_lead(
            db=db,
            lead_id=lead_id,
            workspace_id=member.workspace_id,
            providers=providers
        )
        return lead
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/leads/{lead_id}/history", response_model=List[LeadEnrichmentResponse])
async def get_lead_enrichment_history(
    lead_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    # Verify lead belongs to caller's workspace
    lead_stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == member.workspace_id)
    lead = (await db.execute(lead_stmt)).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    stmt = select(LeadEnrichment).where(LeadEnrichment.lead_id == lead_id).order_by(LeadEnrichment.created_at.desc())
    records = (await db.execute(stmt)).scalars().all()
    return records

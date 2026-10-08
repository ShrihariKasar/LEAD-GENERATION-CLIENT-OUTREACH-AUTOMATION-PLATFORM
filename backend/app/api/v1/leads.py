import io
import csv
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, asc, delete, func
from backend.app.database import get_db
from backend.app.models import Lead, Company, LeadScore, LeadEnrichment, Integration, OutreachSequence, WorkspaceMember
from backend.app.schemas import (
    LeadResponse, LeadCreate, LeadUpdate, LeadDiscoveryRequest,
    LeadBulkActionRequest, DecisionTraceResponse, NextBestActionResponse,
    LeadListResponse, LeadDiscoveryResponse, CSVImportResponse, BulkActionResponse
)
from backend.app.auth.dependencies import get_current_workspace_context, require_roles
from backend.app.services.lead_service import LeadService
from backend.app.services.enrichment_service import EnrichmentService
from backend.app.services.sequence_service import SequenceService
from backend.app.services.audit_service import AuditService
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=LeadListResponse)
async def list_leads(
    query: Optional[str] = None,
    lead_status: Optional[str] = None,
    qualification_status: Optional[str] = None,
    outreach_status: Optional[str] = None,
    icp_profile_id: Optional[str] = None,
    min_icp_score: Optional[int] = None,
    source: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 25,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    base_stmt = select(Lead).where(Lead.workspace_id == member.workspace_id)
    
    if query:
        term = f"%{query.strip()}%"
        base_stmt = base_stmt.where(
            or_(
                Lead.full_name.ilike(term),
                Lead.first_name.ilike(term),
                Lead.last_name.ilike(term),
                Lead.email.ilike(term),
                Lead.company_name.ilike(term),
                Lead.job_title.ilike(term)
            )
        )
        
    if lead_status:
        base_stmt = base_stmt.where(Lead.lead_status == lead_status)
    if qualification_status:
        base_stmt = base_stmt.where(Lead.qualification_status == qualification_status)
    if outreach_status:
        base_stmt = base_stmt.where(Lead.outreach_status == outreach_status)
    if icp_profile_id:
        base_stmt = base_stmt.where(Lead.icp_profile_id == icp_profile_id)
    if min_icp_score is not None:
        base_stmt = base_stmt.where(Lead.icp_score >= min_icp_score)
    if source:
        base_stmt = base_stmt.where(Lead.source == source)
        
    # Total count with filters applied
    count_stmt = select(func.count(Lead.id)).where(base_stmt.whereclause)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Sorting
    sort_col = getattr(Lead, sort_by, Lead.created_at)
    if sort_order.lower() == "asc":
        paged_stmt = base_stmt.order_by(asc(sort_col))
    else:
        paged_stmt = base_stmt.order_by(desc(sort_col))
        
    offset = (page - 1) * limit
    paged_stmt = paged_stmt.offset(offset).limit(limit)
    
    leads = (await db.execute(paged_stmt)).scalars().all()
    
    return {
        "items": leads,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0
    }

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    lead, created = await LeadService.create_lead(
        db=db,
        workspace_id=member.workspace_id,
        lead_data=payload.model_dump(),
        actor_type="USER",
        actor_id=member.user_id
    )
    return lead

@router.post("/discover", response_model=LeadDiscoveryResponse)
async def discover_leads(
    payload: LeadDiscoveryRequest,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Run real prospect discovery via connected Apollo integration."""
    int_stmt = select(Integration).where(
        Integration.workspace_id == member.workspace_id,
        Integration.provider == "APOLLO",
        Integration.status == "CONNECTED"
    )
    apollo_int = (await db.execute(int_stmt)).scalar_one_or_none()
    
    if not apollo_int or not apollo_int.encrypted_credentials:
        raise HTTPException(
            status_code=400,
            detail="Apollo integration is not connected. Please connect Apollo in Integration Center."
        )
        
    creds = json.loads(decrypt_secret(apollo_int.encrypted_credentials))
    apollo_client = get_provider_instance("APOLLO", creds)
    
    try:
        discovered_raw = await apollo_client.search_prospects(
            job_titles=payload.job_titles,
            seniorities=payload.seniorities,
            industries=payload.industries,
            locations=payload.locations,
            employee_ranges=payload.employee_ranges,
            keywords=payload.keywords,
            domain=payload.domain,
            limit=payload.limit
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Apollo Discovery Error: {str(e)}")
        
    created_leads = []
    skipped_count = 0
    
    for item in discovered_raw:
        item["icp_profile_id"] = payload.icp_profile_id
        lead, created = await LeadService.create_lead(
            db=db,
            workspace_id=member.workspace_id,
            lead_data=item,
            actor_type="INTEGRATION",
            actor_id="APOLLO"
        )
        if created:
            created_leads.append(lead)
        else:
            skipped_count += 1
            
    return {
        "discovered_total": len(discovered_raw),
        "created_count": len(created_leads),
        "skipped_duplicates": skipped_count,
        "leads": created_leads
    }

@router.post("/import-csv", response_model=CSVImportResponse)
async def import_leads_csv(
    file: UploadFile = File(...),
    icp_profile_id: Optional[str] = Query(None),
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Import and score prospects from CSV file."""
    content = await file.read()
    try:
        csv_text = content.decode("utf-8")
    except UnicodeDecodeError:
        csv_text = content.decode("latin-1")
        
    reader = csv.DictReader(io.StringIO(csv_text))
    created_leads = []
    skipped = 0
    
    for row in reader:
        # Standardize common column header variations
        norm_row = {k.lower().strip(): v.strip() for k, v in row.items() if k}
        
        email = norm_row.get("email") or norm_row.get("e-mail") or norm_row.get("work_email")
        first_name = norm_row.get("first_name") or norm_row.get("firstname") or norm_row.get("first")
        last_name = norm_row.get("last_name") or norm_row.get("lastname") or norm_row.get("last")
        full_name = norm_row.get("full_name") or norm_row.get("name")
        job_title = norm_row.get("job_title") or norm_row.get("title") or norm_row.get("position")
        company_name = norm_row.get("company_name") or norm_row.get("company") or norm_row.get("organization")
        company_domain = norm_row.get("company_domain") or norm_row.get("domain") or norm_row.get("website")
        industry = norm_row.get("industry")
        location = norm_row.get("location") or norm_row.get("city")
        country = norm_row.get("country")
        linkedin_url = norm_row.get("linkedin_url") or norm_row.get("linkedin")
        
        emp_count = None
        if norm_row.get("employee_count"):
            try:
                emp_count = int(norm_row["employee_count"].replace(",", ""))
            except ValueError:
                pass
                
        lead_data = {
            "first_name": first_name,
            "last_name": last_name,
            "full_name": full_name,
            "job_title": job_title,
            "email": email,
            "company_name": company_name,
            "company_domain": company_domain,
            "industry": industry,
            "location": location,
            "country": country,
            "linkedin_url": linkedin_url,
            "employee_count": emp_count,
            "source": "CSV_IMPORT",
            "icp_profile_id": icp_profile_id
        }
        
        lead, is_new = await LeadService.create_lead(
            db=db,
            workspace_id=member.workspace_id,
            lead_data=lead_data,
            actor_type="USER",
            actor_id=member.user_id
        )
        if is_new:
            created_leads.append(lead)
        else:
            skipped += 1
            
    return {
        "imported_count": len(created_leads),
        "skipped_duplicates": skipped
    }

@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == member.workspace_id)
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == member.workspace_id)
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(lead, k, v)
        
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="lead_updated",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="LEAD",
        entity_id=lead.id,
        metadata={"fields": list(update_data.keys())}
    )
    
    await db.commit()
    await db.refresh(lead)
    return lead

@router.get("/{lead_id}/decision-trace", response_model=DecisionTraceResponse)
async def get_lead_decision_trace(
    lead_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve explainable criteria breakdown and trace for a lead."""
    trace = await LeadService.get_decision_trace(db, lead_id, member.workspace_id)
    return trace

@router.get("/{lead_id}/telegram-opt-in-link", response_model=Dict[str, str])
async def get_lead_telegram_link(
    lead_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve deep-link URL for lead Telegram opt-in."""
    stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == member.workspace_id)
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Get Telegram bot username
    t_stmt = select(Integration).where(
        Integration.workspace_id == member.workspace_id,
        Integration.provider == "TELEGRAM"
    )
    t_int = (await db.execute(t_stmt)).scalar_one_or_none()
    bot_username = t_int.account_identifier.replace("@", "") if t_int and t_int.account_identifier else "ThreadlineBot"
    
    link = f"https://t.me/{bot_username}?start=lead_{lead.telegram_deep_link_token}"
    return {
        "opt_in_link": link,
        "status": lead.telegram_opt_in_status,
        "token": lead.telegram_deep_link_token
    }

@router.post("/bulk", response_model=BulkActionResponse)
async def bulk_action_leads(
    payload: LeadBulkActionRequest,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    if not payload.lead_ids:
        return {"affected_count": 0}
        
    action = payload.action
    stmt = select(Lead).where(Lead.id.in_(payload.lead_ids), Lead.workspace_id == member.workspace_id)
    leads = (await db.execute(stmt)).scalars().all()
    
    affected = len(leads)
    
    if action == "QUALIFY":
        for l in leads:
            l.qualification_status = payload.qualification_status or "QUALIFIED"
            l.lead_status = "QUALIFIED"
    elif action == "PAUSE":
        for l in leads:
            l.outreach_status = "PAUSED"
    elif action == "MARK_DO_NOT_CONTACT":
        for l in leads:
            l.do_not_contact = True
            l.outreach_status = "OPTED_OUT"
            l.lead_status = "DO_NOT_CONTACT"
    elif action == "ENROLL_SEQUENCE" and payload.sequence_id:
        await SequenceService.enroll_leads(db, payload.sequence_id, payload.lead_ids, member.workspace_id)
    elif action == "DELETE":
        del_stmt = delete(Lead).where(Lead.id.in_(payload.lead_ids), Lead.workspace_id == member.workspace_id)
        await db.execute(del_stmt)
        
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action=f"bulk_{action.lower()}",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="LEAD",
        metadata={"count": affected, "action": action}
    )
    
    await db.commit()
    return {"affected_count": affected, "action": action}

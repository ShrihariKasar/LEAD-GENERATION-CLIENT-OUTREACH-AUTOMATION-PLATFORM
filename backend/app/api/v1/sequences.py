from typing import List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from backend.app.database import get_db
from backend.app.models import OutreachSequence, SequenceStep, SequenceEnrollment, Lead, WorkspaceMember
from backend.app.schemas import (
    OutreachSequenceCreate, OutreachSequenceUpdate, OutreachSequenceResponse,
    SequenceEnrollmentResponse, SequenceStepResponse
)
from backend.app.auth.dependencies import get_current_workspace_context, require_roles
from backend.app.services.sequence_service import SequenceService
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/sequences", tags=["Sequences"])

@router.get("", response_model=List[OutreachSequenceResponse])
async def list_sequences(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(OutreachSequence).where(OutreachSequence.workspace_id == member.workspace_id).order_by(OutreachSequence.created_at.desc())
    seqs = (await db.execute(stmt)).scalars().all()
    
    res = []
    for s in seqs:
        steps_stmt = select(SequenceStep).where(SequenceStep.sequence_id == s.id).order_by(SequenceStep.step_number.asc())
        steps = (await db.execute(steps_stmt)).scalars().all()
        
        enr_stmt = select(func.count(SequenceEnrollment.id)).where(SequenceEnrollment.sequence_id == s.id)
        enr_count = (await db.execute(enr_stmt)).scalar() or 0
        
        act_stmt = select(func.count(SequenceEnrollment.id)).where(SequenceEnrollment.sequence_id == s.id, SequenceEnrollment.status == "ACTIVE")
        act_count = (await db.execute(act_stmt)).scalar() or 0
        
        s.steps = steps
        s.enrollments_count = enr_count
        s.active_count = act_count
        res.append(s)
        
    return res

@router.post("", response_model=OutreachSequenceResponse, status_code=status.HTTP_201_CREATED)
async def create_sequence(
    payload: OutreachSequenceCreate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    seq = OutreachSequence(
        workspace_id=member.workspace_id,
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active,
        trigger_type=payload.trigger_type,
        min_icp_score=payload.min_icp_score,
        stop_conditions=payload.stop_conditions
    )
    db.add(seq)
    await db.flush()
    
    steps = []
    for s in payload.steps:
        step = SequenceStep(
            sequence_id=seq.id,
            step_number=s.step_number,
            channel=s.channel,
            delay_hours=s.delay_hours,
            condition_rule=s.condition_rule,
            template_content=s.template_content
        )
        db.add(step)
        steps.append(step)
        
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="sequence_created",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="SEQUENCE",
        entity_id=seq.id,
        metadata={"name": seq.name, "steps_count": len(steps)}
    )
    
    await db.commit()
    await db.refresh(seq)
    seq.steps = steps
    seq.enrollments_count = 0
    seq.active_count = 0
    return seq

@router.get("/{sequence_id}", response_model=OutreachSequenceResponse)
async def get_sequence(
    sequence_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(OutreachSequence).where(OutreachSequence.id == sequence_id, OutreachSequence.workspace_id == member.workspace_id)
    seq = (await db.execute(stmt)).scalar_one_or_none()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")
        
    steps = (await db.execute(select(SequenceStep).where(SequenceStep.sequence_id == seq.id).order_by(SequenceStep.step_number.asc()))).scalars().all()
    enr_count = (await db.execute(select(func.count(SequenceEnrollment.id)).where(SequenceEnrollment.sequence_id == seq.id))).scalar() or 0
    act_count = (await db.execute(select(func.count(SequenceEnrollment.id)).where(SequenceEnrollment.sequence_id == seq.id, SequenceEnrollment.status == "ACTIVE"))).scalar() or 0
    
    seq.steps = steps
    seq.enrollments_count = enr_count
    seq.active_count = act_count
    return seq

@router.patch("/{sequence_id}", response_model=OutreachSequenceResponse)
async def update_sequence(
    sequence_id: str,
    payload: OutreachSequenceUpdate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(OutreachSequence).where(OutreachSequence.id == sequence_id, OutreachSequence.workspace_id == member.workspace_id)
    seq = (await db.execute(stmt)).scalar_one_or_none()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    if "steps" in update_data and update_data["steps"] is not None:
        # Replace steps
        await db.execute(delete(SequenceStep).where(SequenceStep.sequence_id == seq.id))
        for s in update_data["steps"]:
            step = SequenceStep(
                sequence_id=seq.id,
                step_number=s["step_number"],
                channel=s["channel"],
                delay_hours=s["delay_hours"],
                condition_rule=s["condition_rule"],
                template_content=s["template_content"]
            )
            db.add(step)
        del update_data["steps"]
        
    for k, v in update_data.items():
        setattr(seq, k, v)
        
    await db.commit()
    return await get_sequence(sequence_id, member, db)

@router.post("/{sequence_id}/activate", response_model=OutreachSequenceResponse)
async def activate_sequence(
    sequence_id: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(OutreachSequence).where(OutreachSequence.id == sequence_id, OutreachSequence.workspace_id == member.workspace_id)
    seq = (await db.execute(stmt)).scalar_one_or_none()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")
        
    seq.is_active = True
    await db.commit()
    return await get_sequence(sequence_id, member, db)

@router.post("/{sequence_id}/pause", response_model=OutreachSequenceResponse)
async def pause_sequence(
    sequence_id: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(OutreachSequence).where(OutreachSequence.id == sequence_id, OutreachSequence.workspace_id == member.workspace_id)
    seq = (await db.execute(stmt)).scalar_one_or_none()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")
        
    seq.is_active = False
    await db.commit()
    return await get_sequence(sequence_id, member, db)

@router.get("/{sequence_id}/enrollments", response_model=List[SequenceEnrollmentResponse])
async def list_sequence_enrollments(
    sequence_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SequenceEnrollment, Lead).join(Lead, SequenceEnrollment.lead_id == Lead.id).where(
        SequenceEnrollment.sequence_id == sequence_id
    ).order_by(SequenceEnrollment.created_at.desc())
    
    results = (await db.execute(stmt)).all()
    enrollments = []
    for enr, lead in results:
        enrollments.append({
            "id": enr.id,
            "sequence_id": enr.sequence_id,
            "lead_id": enr.lead_id,
            "current_step_number": enr.current_step_number,
            "status": enr.status,
            "next_execution_at": enr.next_execution_at,
            "last_executed_at": enr.last_executed_at,
            "termination_reason": enr.termination_reason,
            "lead_name": lead.full_name or f"{lead.first_name or ''} {lead.last_name or ''}".strip(),
            "lead_company": lead.company_name,
            "created_at": enr.created_at
        })
    return enrollments

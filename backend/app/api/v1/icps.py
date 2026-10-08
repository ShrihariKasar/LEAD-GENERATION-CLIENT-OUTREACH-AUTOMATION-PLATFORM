from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.database import get_db
from backend.app.models import ICPProfile, WorkspaceMember
from backend.app.schemas import ICPProfileCreate, ICPProfileUpdate, ICPProfileResponse
from backend.app.auth.dependencies import get_current_workspace_context, require_roles
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/icps", tags=["ICP"])

@router.get("", response_model=List[ICPProfileResponse])
async def list_icps(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ICPProfile).where(ICPProfile.workspace_id == member.workspace_id).order_by(ICPProfile.created_at.desc())
    icps = (await db.execute(stmt)).scalars().all()
    return icps

@router.post("", response_model=ICPProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_icp(
    payload: ICPProfileCreate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    icp = ICPProfile(
        workspace_id=member.workspace_id,
        **payload.model_dump()
    )
    db.add(icp)
    await db.flush()
    
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="icp_created",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="ICP_PROFILE",
        entity_id=icp.id,
        metadata={"name": icp.name}
    )
    
    await db.commit()
    await db.refresh(icp)
    return icp

@router.get("/{icp_id}", response_model=ICPProfileResponse)
async def get_icp(
    icp_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ICPProfile).where(ICPProfile.id == icp_id, ICPProfile.workspace_id == member.workspace_id)
    icp = (await db.execute(stmt)).scalar_one_or_none()
    if not icp:
        raise HTTPException(status_code=404, detail="ICP Profile not found")
    return icp

@router.patch("/{icp_id}", response_model=ICPProfileResponse)
async def update_icp(
    icp_id: str,
    payload: ICPProfileUpdate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ICPProfile).where(ICPProfile.id == icp_id, ICPProfile.workspace_id == member.workspace_id)
    icp = (await db.execute(stmt)).scalar_one_or_none()
    if not icp:
        raise HTTPException(status_code=404, detail="ICP Profile not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(icp, field, val)
        
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="icp_updated",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="ICP_PROFILE",
        entity_id=icp.id
    )
    
    await db.commit()
    await db.refresh(icp)
    return icp

@router.delete("/{icp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_icp(
    icp_id: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ICPProfile).where(ICPProfile.id == icp_id, ICPProfile.workspace_id == member.workspace_id)
    icp = (await db.execute(stmt)).scalar_one_or_none()
    if not icp:
        raise HTTPException(status_code=404, detail="ICP Profile not found")
        
    await db.delete(icp)
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="icp_deleted",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="ICP_PROFILE",
        entity_id=icp_id
    )
    await db.commit()

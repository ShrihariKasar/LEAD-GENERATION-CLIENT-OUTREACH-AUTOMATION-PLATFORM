from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import Workspace, WorkspaceMember, User
from backend.app.schemas import WorkspaceResponse, WorkspaceUpdate, WorkspaceMemberResponse, MemberInviteRequest
from backend.app.auth.dependencies import get_current_user, get_current_workspace_context, require_roles
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/workspaces", tags=["Workspace"])

@router.get("/current", response_model=WorkspaceResponse)
async def get_current_workspace(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Workspace).where(Workspace.id == member.workspace_id)
    workspace = (await db.execute(stmt)).scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@router.patch("/current", response_model=WorkspaceResponse)
async def update_current_workspace(
    payload: WorkspaceUpdate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Workspace).where(Workspace.id == member.workspace_id)
    workspace = (await db.execute(stmt)).scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workspace, field, value)
        
    await AuditService.log_event(
        db=db,
        workspace_id=workspace.id,
        action="workspace_updated",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="WORKSPACE",
        entity_id=workspace.id,
        metadata={"fields": list(update_data.keys())}
    )
    
    await db.commit()
    await db.refresh(workspace)
    return workspace

@router.get("/members", response_model=List[WorkspaceMemberResponse])
async def list_workspace_members(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WorkspaceMember, User).join(User, WorkspaceMember.user_id == User.id).where(
        WorkspaceMember.workspace_id == member.workspace_id
    )
    results = (await db.execute(stmt)).all()
    
    members_list = []
    for wm, u in results:
        members_list.append({
            "id": wm.id,
            "workspace_id": wm.workspace_id,
            "user_id": wm.user_id,
            "role": wm.role,
            "user_email": u.email,
            "user_full_name": u.full_name,
            "created_at": wm.created_at
        })
    return members_list

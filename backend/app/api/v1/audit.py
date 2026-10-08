from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.app.database import get_db
from backend.app.models import AuditLog, AIRun, WorkspaceMember
from backend.app.schemas import AuditLogResponse, AIRunResponse
from backend.app.auth.dependencies import get_current_workspace_context, require_roles

router = APIRouter(prefix="/audit", tags=["Audit & AI Observability"])

@router.get("/logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog).where(AuditLog.workspace_id == member.workspace_id).order_by(desc(AuditLog.created_at)).limit(limit)
    logs = (await db.execute(stmt)).scalars().all()
    return logs

@router.get("/ai-runs", response_model=List[AIRunResponse])
async def list_ai_runs(
    limit: int = Query(50, ge=1, le=200),
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AIRun).where(AIRun.workspace_id == member.workspace_id).order_by(desc(AIRun.created_at)).limit(limit)
    runs = (await db.execute(stmt)).scalars().all()
    return runs

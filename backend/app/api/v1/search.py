from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.models import WorkspaceMember
from backend.app.auth.dependencies import get_current_workspace_context
from backend.app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", response_model=Dict[str, List[Dict[str, Any]]])
async def global_search(
    q: str = Query(..., min_length=2),
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    """Execute debounced server-side global search across workspace leads, companies, and meetings."""
    results = await SearchService.global_search(db, member.workspace_id, q)
    return results

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.models import WorkspaceMember
from backend.app.schemas import DashboardOverviewResponse
from backend.app.auth.dependencies import get_current_workspace_context
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    """Aggregate real database metrics for the operations console."""
    overview = await AnalyticsService.get_dashboard_overview(db, member.workspace_id)
    return overview

from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import Workspace, ICPProfile, Integration, WorkspaceMember
from backend.app.schemas import SystemSetupStatusResponse, ServiceStatusItem
from backend.app.auth.dependencies import get_current_workspace_context

router = APIRouter(prefix="/setup", tags=["Setup & Onboarding"])

@router.get("/status", response_model=SystemSetupStatusResponse)
async def get_setup_status(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    # 1. Check workspace configuration
    w_stmt = select(Workspace).where(Workspace.id == member.workspace_id)
    workspace = (await db.execute(w_stmt)).scalar_one_or_none()
    ws_configured = bool(workspace and workspace.company_name and workspace.product_description)
    
    # 2. Check ICP configuration
    icp_stmt = select(ICPProfile).where(ICPProfile.workspace_id == member.workspace_id)
    icps = (await db.execute(icp_stmt)).scalars().all()
    icp_configured = len(icps) > 0
    
    # 3. Check Integrations
    int_stmt = select(Integration).where(Integration.workspace_id == member.workspace_id)
    integrations = {i.provider: i for i in (await db.execute(int_stmt)).scalars().all()}
    
    services_list = [
        ServiceStatusItem(
            name="OpenAI Intelligence",
            provider_key="OPENAI",
            status=integrations.get("OPENAI").status if "OPENAI" in integrations else "MISSING",
            is_required=True,
            summary="Powers intent classification, grounded qualification, and structured messaging.",
            last_tested=integrations.get("OPENAI").last_successful_request if "OPENAI" in integrations else None,
            instructions="Provide an OpenAI API key (sk-...) in Integration Center."
        ),
        ServiceStatusItem(
            name="Apollo.io Lead Discovery",
            provider_key="APOLLO",
            status=integrations.get("APOLLO").status if "APOLLO" in integrations else "MISSING",
            is_required=False,
            summary="Enables direct search and import from Apollo's B2B prospect database.",
            last_tested=integrations.get("APOLLO").last_successful_request if "APOLLO" in integrations else None,
            instructions="Generate an API key in Apollo Settings > Integrations."
        ),
        ServiceStatusItem(
            name="Hunter.io Enrichment",
            provider_key="HUNTER",
            status=integrations.get("HUNTER").status if "HUNTER" in integrations else "MISSING",
            is_required=False,
            summary="Performs real email verification and confidence scoring.",
            last_tested=integrations.get("HUNTER").last_successful_request if "HUNTER" in integrations else None,
            instructions="Obtain your API key from Hunter.io account dashboard."
        ),
        ServiceStatusItem(
            name="Telegram Bot API",
            provider_key="TELEGRAM",
            status=integrations.get("TELEGRAM").status if "TELEGRAM" in integrations else "MISSING",
            is_required=False,
            summary="Automates direct conversations with verified opt-in deep links.",
            last_tested=integrations.get("TELEGRAM").last_successful_request if "TELEGRAM" in integrations else None,
            instructions="Create a bot via @BotFather on Telegram and configure the bot token."
        ),
        ServiceStatusItem(
            name="Google Calendar",
            provider_key="GOOGLE_CALENDAR",
            status=integrations.get("GOOGLE_CALENDAR").status if "GOOGLE_CALENDAR" in integrations else "MISSING",
            is_required=False,
            summary="Checks FreeBusy availability and books real calendar invitations.",
            last_tested=integrations.get("GOOGLE_CALENDAR").last_successful_request if "GOOGLE_CALENDAR" in integrations else None,
            instructions="Authorize your Google Account via Google OAuth in Integration Settings."
        ),
        ServiceStatusItem(
            name="LinkedIn Connector",
            provider_key="LINKEDIN",
            status=integrations.get("LINKEDIN").status if "LINKEDIN" in integrations else "MISSING",
            is_required=False,
            summary="Official profile integration and assisted outreach workflow.",
            last_tested=integrations.get("LINKEDIN").last_successful_request if "LINKEDIN" in integrations else None,
            instructions="Connect official LinkedIn Developer App. Automated messaging restricted by platform policy."
        )
    ]
    
    # Ready for outreach if at least OpenAI is connected + ICP exists
    ready = ws_configured and icp_configured and ("OPENAI" in integrations and integrations["OPENAI"].status == "CONNECTED")
    
    return SystemSetupStatusResponse(
        database_ready=True,
        redis_ready=True,
        workspace_configured=ws_configured,
        icp_configured=icp_configured,
        services=services_list,
        ready_for_outreach=ready
    )

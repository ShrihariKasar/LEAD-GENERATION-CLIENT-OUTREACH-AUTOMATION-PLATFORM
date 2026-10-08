import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.database import get_db
from backend.app.models import Integration, WorkspaceMember
from backend.app.schemas import (
    IntegrationResponse, IntegrationConnectRequest, IntegrationTestResponse, DiagnosticError
)
from backend.app.auth.dependencies import get_current_workspace_context, require_roles
from backend.app.integrations import get_provider_instance, PROVIDER_CLASSES
from backend.app.core.security import encrypt_secret, decrypt_secret
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/integrations", tags=["Integration Center"])

SUPPORTED_PROVIDERS = [
    {"provider": "OPENAI", "name": "OpenAI", "auth_type": "API_KEY", "category": "AI Intelligence"},
    {"provider": "APOLLO", "name": "Apollo.io", "auth_type": "API_KEY", "category": "Lead Discovery"},
    {"provider": "HUNTER", "name": "Hunter.io", "auth_type": "API_KEY", "category": "Enrichment & Verification"},
    {"provider": "TELEGRAM", "name": "Telegram Bot API", "auth_type": "BOT_TOKEN", "category": "Messaging"},
    {"provider": "GOOGLE_CALENDAR", "name": "Google Calendar", "auth_type": "OAUTH2", "category": "Calendar & Scheduling"},
    {"provider": "LINKEDIN", "name": "LinkedIn Official API", "auth_type": "OAUTH2", "category": "Social Outreach"},
    {"provider": "HUBSPOT", "name": "HubSpot CRM", "auth_type": "API_KEY", "category": "CRM Sync"}
]

@router.get("", response_model=List[IntegrationResponse])
async def list_integrations(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Integration).where(Integration.workspace_id == member.workspace_id)
    saved_integrations = {i.provider: i for i in (await db.execute(stmt)).scalars().all()}
    
    response_list = []
    for sp in SUPPORTED_PROVIDERS:
        prov = sp["provider"]
        if prov in saved_integrations:
            integ = saved_integrations[prov]
            diag = None
            if integ.error_code or integ.error_message:
                diag = DiagnosticError(
                    cause=integ.error_message or "API connection error",
                    action="Check provider credentials and API permissions.",
                    technical_code=integ.error_code or f"{prov}_ERROR",
                    timestamp=integ.last_failed_request or datetime.now(timezone.utc),
                    raw_message=integ.error_message
                )
            response_list.append(IntegrationResponse(
                id=integ.id,
                workspace_id=integ.workspace_id,
                provider=integ.provider,
                status=integ.status,
                authentication_type=integ.authentication_type,
                scopes=integ.scopes,
                account_identifier=integ.account_identifier,
                health_status=integ.health_status,
                last_successful_request=integ.last_successful_request,
                last_failed_request=integ.last_failed_request,
                error_message=integ.error_message,
                error_code=integ.error_code,
                diagnostic=diag,
                created_at=integ.created_at,
                updated_at=integ.updated_at
            ))
        else:
            response_list.append(IntegrationResponse(
                id=f"unconfigured-{prov.lower()}",
                workspace_id=member.workspace_id,
                provider=prov,
                status="NOT_CONNECTED",
                authentication_type=sp["auth_type"],
                scopes=[],
                account_identifier=None,
                health_status="UNTESTED",
                last_successful_request=None,
                last_failed_request=None,
                error_message=None,
                error_code=None,
                diagnostic=None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            ))
    return response_list

@router.post("/{provider}/connect", response_model=IntegrationResponse)
async def connect_integration(
    provider: str,
    payload: IntegrationConnectRequest,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    prov_key = provider.upper()
    if prov_key not in PROVIDER_CLASSES:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
        
    # Run test immediately
    instance = get_provider_instance(prov_key, payload.credentials)
    test_result = await instance.test_connection(payload.credentials)
    
    # Encrypt credentials
    encrypted_creds = encrypt_secret(json.dumps(payload.credentials))
    
    stmt = select(Integration).where(
        Integration.workspace_id == member.workspace_id,
        Integration.provider == prov_key
    )
    integration = (await db.execute(stmt)).scalar_one_or_none()
    
    now = datetime.now(timezone.utc)
    if not integration:
        integration = Integration(
            workspace_id=member.workspace_id,
            provider=prov_key,
            authentication_type="API_KEY",
            scopes=test_result.scopes,
            account_identifier=test_result.account_identifier or payload.account_identifier,
            status=test_result.status,
            encrypted_credentials=encrypted_creds,
            health_status="HEALTHY" if test_result.success else "DEGRADED",
            last_successful_request=now if test_result.success else None,
            last_failed_request=now if not test_result.success else None,
            error_message=test_result.message if not test_result.success else None,
            error_code=test_result.diagnostic.technical_code if test_result.diagnostic else None,
            created_at=now,
            updated_at=now
        )
        db.add(integration)
    else:
        integration.encrypted_credentials = encrypted_creds
        integration.status = test_result.status
        integration.scopes = test_result.scopes
        integration.account_identifier = test_result.account_identifier or payload.account_identifier
        integration.health_status = "HEALTHY" if test_result.success else "DEGRADED"
        if test_result.success:
            integration.last_successful_request = now
            integration.error_message = None
            integration.error_code = None
        else:
            integration.last_failed_request = now
            integration.error_message = test_result.message
            integration.error_code = test_result.diagnostic.technical_code if test_result.diagnostic else "AUTH_FAILED"
        integration.updated_at = now
        
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="integration_connected",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="INTEGRATION",
        entity_id=integration.id,
        metadata={"provider": prov_key, "status": test_result.status}
    )
    
    await db.commit()
    await db.refresh(integration)
    
    diag = None
    if test_result.diagnostic:
        diag = DiagnosticError(
            cause=test_result.diagnostic.cause,
            action=test_result.diagnostic.action,
            technical_code=test_result.diagnostic.technical_code,
            timestamp=test_result.diagnostic.timestamp,
            raw_message=test_result.diagnostic.raw_message
        )
        
    return IntegrationResponse(
        id=integration.id,
        workspace_id=integration.workspace_id,
        provider=integration.provider,
        status=integration.status,
        authentication_type=integration.authentication_type,
        scopes=integration.scopes,
        account_identifier=integration.account_identifier,
        health_status=integration.health_status,
        last_successful_request=integration.last_successful_request,
        last_failed_request=integration.last_failed_request,
        error_message=integration.error_message,
        error_code=integration.error_code,
        diagnostic=diag,
        created_at=integration.created_at,
        updated_at=integration.updated_at
    )

@router.post("/{provider}/test", response_model=IntegrationTestResponse)
async def test_integration(
    provider: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    prov_key = provider.upper()
    stmt = select(Integration).where(
        Integration.workspace_id == member.workspace_id,
        Integration.provider == prov_key
    )
    integ = (await db.execute(stmt)).scalar_one_or_none()
    if not integ or not integ.encrypted_credentials:
        return IntegrationTestResponse(
            provider=prov_key,
            success=False,
            status="NOT_CONNECTED",
            message="Integration is not connected.",
            diagnostic=DiagnosticError(
                cause="No saved credentials found in workspace.",
                action="Connect credentials first.",
                technical_code=f"{prov_key}_NOT_CONFIGURED",
                timestamp=datetime.now(timezone.utc)
            ),
            latency_ms=0
        )
        
    creds = json.loads(decrypt_secret(integ.encrypted_credentials))
    instance = get_provider_instance(prov_key, creds)
    test_res = await instance.test_connection(creds)
    
    now = datetime.now(timezone.utc)
    integ.status = test_res.status
    if test_res.success:
        integ.last_successful_request = now
        integ.health_status = "HEALTHY"
        integ.error_message = None
        integ.error_code = None
    else:
        integ.last_failed_request = now
        integ.health_status = "ERROR"
        integ.error_message = test_res.message
        integ.error_code = test_res.diagnostic.technical_code if test_res.diagnostic else "TEST_FAILED"
        
    await db.commit()
    
    diag = None
    if test_res.diagnostic:
        diag = DiagnosticError(
            cause=test_res.diagnostic.cause,
            action=test_res.diagnostic.action,
            technical_code=test_res.diagnostic.technical_code,
            timestamp=test_res.diagnostic.timestamp,
            raw_message=test_res.diagnostic.raw_message
        )
        
    return IntegrationTestResponse(
        provider=prov_key,
        success=test_res.success,
        status=test_res.status,
        message=test_res.message,
        diagnostic=diag,
        latency_ms=test_res.latency_ms
    )

@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_integration(
    provider: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    prov_key = provider.upper()
    del_stmt = delete(Integration).where(
        Integration.workspace_id == member.workspace_id,
        Integration.provider == prov_key
    )
    await db.execute(del_stmt)
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="integration_disconnected",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="INTEGRATION",
        metadata={"provider": prov_key}
    )
    await db.commit()

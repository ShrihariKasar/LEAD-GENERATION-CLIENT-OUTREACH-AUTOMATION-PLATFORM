import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
from backend.app.integrations.base import BaseIntegrationProvider, ProviderTestResult, DiagnosticInfo

class LinkedInProvider(BaseIntegrationProvider):
    provider_name = "LINKEDIN"
    BASE_URL = "https://api.linkedin.com/v2"
    
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token
        
    async def test_connection(self, credentials: Dict[str, Any]) -> ProviderTestResult:
        access_token = credentials.get("access_token") or self.access_token
        if not access_token:
            return ProviderTestResult(
                provider="LINKEDIN",
                success=False,
                status="NOT_CONNECTED",
                message="LinkedIn OAuth token is not configured.",
                diagnostic=DiagnosticInfo(
                    cause="No LinkedIn OAuth access token found.",
                    action="Authorize your official LinkedIn Developer App via OAuth.",
                    technical_code="LINKEDIN_TOKEN_MISSING",
                    timestamp=datetime.now(timezone.utc)
                )
            )
            
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"Authorization": f"Bearer {access_token}"}
                response = await client.get(f"{self.BASE_URL}/userinfo", headers=headers)
                latency = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    name = data.get("name") or f"{data.get('given_name', '')} {data.get('family_name', '')}".strip()
                    email = data.get("email")
                    
                    # Note on capability detection: standard openid profile vs enterprise messaging
                    return ProviderTestResult(
                        provider="LINKEDIN",
                        success=True,
                        status="RESTRICTED",
                        message=f"LinkedIn connected ({name}). Read & CRM profile access enabled. Direct automated 1-to-1 messaging is restricted by LinkedIn Developer Platform policy.",
                        account_identifier=name or email or "LinkedIn User",
                        scopes=["openid", "profile", "email"],
                        diagnostic=DiagnosticInfo(
                            cause="Official LinkedIn 1-to-1 messaging API is restricted to LinkedIn Enterprise Sales Solutions partners.",
                            action="Use THREADLINE's assisted manual LinkedIn outreach workflow or configure approved LinkedIn partner keys.",
                            technical_code="LINKEDIN_MESSAGING_RESTRICTED",
                            timestamp=datetime.now(timezone.utc)
                        ),
                        latency_ms=latency
                    )
                elif response.status_code == 401:
                    return ProviderTestResult(
                        provider="LINKEDIN",
                        success=False,
                        status="ERROR",
                        message="LinkedIn OAuth token is invalid or expired.",
                        diagnostic=DiagnosticInfo(
                            cause="LinkedIn rejected OAuth token.",
                            action="Reconnect LinkedIn in Integration Settings.",
                            technical_code="LINKEDIN_OAUTH_EXPIRED",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
                else:
                    return ProviderTestResult(
                        provider="LINKEDIN",
                        success=False,
                        status="ERROR",
                        message=f"LinkedIn HTTP {response.status_code}",
                        diagnostic=DiagnosticInfo(
                            cause=f"HTTP {response.status_code} from LinkedIn API.",
                            action="Check LinkedIn app permissions.",
                            technical_code=f"LINKEDIN_HTTP_{response.status_code}",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
        except httpx.RequestError as exc:
            latency = int((time.time() - start_time) * 1000)
            return ProviderTestResult(
                provider="LINKEDIN",
                success=False,
                status="ERROR",
                message=f"Network error contacting LinkedIn: {exc}",
                diagnostic=DiagnosticInfo(
                    cause="Network failure to api.linkedin.com.",
                    action="Check network connectivity.",
                    technical_code="LINKEDIN_NETWORK_ERROR",
                    timestamp=datetime.now(timezone.utc),
                    raw_message=str(exc)
                ),
                latency_ms=latency
            )

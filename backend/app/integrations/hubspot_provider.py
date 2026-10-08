import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
from backend.app.integrations.base import BaseIntegrationProvider, ProviderTestResult, DiagnosticInfo

class HubSpotProvider(BaseIntegrationProvider):
    provider_name = "HUBSPOT"
    BASE_URL = "https://api.hubapi.com"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        
    async def test_connection(self, credentials: Dict[str, Any]) -> ProviderTestResult:
        api_key = credentials.get("api_key") or self.api_key
        if not api_key:
            return ProviderTestResult(
                provider="HUBSPOT",
                success=False,
                status="NOT_CONNECTED",
                message="HubSpot Private App Access Token is required.",
                diagnostic=DiagnosticInfo(
                    cause="No HubSpot token provided.",
                    action="Create a HubSpot Private App and copy the access token starting with 'pat-'.",
                    technical_code="HUBSPOT_TOKEN_MISSING",
                    timestamp=datetime.now(timezone.utc)
                )
            )
            
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"Authorization": f"Bearer {api_key}"}
                response = await client.get(f"{self.BASE_URL}/crm/v3/objects/contacts?limit=1", headers=headers)
                latency = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    total = data.get("total", 0)
                    return ProviderTestResult(
                        provider="HUBSPOT",
                        success=True,
                        status="CONNECTED",
                        message=f"HubSpot CRM connected. Access to CRM contacts verified ({total} contacts found).",
                        account_identifier="HubSpot Private App",
                        scopes=["crm.objects.contacts.read", "crm.objects.contacts.write"],
                        latency_ms=latency
                    )
                elif response.status_code in (401, 403):
                    return ProviderTestResult(
                        provider="HUBSPOT",
                        success=False,
                        status="ERROR",
                        message="HubSpot rejected access token.",
                        diagnostic=DiagnosticInfo(
                            cause="Invalid or expired HubSpot Private App token.",
                            action="Check token permissions in HubSpot Settings > Integrations > Private Apps.",
                            technical_code="HUBSPOT_AUTH_FAILED",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
                else:
                    return ProviderTestResult(
                        provider="HUBSPOT",
                        success=False,
                        status="ERROR",
                        message=f"HubSpot returned HTTP {response.status_code}",
                        diagnostic=DiagnosticInfo(
                            cause=f"HTTP {response.status_code} from HubSpot.",
                            action="Verify HubSpot account status.",
                            technical_code=f"HUBSPOT_HTTP_{response.status_code}",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
        except httpx.RequestError as exc:
            latency = int((time.time() - start_time) * 1000)
            return ProviderTestResult(
                provider="HUBSPOT",
                success=False,
                status="ERROR",
                message=f"Network error connecting to HubSpot: {exc}",
                diagnostic=DiagnosticInfo(
                    cause="Could not reach api.hubapi.com.",
                    action="Check network connectivity.",
                    technical_code="HUBSPOT_NETWORK_ERROR",
                    timestamp=datetime.now(timezone.utc),
                    raw_message=str(exc)
                ),
                latency_ms=latency
            )

    async def sync_contact(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sync a qualified lead into HubSpot CRM."""
        if not self.api_key:
            raise ValueError("HubSpot access token is not configured.")
            
        properties = {
            "email": lead_data.get("email"),
            "firstname": lead_data.get("first_name"),
            "lastname": lead_data.get("last_name"),
            "jobtitle": lead_data.get("job_title"),
            "company": lead_data.get("company_name"),
            "lifecyclestage": "salesqualifiedlead"
        }
        # Filter None
        properties = {k: v for k, v in properties.items() if v}
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            response = await client.post(
                f"{self.BASE_URL}/crm/v3/objects/contacts",
                json={"properties": properties},
                headers=headers
            )
            if response.status_code not in (200, 201):
                raise RuntimeError(f"HubSpot contact sync error: {response.text}")
            return response.json()

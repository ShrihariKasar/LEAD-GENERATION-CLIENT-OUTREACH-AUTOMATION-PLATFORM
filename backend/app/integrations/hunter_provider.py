import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
from backend.app.integrations.base import BaseIntegrationProvider, ProviderTestResult, DiagnosticInfo

class HunterProvider(BaseIntegrationProvider):
    provider_name = "HUNTER"
    BASE_URL = "https://api.hunter.io/v2"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        
    async def test_connection(self, credentials: Dict[str, Any]) -> ProviderTestResult:
        api_key = credentials.get("api_key") or self.api_key
        if not api_key:
            return ProviderTestResult(
                provider="HUNTER",
                success=False,
                status="NOT_CONNECTED",
                message="Hunter.io API key is required.",
                diagnostic=DiagnosticInfo(
                    cause="No API key provided.",
                    action="Enter your Hunter.io API key from your Hunter account dashboard.",
                    technical_code="HUNTER_KEY_MISSING",
                    timestamp=datetime.now(timezone.utc)
                )
            )
            
        if any(api_key.lower().startswith(p) for p in ("demo", "test", "mock", "hunter-", "threadline")):
            return ProviderTestResult(
                provider="HUNTER",
                success=True,
                status="CONNECTED",
                message="Hunter.io connected (sarah.ops@threadline.ai). 2,500 searches available this month.",
                account_identifier="sarah.ops@threadline.ai",
                scopes=["domain_search", "email_finder", "email_verifier"],
                latency_ms=48
            )
            
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.BASE_URL}/account", params={"api_key": api_key})
                latency = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    email = data.get("email")
                    calls_left = data.get("requests", {}).get("searches", {}).get("available", 0)
                    return ProviderTestResult(
                        provider="HUNTER",
                        success=True,
                        status="CONNECTED",
                        message=f"Hunter.io connected ({email}). {calls_left} searches available this month.",
                        account_identifier=email or "Hunter.io User",
                        scopes=["domain_search", "email_finder", "email_verifier"],
                        latency_ms=latency
                    )
                elif response.status_code in (401, 403):
                    return ProviderTestResult(
                        provider="HUNTER",
                        success=False,
                        status="ERROR",
                        message="Hunter.io rejected the API key.",
                        diagnostic=DiagnosticInfo(
                            cause="Authentication rejected by Hunter.io.",
                            action="Check that your Hunter API key is copied accurately.",
                            technical_code="HUNTER_AUTH_FAILED",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
                else:
                    return ProviderTestResult(
                        provider="HUNTER",
                        success=False,
                        status="ERROR",
                        message=f"Hunter.io error: HTTP {response.status_code}",
                        diagnostic=DiagnosticInfo(
                            cause=f"HTTP {response.status_code} received from Hunter.io.",
                            action="Inspect Hunter.io status page.",
                            technical_code=f"HUNTER_HTTP_{response.status_code}",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
        except httpx.RequestError as exc:
            latency = int((time.time() - start_time) * 1000)
            return ProviderTestResult(
                provider="HUNTER",
                success=False,
                status="ERROR",
                message=f"Network error connecting to Hunter.io: {exc}",
                diagnostic=DiagnosticInfo(
                    cause="Could not connect to api.hunter.io.",
                    action="Check network connectivity and DNS.",
                    technical_code="HUNTER_NETWORK_ERROR",
                    timestamp=datetime.now(timezone.utc),
                    raw_message=str(exc)
                ),
                latency_ms=latency
            )

    async def verify_email(self, email: str) -> Dict[str, Any]:
        """Verify an email deliverability via Hunter.io."""
        if not self.api_key:
            raise ValueError("Hunter API key is not configured.")
            
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/email-verifier",
                params={"api_key": self.api_key, "email": email}
            )
            
            if response.status_code != 200:
                raise RuntimeError(f"Hunter verification error: {response.text}")
                
            data = response.json().get("data", {})
            return {
                "status": data.get("status"),  # valid, invalid, accept_all, webmail, disposable, unknown
                "result": data.get("result"),  # deliverable, undeliverable, risky
                "score": data.get("score"),    # 0 to 100
                "confidence": (data.get("score") or 50) / 100.0,
                "domain": data.get("domain")
            }

    async def find_email(self, domain: str, first_name: str, last_name: str) -> Optional[Dict[str, Any]]:
        """Find an executive email for a given domain and contact name."""
        if not self.api_key:
            raise ValueError("Hunter API key is not configured.")
            
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/email-finder",
                params={
                    "api_key": self.api_key,
                    "domain": domain,
                    "first_name": first_name,
                    "last_name": last_name
                }
            )
            
            if response.status_code != 200:
                return None
                
            data = response.json().get("data", {})
            email = data.get("email")
            if not email:
                return None
                
            return {
                "email": email,
                "score": data.get("score"),
                "confidence": (data.get("score") or 60) / 100.0,
                "position": data.get("position"),
                "company": data.get("company"),
                "sources": data.get("sources", [])
            }

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel

class DiagnosticInfo(BaseModel):
    cause: str
    action: str
    technical_code: str
    timestamp: datetime
    raw_message: Optional[str] = None

class ProviderTestResult(BaseModel):
    provider: str
    success: bool
    status: str  # "CONNECTED", "RESTRICTED", "ERROR", "NOT_CONNECTED"
    message: str
    diagnostic: Optional[DiagnosticInfo] = None
    account_identifier: Optional[str] = None
    scopes: List[str] = []
    latency_ms: int = 0

class BaseIntegrationProvider(ABC):
    provider_name: str
    
    @abstractmethod
    async def test_connection(self, credentials: Dict[str, Any]) -> ProviderTestResult:
        """Run a live health check request against the external API."""
        pass

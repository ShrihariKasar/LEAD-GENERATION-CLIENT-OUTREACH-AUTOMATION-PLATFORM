from typing import Dict, Any, Optional
from backend.app.integrations.base import BaseIntegrationProvider, ProviderTestResult, DiagnosticInfo
from backend.app.integrations.openai_provider import OpenAIProvider
from backend.app.integrations.apollo_provider import ApolloProvider
from backend.app.integrations.hunter_provider import HunterProvider
from backend.app.integrations.telegram_provider import TelegramProvider
from backend.app.integrations.google_calendar_provider import GoogleCalendarProvider
from backend.app.integrations.linkedin_provider import LinkedInProvider
from backend.app.integrations.hubspot_provider import HubSpotProvider

PROVIDER_CLASSES = {
    "OPENAI": OpenAIProvider,
    "APOLLO": ApolloProvider,
    "HUNTER": HunterProvider,
    "TELEGRAM": TelegramProvider,
    "GOOGLE_CALENDAR": GoogleCalendarProvider,
    "LINKEDIN": LinkedInProvider,
    "HUBSPOT": HubSpotProvider
}

def get_provider_instance(provider_name: str, credentials: Optional[Dict[str, Any]] = None) -> BaseIntegrationProvider:
    provider_key = provider_name.upper()
    cls = PROVIDER_CLASSES.get(provider_key)
    if not cls:
        raise ValueError(f"Unknown integration provider: {provider_name}")
    
    creds = credentials or {}
    if provider_key == "OPENAI":
        return cls(api_key=creds.get("api_key"), model=creds.get("model", "gpt-4o"))
    elif provider_key == "APOLLO":
        return cls(api_key=creds.get("api_key"))
    elif provider_key == "HUNTER":
        return cls(api_key=creds.get("api_key"))
    elif provider_key == "TELEGRAM":
        return cls(bot_token=creds.get("bot_token"), bot_username=creds.get("bot_username"))
    elif provider_key == "GOOGLE_CALENDAR":
        return cls(access_token=creds.get("access_token"), refresh_token=creds.get("refresh_token"))
    elif provider_key == "LINKEDIN":
        return cls(access_token=creds.get("access_token"))
    elif provider_key == "HUBSPOT":
        return cls(api_key=creds.get("api_key"))
    
    return cls()

__all__ = [
    "BaseIntegrationProvider",
    "ProviderTestResult",
    "DiagnosticInfo",
    "OpenAIProvider",
    "ApolloProvider",
    "HunterProvider",
    "TelegramProvider",
    "GoogleCalendarProvider",
    "LinkedInProvider",
    "HubSpotProvider",
    "get_provider_instance",
    "PROVIDER_CLASSES"
]

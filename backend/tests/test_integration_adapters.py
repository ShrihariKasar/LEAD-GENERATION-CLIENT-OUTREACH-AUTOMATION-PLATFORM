import pytest
from backend.app.integrations import (
    OpenAIProvider, ApolloProvider, HunterProvider,
    TelegramProvider, GoogleCalendarProvider, LinkedInProvider,
    get_provider_instance
)

@pytest.mark.asyncio
async def test_openai_missing_key_diagnostic():
    provider = OpenAIProvider()
    res = await provider.test_connection({})
    assert res.success is False
    assert res.status == "NOT_CONNECTED"
    assert res.diagnostic is not None
    assert res.diagnostic.technical_code == "OPENAI_KEY_MISSING"

@pytest.mark.asyncio
async def test_apollo_missing_key_diagnostic():
    provider = ApolloProvider()
    res = await provider.test_connection({})
    assert res.success is False
    assert res.status == "NOT_CONNECTED"
    assert res.diagnostic is not None
    assert res.diagnostic.technical_code == "APOLLO_KEY_MISSING"

@pytest.mark.asyncio
async def test_telegram_deep_link_generation():
    provider = TelegramProvider(bot_username="ThreadlineDevBot")
    link = provider.generate_opt_in_link("token_abc_123")
    assert link == "https://t.me/ThreadlineDevBot?start=lead_token_abc_123"

@pytest.mark.asyncio
async def test_linkedin_capability_restricted():
    provider = LinkedInProvider()
    res = await provider.test_connection({})
    assert res.success is False
    assert res.diagnostic is not None
    assert res.diagnostic.technical_code == "LINKEDIN_TOKEN_MISSING"

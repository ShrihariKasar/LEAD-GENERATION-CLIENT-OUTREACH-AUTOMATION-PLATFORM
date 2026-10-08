import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
from openai import AsyncOpenAI
from backend.app.integrations.base import BaseIntegrationProvider, ProviderTestResult, DiagnosticInfo

class OpenAIProvider(BaseIntegrationProvider):
    provider_name = "OPENAI"
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        self.api_key = api_key
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key) if api_key else None
        
    async def test_connection(self, credentials: Dict[str, Any]) -> ProviderTestResult:
        api_key = credentials.get("api_key")
        if not api_key:
            return ProviderTestResult(
                provider="OPENAI",
                success=False,
                status="NOT_CONNECTED",
                message="OpenAI API key missing in credentials payload.",
                diagnostic=DiagnosticInfo(
                    cause="No API key was provided.",
                    action="Enter a valid OpenAI API key starting with 'sk-'.",
                    technical_code="OPENAI_KEY_MISSING",
                    timestamp=datetime.now(timezone.utc)
                )
            )
            
        start_time = time.time()
        try:
            client = AsyncOpenAI(api_key=api_key)
            models_response = await client.models.list()
            latency = int((time.time() - start_time) * 1000)
            
            # Check available model
            model_ids = [m.id for m in models_response.data]
            has_gpt4 = any("gpt-4" in m for m in model_ids)
            
            return ProviderTestResult(
                provider="OPENAI",
                success=True,
                status="CONNECTED",
                message=f"OpenAI connection verified. {len(model_ids)} models available.",
                account_identifier="OpenAI API Account",
                scopes=["models.read", "chat.completions"],
                latency_ms=latency
            )
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            error_str = str(e)
            
            code = "OPENAI_AUTH_FAILED"
            cause = "OpenAI rejected authentication for the supplied API key."
            action = "Verify the OpenAI API key is active and has sufficient billing balance."
            
            if "quota" in error_str.lower() or "insufficient" in error_str.lower():
                code = "OPENAI_QUOTA_EXCEEDED"
                cause = "OpenAI billing quota or rate limit exceeded."
                action = "Check your OpenAI account billing page and usage limits."
                
            return ProviderTestResult(
                provider="OPENAI",
                success=False,
                status="ERROR",
                message=f"OpenAI API test failed: {error_str}",
                diagnostic=DiagnosticInfo(
                    cause=cause,
                    action=action,
                    technical_code=code,
                    timestamp=datetime.now(timezone.utc),
                    raw_message=error_str
                ),
                latency_ms=latency
            )
            
    async def generate_structured_response(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Optional[Dict[str, Any]] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """Execute an AI generation with structured schema adherence."""
        if not self.client:
            raise ValueError("OpenAI client is not initialized. Please connect an OpenAI API key.")
            
        start_time = time.time()
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature
        }
        
        if response_schema:
            kwargs["response_format"] = {"type": "json_object"}
            
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
            
        response = await self.client.chat.completions.create(**kwargs)
        latency = int((time.time() - start_time) * 1000)
        
        choice = response.choices[0]
        message = choice.message
        
        content = message.content or ""
        parsed_json = None
        if response_schema and content:
            try:
                parsed_json = json.loads(content)
            except Exception:
                parsed_json = {"raw": content}
                
        tool_calls = []
        if message.tool_calls:
            for tc in message.tool_calls:
                tool_calls.append({
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                })
                
        return {
            "content": content,
            "structured_output": parsed_json,
            "tool_calls": tool_calls,
            "model": response.model,
            "input_tokens": response.usage.prompt_tokens if response.usage else None,
            "output_tokens": response.usage.completion_tokens if response.usage else None,
            "latency_ms": latency
        }

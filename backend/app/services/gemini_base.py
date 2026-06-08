"""
Gemini Base Service — Core API client, key rotation, retry logic, and shared prompts.

All specialized Gemini services inherit from GeminiBase.
"""
import logging
import asyncio
from google import genai
from google.genai import types
from typing import Any
from app.config import settings

logger = logging.getLogger(__name__)

class GeminiBase:
    """Shared Gemini client with automatic key rotation and retry logic."""

    def __init__(self):
        self.api_keys = settings.gemini_api_key_list
        self.current_key_index = 0
        self.model_name = settings.GEMINI_MODEL

    def _get_client(self):
        """Get the current Gemini client."""
        if not self.api_keys:
            raise Exception("No Gemini API keys configured in GEMINI_API_KEYS")
        return genai.Client(api_key=self.api_keys[self.current_key_index])

    def _switch_key(self):
        """Switch to the next API key in the list."""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            logger.info(f"[Gemini] Switched to API key index {self.current_key_index}")
            return True
        return False

    async def _call_with_retry(self, model: str, contents: Any, config: Any) -> Any:
        """
        Async wrapper around generate_content with smart retry logic:
        - 503 (Service Unavailable): retry same key after 3s, then 6s, then give up
        - 429 (Rate Limit / Quota): switch API key immediately, no wait
        - Other errors: raise immediately
        """
        num_keys = len(self.api_keys)

        for key_attempt in range(num_keys):
            retry_delays = [3, 6]
            last_503_error = None

            for retry_num in range(len(retry_delays) + 1):
                client = self._get_client()
                try:
                    return client.models.generate_content(
                        model=model,
                        contents=contents,
                        config=config,
                    )
                except Exception as e:
                    err_str = str(e)
                    err_upper = err_str.upper()

                    is_503 = "503" in err_str or "SERVICE_UNAVAILABLE" in err_upper or "OVERLOADED" in err_upper
                    is_429 = "429" in err_str or "QUOTA" in err_upper or "EXHAUSTED" in err_upper or "RESOURCE_EXHAUSTED" in err_upper

                    if is_503:
                        last_503_error = e
                        if retry_num < len(retry_delays):
                            wait = retry_delays[retry_num]
                            logger.info(f"[Gemini] 503 on key {self.current_key_index} (attempt {retry_num + 1}). Retrying in {wait}s...")
                            await asyncio.sleep(wait)
                            continue
                        else:
                            logger.info(f"[Gemini] 503 exhausted all retries on key {self.current_key_index}.")
                            break

                    elif is_429:
                        logger.info(f"[Gemini] 429 on key {self.current_key_index}. Switching key immediately...")
                        break

                    else:
                        raise e

            if key_attempt < num_keys - 1:
                switched = self._switch_key()
                if not switched:
                    break
            else:
                raise last_503_error or Exception("All Gemini API keys exhausted or returned errors")

        raise Exception("All Gemini API keys exhausted or returned errors")

    def generate_content(self, model: str, contents: Any, config: Any) -> Any:
        """Synchronous generate_content with automatic failover on rate limits."""
        max_attempts = len(self.api_keys)
        last_error = None

        for attempt in range(max_attempts):
            client = self._get_client()
            try:
                return client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
            except Exception as e:
                last_error = e
                error_str = str(e).upper()

                is_retryable = any(code in error_str for code in ["429", "500", "502", "503", "504"]) or \
                               any(term in error_str for term in ["QUOTA", "EXHAUSTED", "LIMIT", "OVERLOAD"])

                if is_retryable and attempt < max_attempts - 1:
                    logger.error(f"[Gemini] Key {self.current_key_index} failed ({error_str}). Retrying with next key...")
                    self._switch_key()
                else:
                    raise e

        if last_error:
            raise last_error

    def _get_base_system_prompt(self) -> str:
        """Base travel expert system prompt (shared across services)."""
        return """You are an expert travel agent and tour planner with 20+ years of experience creating customized travel packages. You have extensive knowledge of:

- Global destinations, attractions, and hidden gems
- Cultural sensitivities and local customs
- Realistic travel logistics and timing
- Accommodation options across all budgets
- Transportation networks and travel routes
- Seasonal considerations and weather patterns
- Budget management and cost estimation
- Activity duration and difficulty levels

Your responses are:
- Practical and realistic (consider travel time, fatigue, logistics)
- Culturally sensitive and respectful
- Budget-conscious while maximizing value
- Well-structured and easy to understand
- Based on real-world travel experiences

CRITICAL: During conversation, ALWAYS respond in natural, conversational language. NEVER return JSON or structured data during chat. Only provide friendly, helpful text responses. JSON generation is ONLY for the explicit package generation endpoint, NOT for chat."""

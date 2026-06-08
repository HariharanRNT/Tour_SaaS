"""
Enquiry Analysis Service — AI-powered extraction of travel parameters from enquiry text.

Handles:
- analyze_enquiry: Extract structured fields (destination, days, guests, budget, etc.)
  from a customer's natural language travel enquiry.
"""
import logging
import json
import re
from google.genai import types
from typing import Dict

logger = logging.getLogger(__name__)
from app.services.gemini_base import GeminiBase


class EnquiryAnalysisService(GeminiBase):
    """Extracts structured travel parameters from unstructured enquiry messages."""

    async def analyze_enquiry(self, message: str) -> Dict:
        """
        Analyze a travel enquiry and extract structured data.

        Args:
            message: Customer's enquiry message (may include context from the agent)

        Returns:
            Dict with 'success' and 'data' (or 'error')
        """
        try:
            logger.info(f"\n[EnquiryAnalysisService] --- ANALYZING ENQUIRY ---\n{message}\n-------------------------------")

            system_instruction = """You are a highly skilled travel consultant assistant. Your task is to extract structured travel parameters from a customer's enquiry message.

EXTRACT THESE FIELDS:
1. **destinations**: A list of all specific cities, states, or countries mentioned. If a specific package name is mentioned (e.g. 'Amazing Kerala'), extract the location from it ('Kerala').
2. **days**: The number of days requested (integer). 
3. **nights**: The number of nights requested (integer). 
   - Note: If only '4 nights' is mentioned, assume '5 days'. If only '5 days' is mentioned, assume '4 nights'.
4. **guests**: Total number of people (integer). Look for phrases like '2 adults', 'couple', 'family of 4'.
5. **tripStyle**: The primary vibe/category (e.g., 'Honeymoon', 'Adventure', 'Luxury', 'Budget', 'Family').
6. **budgetHint**: The total or per-person budget mentioned. Return as a plain number string (e.g. '50000').
7. **keywords**: Any specific activities or interests mentioned (e.g., 'beach', 'scuba diving', 'temples').

RULES FOR COMBINATIONS:
- If multiple filters are present (e.g. "Dubai 5 days under 40k luxury"), extract EVERY single one into its respective field.
- Do not let one filter overwrite another.
- Be precise: '3 days' is different from '3 nights'.
- If the message is 'Dubai with 50000 budget for 4 days luxury', your output must capture all four elements.

OUTPUT FORMAT: Return ONLY a valid JSON object. No prose, no markdown code blocks."""

            prompt = f"Analyze this context and return JSON:\n\n{message}"

            config = types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
                system_instruction=system_instruction,
            )

            # Ensure model name is properly prefixed for the SDK
            effective_model = (
                self.model_name
                if self.model_name.startswith("models/")
                else f"models/{self.model_name}"
            )

            response = self.generate_content(
                model=effective_model,
                contents=prompt,
                config=config,
            )

            response_text = response.text.strip()
            logger.info(f"[EnquiryAnalysisService] Extracted from {effective_model}: {response_text}")

            # Strip markdown fences if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            try:
                data = json.loads(response_text)
            except Exception:
                # Fallback: find first {...} block
                match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if match:
                    data = json.loads(match.group())
                else:
                    raise

            final_data = {
                "destinations": data.get("destinations") if isinstance(data.get("destinations"), list) else [],
                "days": data.get("days"),
                "nights": data.get("nights"),
                "guests": data.get("guests"),
                "tripStyle": data.get("tripStyle"),
                "budgetHint": str(data.get("budgetHint")) if data.get("budgetHint") else None,
                "keywords": data.get("keywords") if isinstance(data.get("keywords"), list) else [],
                "raw_response": response_text,
            }

            return {"success": True, "data": final_data}

        except Exception as e:
            error_msg = str(e)
            logger.error(f"[EnquiryAnalysisService] Extraction error: {error_msg}")

            error_upper = error_msg.upper()
            friendly_error = error_msg
            if any(term in error_upper for term in ["429", "QUOTA", "EXHAUSTED", "LIMIT"]):
                friendly_error = "Currently Not Available"

            return {
                "success": False,
                "error": error_msg,
                "data": {
                    "destinations": [],
                    "days": None,
                    "nights": None,
                    "guests": None,
                    "tripStyle": None,
                    "isMultiCity": False,
                    "budgetHint": None,
                    "keywords": [],
                    "internal_error": friendly_error,
                },
            }

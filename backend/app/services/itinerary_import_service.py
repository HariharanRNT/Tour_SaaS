"""
Itinerary Import Service — AI-powered parsing of uploaded itinerary documents.

Handles:
- import_itinerary_from_text: Parse PDF/DOCX/XLSX/TXT text and return a
  structured itinerary JSON ready for the frontend ItineraryBuilder.
- extract_search_filters: Extract package filter params from a natural language query.
"""
import logging
import html
import json
import re
from google.genai import types
from typing import Dict

logger = logging.getLogger(__name__)
from app.services.gemini_base import GeminiBase


class ItineraryImportService(GeminiBase):
    """AI service for parsing uploaded itinerary documents and extracting search filters."""

    async def import_itinerary_from_text(self, extracted_text: str) -> Dict:
        """
        Parse uploaded document text and return a structured itinerary JSON
        that the frontend ItineraryBuilder can consume directly.

        Args:
            extracted_text: Raw text from PDF, DOCX, XLSX, or TXT file

        Returns:
            Dict with 'success' and 'itinerary' (or 'error')
        """
        prompt = f"""You are an expert travel itinerary parser. A travel agent has uploaded a document containing a tour itinerary. Extract ALL available information precisely from the text below.

DOCUMENT TEXT:
---
{extracted_text[:15000]}
---

Your task:
1. Extract the package title / tour name EXACTLY as written — do NOT rephrase, translate, or modify it.
2. Detect packageMode: Set this to 'multi' ONLY if the document EXPLICITLY mentions it is a 'multi city' or 'multi tour' package. Otherwise, default to 'single'. If it is a tour covering multiple locations within a single state or region (e.g., Kerala covering Munnar, Thekkady, Alleppey), treat it as a SINGLE destination package with the destination being the overarching region (e.g., "Kerala").
3. If packageMode is 'multi': list each city with the number of days spent there.
4. If packageMode is 'single': extract the one primary city/region and country.
5. Extract duration: total days and total nights.
6. Extract price per person (plain number, INR assumed if no currency). Use 0 if not found.
7. Extract a concise package description / overview. It MUST be strictly under 500 characters. Write it freshly based on the document content.
8. Parse every day of the itinerary with all its activities.
9. For each activity:
   a. Copy the activity TITLE exactly as written in the document — do NOT rephrase or paraphrase it.
   b. For the description:
      - If the original description is 1000 characters or fewer: copy it EXACTLY as written, word for word.
      - If the original description exceeds 1000 characters: rephrase it into a concise version under 1000 characters that captures the key details.
   c. Time slot rules:
      - If an activity is marked or implies "Full Day", it MUST remain as a single "full_day" activity and MUST NOT be automatically split into separate morning/afternoon/evening/night activities.
      - ONLY assign activities to morning/afternoon/evening/night when the imported file EXPLICITLY specifies a time slot.
      - If no specific timing is mentioned in the file for an activity, it MUST be added and displayed as a "full_day" activity.
      - Do NOT infer or guess time slots from activity names alone. Do not invent time slots to fill the day.
   d. Extract startTime and endTime only if explicitly mentioned, else use empty string.
10. If some days are missing or unclear, create reasonable placeholder activities with full_day slot.

Return ONLY valid JSON in exactly this structure (no markdown, no extra text):

{{
  "packageTitle": "exact title from document or empty string",
  "packageMode": "single or multi",
  "destination": "primary city/region (single mode) or first city (multi mode), or empty string",
  "country": "country name or empty string",
  "destinations": [
    {{"city": "City Name", "country": "Country", "days": 2}}
  ],
  "durationDays": 0,
  "durationNights": 0,
  "pricePerPerson": 0,
  "description": "2-4 sentence overview",
  "days": [
    {{
      "day": 1,
      "title": "Day 1 title exactly as in document (strictly under 100 chars)",
      "activities": [
        {{
          "title": "Activity title exactly as in document (strictly under 100 chars)",
          "description": "Exact or rephrased description per rules above (strictly under 1000 chars)",
          "timeSlot": "morning|afternoon|evening|night|full_day|half_day",
          "startTime": "HH:MM or empty string",
          "endTime": "HH:MM or empty string"
        }}
      ]
    }}
  ]
}}

Rules:
- packageMode MUST be "single" or "multi"
- If packageMode is "single": destinations array can be empty or have one entry
- If packageMode is "multi": destinations array MUST list all cities with their day counts
- timeSlot MUST be one of: morning, afternoon, evening, night, full_day, half_day
- DEFAULT timeSlot to "full_day" when no explicit time is mentioned in the document. NEVER split a single full day activity into multiple time slots.
- Each day MUST have at least 1 activity
- durationDays must equal the number of entries in the days array
- durationNights is typically durationDays - 1 unless explicitly stated otherwise
- pricePerPerson must be a plain integer or float (no currency symbols, no commas); use 0 if not found
- NEVER modify packageTitle or activity titles unless they exceed 100 chars.
- Day titles and Activity titles MUST be strictly under 100 chars.
- Activity descriptions under 1000 chars: copy exactly. Over 1000 chars: rephrase to under 1000 chars.
"""
        try:
            config = types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            )

            effective_model = (
                self.model_name
                if self.model_name.startswith("models/")
                else f"models/{self.model_name}"
            )

            # Use retry-aware async call (503 → wait 3s/6s, 429 → switch key)
            response = await self._call_with_retry(
                model=effective_model,
                contents=prompt,
                config=config,
            )

            response_text = response.text.strip()
            logger.info(f"[ItineraryImportService] Raw response length: {len(response_text)}")

            # Strip markdown fences if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            data = json.loads(response_text)

            if "days" not in data or not isinstance(data["days"], list):
                raise ValueError("Response missing 'days' array")

            # Normalize package title
            title = data.get("packageTitle", "")
            if title:
                title = html.unescape(title)
                title = re.sub(r'\s+', ' ', title).strip()
                data["packageTitle"] = title[:100]

            # Normalize description (< 500 chars)
            package_desc = data.get("description", "")
            if len(package_desc) > 500:
                trimmed = package_desc[:500]
                last_period = trimmed.rfind(".")
                data["description"] = trimmed[:last_period + 1] if last_period > 0 else trimmed.rstrip() + "..."

            # Normalize numeric fields
            data["pricePerPerson"] = int(data.get("pricePerPerson") or 0)
            data["durationDays"] = int(data.get("durationDays") or len(data["days"]))
            data["durationNights"] = int(data.get("durationNights") or max(0, data["durationDays"] - 1))

            # Normalize packageMode
            data["packageMode"] = data.get("packageMode", "single").lower()
            if data["packageMode"] not in ("single", "multi"):
                data["packageMode"] = "single"

            if not isinstance(data.get("destinations"), list):
                data["destinations"] = []

            # Server-side guard: enforce character limits (AI should handle this, but safety net)
            valid_slots = {"morning", "afternoon", "evening", "night", "full_day", "half_day"}
            for day in data["days"]:
                day_title = day.get("title", "")
                if len(day_title) > 100:
                    day["title"] = day_title[:97] + "..."

                for act in day.get("activities", []):
                    act_title = act.get("title", "")
                    if len(act_title) > 100:
                        act["title"] = act_title[:97] + "..."

                    desc = act.get("description", "")
                    if len(desc) > 1000:
                        trimmed = desc[:1000]
                        last_period = trimmed.rfind(".")
                        act["description"] = trimmed[:last_period + 1] if last_period > 0 else trimmed.rstrip() + "..."

                    if act.get("timeSlot", "").lower() not in valid_slots:
                        act["timeSlot"] = "full_day"

            print(
                f"[ItineraryImportService] Done — mode={data['packageMode']}, "
                f"days={data['durationDays']}, destinations={len(data['destinations'])}"
            )

            return {"success": True, "itinerary": data}

        except json.JSONDecodeError as e:
            logger.error(f"[ItineraryImportService] JSON parse error: {e}")
            return {"success": False, "error": f"AI returned invalid JSON: {e}"}
        except Exception as e:
            logger.error(f"[ItineraryImportService] Error: {e}")
            return {"success": False, "error": str(e)}

    async def extract_search_filters(self, query: str) -> Dict:
        """
        Extract package search filter parameters from a natural language query.

        Args:
            query: User's natural language search input

        Returns:
            Dict with 'success' and 'filters' (or 'error')
        """
        try:
            system_prompt = """You are a high-precision travel query parser for TourSaaS. Your goal is to convert natural language queries into structured search filters.

FIELDS TO EXTRACT:
- **destination**: The city, state, or country mentioned.
- **country**: The country mentioned (if applicable).
- **minBudget**: Minimum price (number).
- **maxBudget**: Maximum price (number).
- **minDays**: Minimum duration in days (number).
- **maxDays**: Maximum duration in days (number).
- **nights**: Number of nights (number).
- **tripStyle**: List of styles (e.g. ['Luxury', 'Adventure']).
- **activities**: List of specific activities (e.g. ['Surfing', 'Hiking']).
- **packageType**: 'single_city' or 'multi_city'.
- **travelMonth**: The month mentioned.

RULES FOR COMPLEX QUERIES:
1. If a user provides a combination (e.g. "Paris under 1.5L for 5 days luxury"), extract ALL components.
2. If only one number is provided for budget/days, use it for both min and max fields (e.g. "5 days" -> minDays:5, maxDays:5).
3. Handle "under", "below", "max" as maxBudget/maxDays.
4. Handle "above", "minimum", "min" as minBudget/minDays.
5. If the query specifies nights, extract them into the 'nights' field and assume days = nights + 1 if days are not mentioned.

CRITICAL: Return ONLY a valid JSON object. No explanation, no markdown."""

            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.1,
            )

            response = self.generate_content(
                model=self.model_name,
                contents=query,
                config=config,
            )

            response_text = response.text.strip()

            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            try:
                data = json.loads(response_text)
            except Exception:
                match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if match:
                    data = json.loads(match.group())
                else:
                    raise

            return {"success": True, "filters": data}

        except Exception as e:
            logger.error(f"[ItineraryImportService] Filter extraction error: {e}")
            return {"success": False, "error": str(e)}

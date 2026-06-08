"""
Package Generation Service — AI-driven tour package creation and refinement.

Handles:
- generate_package: Build a full JSON package from a conversation summary
- refine_itinerary: Modify an existing itinerary from a natural language request
- _enrich_with_images: Attach Unsplash images to itinerary activities
"""
import logging
import json
from google.genai import types
from typing import Dict

logger = logging.getLogger(__name__)
from app.services.gemini_base import GeminiBase
from app.services.unsplash_service import unsplash_service


class PackageGenerationService(GeminiBase):
    """AI service for generating and refining full tour packages."""

    def _get_package_generation_prompt(self, user_input: str) -> str:
        return f"""{self._get_base_system_prompt()}

You are creating a comprehensive tour package based on the following requirements from the travel agent:

{user_input}

Create a complete tour package that includes:

1. **Package Title**: Create an engaging, descriptive title that captures the essence of the trip

2. **Package Overview**: Brief 2-3 sentence description highlighting what makes this package special

3. **Day-by-Day Itinerary**: For each day, create 3-5 activities distributed across time slots:
   - MORNING (6:00 AM - 12:00 PM)
   - AFTERNOON (12:00 PM - 5:00 PM)
   - EVENING (5:00 PM - 9:00 PM)
   - NIGHT (9:00 PM - 11:00 PM)
   
   For each activity include:
   - Specific activity title
   - Detailed description (3-4 sentences)
   - Exact location/venue name
   - Start and end time
   - Duration estimate
   - Whether it's included in package price
   - Estimated cost if not included

4. **Package Highlights**: 4-6 bullet points of key experiences

5. **Inclusions**: List everything included in the package price

6. **Exclusions**: Common items not included (flights, visa, travel insurance, etc.)

7. **Pricing Breakdown**: Base price per person with brief cost justification

8. **Category Tags**: 2-3 relevant categories from: Adventure, Cultural & Heritage, Beach & Relaxation, Luxury, Budget-Friendly, Nature & Wildlife, Food & Culinary, City Tours, Spiritual, Family-Friendly

9. **Best Time to Visit**: Mention if travel date is ideal or suggest better periods

10. **Important Notes**: Any visa requirements, health precautions, or special preparations

**CRITICAL REQUIREMENTS**:
- Activities must be logically sequenced (consider geographic proximity)
- Include realistic travel time between locations
- Balance activity intensity (mix of active and relaxed)
- Respect local opening hours and rest days
- Account for meal times
- Include diverse experiences (culture, food, nature, etc.)

Return ONLY the following JSON structure with no additional text or markdown:

{{
  "packageTitle": "string",
  "packageOverview": "string",
  "destination": "string",
  "country": "string",
  "duration": {{
    "days": number,
    "nights": number
  }},
  "pricePerPerson": number,
  "currency": "INR",
  "category": ["string"],
  "maxGroupSize": number,
  "highlights": ["string"],
  "inclusions": ["string"],
  "exclusions": ["string"],
  "itinerary": [
    {{
      "day": number,
      "title": "string",
      "activities": [
        {{
          "timeSlot": "MORNING|AFTERNOON|EVENING|NIGHT",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "title": "string",
          "description": "string",
          "location": "string",
          "duration": "string",
          "included": boolean,
          "estimatedCost": number,
          "category": "string"
        }}
      ]
    }}
  ],
  "bestTimeToVisit": "string",
  "importantNotes": ["string"]
}}"""

    async def generate_package(self, conversation_summary: str) -> Dict:
        """
        Generate a complete tour package from a conversation summary.

        Args:
            conversation_summary: Agent's requirements from the planning chat

        Returns:
            Dict with 'success' and 'package' (or 'error')
        """
        response_text = None
        try:
            prompt = self._get_package_generation_prompt(conversation_summary)

            config = types.GenerateContentConfig(temperature=0.7)
            response = self.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            response_text = response.text.strip()

            # Strip markdown fences
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            package_data = json.loads(response_text)
            package_data = await self._enrich_with_images(package_data)

            return {"success": True, "package": package_data}

        except json.JSONDecodeError as e:
            logger.error(f"[PackageGenerationService] JSON parse error: {e}")
            return {
                "success": False,
                "error": f"Failed to parse AI response: {e}",
                "raw_response": response_text,
            }
        except Exception as e:
            import traceback
            logger.error(f"[PackageGenerationService] Package generation error: {e}")
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    async def _enrich_with_images(self, package_data: Dict) -> Dict:
        """Attach Unsplash images to each activity in the itinerary."""
        try:
            destination = package_data.get("destination", "")
            itinerary = package_data.get("itinerary", [])
            logger.info(f"[PackageGenerationService] Fetching images for {len(itinerary)} days...")

            for day in itinerary:
                for activity in day.get("activities", []):
                    activity_title = activity.get("title", "")
                    location = activity.get("location", destination)
                    images = await unsplash_service.get_activity_images(activity_title, location)
                    activity["imageUrls"] = images if images else []
                    logger.info(f"[PackageGenerationService] Fetched {len(images)} images for: {activity_title}")

            return package_data
        except Exception as e:
            logger.error(f"[PackageGenerationService] Error enriching with images: {e}")
            return package_data

    async def refine_itinerary(self, current_itinerary: Dict, modification_request: str) -> Dict:
        """
        Refine an existing itinerary based on a natural language modification request.

        Args:
            current_itinerary: Existing package/itinerary data
            modification_request: What the agent wants to change

        Returns:
            Dict with 'success' and 'itinerary' (or 'error')
        """
        try:
            prompt = f"""{self._get_base_system_prompt()}

You are helping a travel agent modify an existing itinerary based on their request.

**Current Itinerary**:
{json.dumps(current_itinerary, indent=2)}

**Agent's Modification Request**: "{modification_request}"

**Your Task**:
Understand the agent's intent and modify the itinerary accordingly. Common requests include:
- "Replace X with Y"
- "Make day 3 more relaxed"
- "Add a cooking class somewhere"
- "Remove the museum visits"
- "Make it more budget-friendly"

Return the COMPLETE updated itinerary in the same JSON format, with all modifications applied.
"""
            config = types.GenerateContentConfig(temperature=0.7)
            response = self.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            response_text = response.text.strip()

            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            updated_itinerary = json.loads(response_text)
            return {"success": True, "itinerary": updated_itinerary}

        except Exception as e:
            return {"success": False, "error": str(e)}

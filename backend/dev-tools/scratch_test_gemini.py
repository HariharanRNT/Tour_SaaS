import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from google import genai
from google.genai import types

# Mock settings
GEMINI_API_KEY = "AIzaSyDe9BPbop-BYF_AQUYRUMt_Qf-2zfiUqlM"

class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        
    async def analyze_enquiry(self, message: str) -> Dict:
        try:
            print(f"--- ANALYZING ---\n{message}\n-----------------")
            
            # Using the new refined prompt
            prompt = f"""You are a professional travel agent assistant. Analyze the travel enquiry CONTEXT below and extract structured data for package filtering.
            
CONTEXT:
{message}

Return ONLY a valid JSON object. Do not include any markdown or explanation.
Fields to extract:
- "destinations": Array of city, state, or country names. 
  CRITICAL: If the "Message" is vague (e.g. "Hi", "I'm interested"), extract the location from the "Interesting Package" field. 
- "days": Total duration in days. (Integer)
- "nights": Total duration in nights. (Integer)
- "guests": Total number of travellers. (Integer)
- "tripStyle": The vibe.
- "budgetHint": A numeric string.
- "keywords": Relevant tags.

Return JSON ONLY."""
            
            config = types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
            
            response = self.client.models.generate_content(
                model="gemini-1.5-flash", # Testing with stable flash
                contents=prompt,
                config=config
            )
            
            return json.loads(response.text.strip())
            
        except Exception as e:
            return {"error": str(e)}

async def main():
    service = GeminiService()
    test_msg = "Message: give a Chennai package list\nInteresting Package: General Enquiry\nTravel Date: 2026-04-21\nTravellers: 1"
    result = await service.analyze_enquiry(test_msg)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(main())

"""
Google Gemini AI Service for Tour Package Generation
"""
import os
import json
from google import genai
from google.genai import types
from typing import Dict, List, Optional, Any
from app.config import settings
from app.services.pexels_service import pexels_service


class GeminiService:
    """Service for interacting with Google Gemini API"""
    
    def __init__(self):
        """Initialize Gemini client with API key"""
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL
        
    def _get_base_system_prompt(self) -> str:
        """Get the base system prompt for travel planning"""
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

    def _get_chat_system_prompt(self) -> str:
        """Get the system prompt specifically for chat interactions"""
        return """You are a friendly and knowledgeable AI Travel Assistant helping travel agents create amazing tour packages for their customers.

Your role:
- Have natural, helpful conversations about travel plans
- Ask clarifying questions to understand requirements (destination, duration, budget, preferences)
- Provide suggestions and recommendations
- Help refine ideas and preferences
- Be enthusiastic and supportive

IMPORTANT RULES:
- ALWAYS respond in natural, conversational text
- NEVER return JSON, code, or structured data formats
- Keep responses concise and friendly (2-4 sentences typically)
- Ask follow-up questions to gather more details
- When you have enough information, let them know they can click "Generate Complete Package" to create the full itinerary

Example good responses:
- "That sounds amazing! A 5-day trip to Bali. What's your budget per person?"
- "Great! Beach relaxation with some cultural experiences. Any specific activities you'd like to include?"
- "Perfect! I have all the details. Click 'Generate Complete Package' below and I'll create a detailed itinerary for you!"

Remember: You're having a conversation, not generating data!"""

    def _get_package_generation_prompt(self, user_input: str) -> str:
        """Get the package generation prompt"""
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

    async def chat(self, message: str, conversation_history: List[Dict] = None) -> Dict:
        """
        Send a message to Gemini and get a response
        
        Args:
            message: User's message
            conversation_history: Previous messages in the conversation
            
        Returns:
            Dict with AI response
        """
        try:
            # Build conversation history for context
            contents = []
            if conversation_history:
                for msg in conversation_history:
                    role = "user" if msg['role'] == 'user' else "model"
                    contents.append(types.Content(role=role, parts=[types.Part(text=msg['content'])]))
            
            # Add current message
            contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
            
            # Create config with system instruction
            config = types.GenerateContentConfig(
                system_instruction=self._get_chat_system_prompt(),  # Use chat-specific prompt
                temperature=0.7,
            )
            
            # Generate response
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )
            
            return {
                "success": True,
                "message": response.text,
                "role": "assistant"
            }
            
        except Exception as e:
            print(f"[GeminiService] Chat error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "message": "I apologize, but I encountered an error. Please try again."
            }
    
    async def generate_package(self, conversation_summary: str) -> Dict:
        """
        Generate a complete tour package from conversation
        
        Args:
            conversation_summary: Summary of the conversation with requirements
            
        Returns:
            Dict with package data or error
        """
        try:
            prompt = self._get_package_generation_prompt(conversation_summary)
            
            # Create config
            config = types.GenerateContentConfig(
                temperature=0.7,
            )
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON response
            package_data = json.loads(response_text)
            
            # Enrich with images from Unsplash
            package_data = await self._enrich_with_images(package_data)
            
            return {
                "success": True,
                "package": package_data
            }
            
        except json.JSONDecodeError as e:
            print(f"[GeminiService] JSON parse error: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to parse AI response: {str(e)}",
                "raw_response": response_text if 'response_text' in locals() else None
            }
        except Exception as e:
            print(f"[GeminiService] Package generation error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _enrich_with_images(self, package_data: Dict) -> Dict:
        """
        Enrich package activities with images from Unsplash
        
        Args:
            package_data: Generated package data
            
        Returns:
            Package data with image URLs added to activities
        """
        try:
            destination = package_data.get("destination", "")
            itinerary = package_data.get("itinerary", [])
            
            print(f"[GeminiService] Fetching images for {len(itinerary)} days...")
            
            for day in itinerary:
                activities = day.get("activities", [])
                for activity in activities:
                    activity_title = activity.get("title", "")
                    location = activity.get("location", destination)
                    
                    # Fetch images for this activity from Pexels
                    images = await pexels_service.get_activity_images(activity_title, location)
                    
                    # Add images to activity
                    activity["imageUrls"] = images if images else []
                    
                    print(f"[GeminiService] Fetched {len(images)} images for: {activity_title}")
            
            return package_data
            
        except Exception as e:
            print(f"[GeminiService] Error enriching with images: {str(e)}")
            # Return package data without images if enrichment fails
            return package_data
    
    async def refine_itinerary(self, current_itinerary: Dict, modification_request: str) -> Dict:
        """
        Refine an existing itinerary based on natural language request
        
        Args:
            current_itinerary: Current package/itinerary data
            modification_request: What the agent wants to change
            
        Returns:
            Dict with updated itinerary
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
            
            # Create config
            config = types.GenerateContentConfig(
                temperature=0.7,
            )
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            response_text = response.text.strip()
            
            # Clean response
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON response
            updated_itinerary = json.loads(response_text)
            
            return {
                "success": True,
                "itinerary": updated_itinerary
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


    def _get_package_search_system_prompt(self) -> str:
        """Get the system prompt for the package search assistant"""
        return """You are an expert travel assistant for TourSaaS. Your role is to help customers discover and book travel packages through natural conversation.

CAPABILITIES:
- Search and recommend travel packages from our database
- Understand customer preferences (destination, duration, budget, travel style)
- Provide accurate pricing and package information
- Guide users smoothly from discovery to itinerary creation

PERSONALITY:
- Friendly, enthusiastic, and helpful
- Professional but conversational
- Proactive in offering suggestions
- Clear and concise in explanations

RULES:
1. Always confirm user selections before proceeding
2. Present information in easy-to-scan formats (bullet points, cards)
3. Show prices in Indian Rupees (₹)
4. Provide clear next steps at each stage
5. Use emojis sparingly for visual appeal
6. Never make up packages or prices - always query the database using the available tools
7. If you don't understand, ask for clarification

TOOLS:
You have access to the following tools:
- search_packages: Search for packages based on criteria (location, duration, budget, etc.)
- get_package_details: Get full details for a specific package ID.

IMPORTANT BEHAVIOR:
- When a user asks about packages, ALWAYS use `search_packages` first.
- When a user wants to "Book", "Proceed", "Configure" or "Select" a specific package, YOU MUST call `get_package_details` with the package_id. 
- DO NOT say "I cannot book". Instead, say "Great! Let's get that set up for you" and call `get_package_details`. This will show the booking interface to the user.
- If the user selects a package from the list verbally (e.g., "I choose the first one" or "The Kerala package"), call `get_package_details` for that package.
- Never make up package details."""

    async def chat_package_search(self, message: str, conversation_history: List[Dict] = None) -> Dict:
        """
        Chat with AI for package search using function calling (tools)
        """
        try:
            print(f"[GeminiService] Starting package search chat with message: {message}")
            if conversation_history:
                print(f"[GeminiService] History length: {len(conversation_history)}")

            # Build conversation history
            contents = []
            if conversation_history:
                for msg in conversation_history:
                    role = "user" if msg['role'] == 'user' else "model"
                    if msg.get('content'):
                         contents.append(types.Content(role=role, parts=[types.Part(text=msg['content'])]))
            
            contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
            
            # Define tools
            tools = [
                types.Tool(function_declarations=[
                    types.FunctionDeclaration(
                        name="search_packages",
                        description="Search for travel packages based on criteria. USE THIS FIRST when user asks for packages.",
                        parameters=types.Schema(
                            type="OBJECT",
                            properties={
                                "location": types.Schema(type="STRING", description="Destination city, state or country"),
                                "duration_days": types.Schema(type="INTEGER", description="Number of days"),
                                "min_price": types.Schema(type="NUMBER", description="Minimum budget"),
                                "max_price": types.Schema(type="NUMBER", description="Maximum budget"),
                                "travel_style": types.Schema(type="STRING", description="Travel style (beach, mountain, cultural, etc.)")
                            }
                        )
                    ),
                    types.FunctionDeclaration(
                        name="get_package_details",
                        description="Get detailed information about a specific package. Use this when user selects a package.",
                        parameters=types.Schema(
                            type="OBJECT",
                            properties={
                                "package_id": types.Schema(type="STRING", description="The ID of the package to retrieve")
                            },
                            required=["package_id"]
                        )
                    )
                ])
            ]

            config = types.GenerateContentConfig(
                system_instruction=self._get_package_search_system_prompt(),
                temperature=0.7,
                tools=tools
            )

            print("[GeminiService] Calling Gemini API...")
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=config
                )
            except Exception as e:
                print(f"[GeminiService] Gemini API Call Error: {str(e)}")
                raise
            
            # Safe check for function calls (handle both property and manual candidates check)
            function_call = None
            try:
                # Try accessing via helper first
                if hasattr(response, 'function_calls') and response.function_calls:
                    function_call = response.function_calls[0]
            except Exception:
                # Fallback to candidates check
                pass
                
            if not function_call and response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        function_call = part.function_call
                        break
            
            if function_call:
                name = function_call.name
                args = function_call.args
                
                print(f"[GeminiService] Tool Call Detected: {name}({args})")
                
                # Execute tool
                tool_result = await self._execute_tool(name, args)
                print(f"[GeminiService] Tool Result: {str(tool_result)[:100]}...")
                
                # Handling the tool response turn
                try:
                    # 1. Add Model's Function Call to history
                    # We need to reuse the exact function call object from the response if possible, or reconstruct carefully
                    # The safest way is to rebuild the part
                    model_parts = [types.Part(function_call=function_call)]
                    contents.append(types.Content(role="model", parts=model_parts))
                    
                    # 2. Add User's Function Response
                    # Note: args must be valid dict for FunctionResponse
                    tool_output_part = types.Part(
                        function_response=types.FunctionResponse(
                            name=name,
                            response={"result": tool_result}
                        )
                    )
                    contents.append(types.Content(role="user", parts=[tool_output_part]))
                    
                    print("[GeminiService] Sending tool result back to model...")
                    # 3. Get final text response
                    # IMPORTANT: Disable tools for this follow-up generation to prevent loops
                    # and force a text response
                    final_config = types.GenerateContentConfig(
                        system_instruction=self._get_package_search_system_prompt(),
                        temperature=0.7,
                        # No tools here to force text
                    )

                    final_response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=final_config
                    )
                    
                    final_text = "Here are the packages I found."
                    if final_response and final_response.text:
                         final_text = final_response.text

                    return {
                        "success": True,
                        "message": final_text,
                        "role": "assistant",
                        "tool_used": name,
                        "tool_result": tool_result
                    }
                except Exception as e:
                     print(f"[GeminiService] Error during tool follow-up: {str(e)}")
                     import traceback
                     traceback.print_exc()
                     # If follow-up fails, return tool result directly
                     return {
                        "success": True, 
                        "message": "I processed your request, but had trouble generating a summary. Here are the results.",
                        "role": "assistant",
                        "tool_used": name,
                        "tool_result": tool_result
                     }

            
            # Normal text response
            response_text = "I'm sorry, I couldn't understand that."
            try:
                if response.text:
                    response_text = response.text
                else:
                    print("[GeminiService] Response has no text content.")
                    if response.candidates and response.candidates[0].finish_reason:
                        print(f"[GeminiService] Finish reason: {response.candidates[0].finish_reason}")
            except ValueError:
                print("[GeminiService] ValueError accessing response.text (likely blocked content)")
                response_text = "I apologize, but I cannot generate a response for that request."
            
            return {
                "success": True,
                "message": response_text,
                "role": "assistant"
            }

        except Exception as e:
            error_str = str(e)
            print(f"[GeminiService] CRITICAL ERROR in chat_package_search: {error_str}")
            import traceback
            traceback.print_exc()
            
            # Check for quota error
            is_quota_error = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str.upper() or "QUOTA" in error_str.upper()
            
            return {
                "success": False,
                "error": error_str,
                "quota_exceeded": is_quota_error,
                "message": "Currently I am not available, please try again." if is_quota_error else "I apologize, but I encountered an internal error. Please check the logs."
            }

    async def _execute_tool(self, name: str, args: Dict) -> Any:
        try:
            from app.database import AsyncSessionLocal
            from sqlalchemy import select, or_, and_
            from app.models import Package, PackageStatus
            
            async with AsyncSessionLocal() as db:
                if name == "search_packages":
                    query = select(Package).where(Package.status == PackageStatus.PUBLISHED)
                    
                    if args.get("location"):
                        loc = args["location"]
                        query = query.where(or_(
                            Package.destination.ilike(f"%{loc}%"),
                            Package.country.ilike(f"%{loc}%"),
                            Package.title.ilike(f"%{loc}%")
                        ))
                    
                    if args.get("duration_days"):
                        limit = args["duration_days"]
                        # Loose match: +/- 2 days
                        query = query.where(and_(
                            Package.duration_days >= limit - 2,
                            Package.duration_days <= limit + 2
                        ))
                        
                    if args.get("max_price"):
                        query = query.where(Package.price_per_person <= args["max_price"])
                        
                    if args.get("min_price"):
                        query = query.where(Package.price_per_person >= args["min_price"])
                        
                    # Limit results
                    query = query.limit(5)
                    result = await db.execute(query)
                    packages = result.scalars().all()
                    
                    def parse_included(items):
                        if not items:
                            return []
                        try:
                            if isinstance(items, list):
                                return items
                            return json.loads(items)
                        except:
                            return []

                    return [
                        {
                            "id": str(p.id),
                            "title": p.title,
                            "destination": p.destination,
                            "price": float(p.price_per_person) if p.price_per_person else 0.0,
                            "duration": f"{p.duration_days} Days / {p.duration_nights} Nights",
                            "highlights": parse_included(p.included_items)[:3]
                        }
                        for p in packages
                    ]
                    
                elif name == "get_package_details":
                    pkg_id = args.get("package_id")
                    query = select(Package).where(Package.id == pkg_id)
                    result = await db.execute(query)
                    package = result.scalar_one_or_none()
                    
                    if package:
                        def parse_included(items):
                            if not items:
                                return []
                            try:
                                if isinstance(items, list):
                                    return items
                                return json.loads(items)
                            except:
                                return []

                        return {
                            "id": str(package.id),
                            "title": package.title,
                            "description": package.description,
                            "price": float(package.price_per_person) if package.price_per_person else 0.0,
                            "duration_days": package.duration_days,
                            "included": parse_included(package.included_items),
                            "itinerary": "Detailed itinerary available upon booking." # simplified
                        }
                    return {"error": "Package not found"}
                    
        except Exception as e:
            print(f"Tool execution error: {e}")
            return {"error": str(e)}

# Singleton instance
gemini_service = GeminiService()

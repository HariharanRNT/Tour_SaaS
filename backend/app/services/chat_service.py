"""
Chat Service — Conversational AI for travel planning assistance.

Handles:
- Agent-facing trip planning chat (chat)
- Customer-facing package search chat with function calling (chat_package_search)
"""
import logging
import json
import re
from google.genai import types
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)
from app.services.gemini_base import GeminiBase


class ChatService(GeminiBase):
    """AI chat for travel agents building new packages."""

    def _get_chat_system_prompt(self) -> str:
        return """You are a friendly and knowledgeable AI Travel Assistant helping travel agents create amazing tour packages for their customers.

Your role:
- Have natural, helpful conversations about travel plans
- Provide suggestions and recommendations
- Help refine ideas and preferences
- Be enthusiastic and supportive

IMPORTANT RULES:
- ALWAYS respond in natural, conversational text
- NEVER return JSON, code, or structured data formats
- Keep responses concise and friendly (2-4 sentences typically)
- MANDATORY REQUIREMENTS: You ONLY need the Destination and the Number of Days to generate a package.
- DO NOT ask too many clarifying questions (like if it's a family trip, budget, trip style, or preferred activities).
- As soon as the user provides a Destination and Number of Days (e.g., "Goa for 3 days"), DO NOT ask more questions. Instead, immediately tell them you have enough information and they can click "Generate Complete Package" to create the full itinerary!
- You can infer the trip style and activities automatically based on the destination or use sensible defaults during generation.

Example good responses:
- "Great! Goa for 3 days. I have enough information to create an amazing itinerary for you. Click 'Generate Complete Package' below to see it!"
- "Awesome! Paris for 5 days. I'm ready to create your package. Just click 'Generate Complete Package' below!"

Remember: Don't interrogate the user. Get the destination and days, then let them generate the package!"""

    def _get_package_search_system_prompt(self) -> str:
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
8. BOOKING LOOKUP:
   - When a user mentions a booking reference number (usually starts with 'BK' followed by letters and numbers, e.g., 'BKSUO539177'):
     - Call `get_booking_details` with that reference number.
     - If the booking is found, display the details as requested (Package Name, Cancellation Policy, Inclusions, Exclusions, Price, GST Status).
     - If not found, inform the user clearly.

TOOLS:
You have access to the following tools:
- search_packages: Search for packages based on criteria.
- get_package_details: Get full details for a specific package ID.
- get_package_by_name: Search for a package by its name or title and get full details.
- get_booking_details: Get full details for a booking using its reference number.

IMPORTANT BEHAVIOR:
- When a user asks about packages generally, ALWAYS use `search_packages` first.
- When a user asks for packages of a specific destination or location (e.g., "Chennai package", "Give a Chennai packge", "Chennai packages"), you MUST IMMEDIATELY call the `search_packages` tool with location set to that destination. Do NOT ask clarifying or follow-up questions before calling the tool. Do NOT assume no packages exist for a destination/location; always call `search_packages` first to check.
- Treat spelling variations/typos of "package" (e.g., "packge", "pakage", "pack") as a request for packages.
- CRITICAL: If a user mentions a SPECIFIC package name or title (e.g., "Tell me about the Amazing Kerala package" or "Show me details for Dubai Sparkle"), call `get_package_by_name` with the package title.
- Extract EVERY filter the user mentions. If they say "Dubai 5 days under 40k luxury", call `search_packages(location='Dubai', duration_days=5, max_price=40000, travel_style='luxury')`.
- DO NOT ignore any part of the user's request. Combined queries must use combined filters.
- When a user wants to "Book", "Proceed", "Configure" or "Select" a specific package, YOU MUST call `get_package_details` with the package_id.
- DO NOT say "I cannot book". Instead, say "Great! Let's get that set up for you" and call `get_package_details`. This will show the booking interface to the user.
- If the user selects a package from the list verbally (e.g., "I choose the first one" or "The Kerala package"), call `get_package_details` for that package.
- When a user provides a booking reference (like BKSUO539177), call `get_booking_details`.
- Never make up package details.

RESPONSE FORMATTING RULES:
1. When packages are found via `search_packages`, start with a friendly introduction (e.g., "Here are some great options for you:").
2. REQUIRED: Provide a brief summary of the top 3 packages in a Markdown list format:
   * **Package Name**
     * Duration: X Days
     * Price: ₹X,XXX
3. When a specific package is found via `get_package_by_name` or `get_package_details`, provide a brief enthusiastic summary and highlight its best features.
4. When booking details are found via `get_booking_details`, present them clearly in a structured list:
   - **Package Name**: [Name]
   - **Cancellation Policy**: [Policy Details]
   - **Included Services**: [List of Inclusions]
   - **Excluded Services**: [List of Exclusions]
   - **Total Price**: ₹[Amount]
   - **GST Status**: [Inclusive/Exclusive]
5. CRITICAL: DO NOT include <package_card> tags, JSON, or any other structured data in your text response. The user interface will automatically render the interactive cards separately.
6. If the user asked for packages of a specific location/destination (e.g., "Chennai package", "Give a Chennai packge"), do NOT ask any follow-up questions at all in your final response (like "Do any of these match your interest?", "Where would you like to go?", etc.). Simply present the matching packages and stop. For general/non-specific queries, you may ask a follow-up question to guide the user.
7. CANCELLATION & REFUNDS:
   - When a user asks about "cancellation", "refund", or "cancel policy":
     - **REQUIRED**: Inform the user: "To cancel your booking, please visit the **My Bookings** page on your dashboard."
     - **CRITICAL**: If the user explicitly mentions a package name in their request (e.g., "What is the cancellation policy for Amazing Kerala?"), you MUST call the `get_package_by_name` tool with that package name first to get its details.
     - Once you have the package details, check its cancellation policy and summarize them.
     - If no package name is mentioned but one is in the conversation context (the last one searched or selected), check its cancellation policy details and summarize them.
     - If no package is referenced or in context, ask: "Please let me know which package you're referring to for specific cancellation details."
     - If cancellation details are not available for the package, show: "Cancellation details are not available for this package. Please contact support for more information."
8. FAST RESPONSE REQUIREMENT:
   - Prioritize fast responses. Do not perform unnecessary analysis or generate lengthy explanations unless explicitly requested.
   - Return the most relevant package match immediately when confidence is high.
   - Use concise and direct responses for customer-facing conversations.
   - Avoid asking follow-up questions if a clear package match already exists.
9. ENQUIRY-BASED PRICING:
   - If a package is marked as "ENQUIRY" type:
     - DO NOT mention a numeric price.
     - Instead, say something like "Price available on request" or "Contact us for pricing".

CURRENT CONVERSATION CONTEXT:
{context_str}
"""

    async def chat(self, message: str, conversation_history: List[Dict] = None) -> Dict:
        """
        Agent-facing travel planning chat.
        Returns conversational text — never JSON.
        """
        try:
            contents = []
            if conversation_history:
                for msg in conversation_history:
                    role = "user" if msg['role'] == 'user' else "model"
                    contents.append(types.Content(role=role, parts=[types.Part(text=msg['content'])]))

            contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

            config = types.GenerateContentConfig(
                system_instruction=self._get_chat_system_prompt(),
                temperature=0.7,
            )

            response = self.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )

            return {
                "success": True,
                "message": response.text,
                "role": "assistant",
            }

        except Exception as e:
            import traceback
            logger.error(f"[ChatService] chat error: {e}")
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "message": "I apologize, but I encountered an error. Please try again.",
            }

    async def chat_package_search(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        admin_id: Optional[str] = None,
        session_state: Dict = None,
    ) -> Dict:
        """
        Customer-facing package search with Gemini function calling.
        Uses DB tools (search_packages, get_package_details, etc.) to serve real data.
        """
        try:
            logger.info(f"[ChatService] Starting package search with message: {message}")
            if conversation_history:
                logger.info(f"[ChatService] History length: {len(conversation_history)}")

            # Build context string from session state
            context_str = "No active filters."
            if session_state and session_state.get("conversationContext"):
                ctx = session_state["conversationContext"]
                filters = []
                if ctx.get("budget"):
                    filters.append(f"Budget: {ctx.get('budget_type', 'around')} ₹{ctx['budget']}")
                if ctx.get("destination"):
                    filters.append(f"Destination: {ctx['destination']}")
                if ctx.get("days"):
                    filters.append(f"Duration: {ctx['days']} days")
                if ctx.get("trip_style"):
                    filters.append(f"Style: {ctx['trip_style']}")
                if filters:
                    context_str = " | ".join(filters)

            # Build conversation history for Gemini
            contents = []
            if conversation_history:
                for msg in conversation_history:
                    role = "user" if msg['role'] == 'user' else "model"
                    if msg.get('content'):
                        contents.append(types.Content(role=role, parts=[types.Part(text=msg['content'])]))

            contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

            tools = [
                types.Tool(function_declarations=[
                    types.FunctionDeclaration(
                        name="search_packages",
                        description="Search for travel packages based on criteria. Call this whenever the user mentions ANY combination of destination, budget, duration (days/nights), or travel style.",
                        parameters=types.Schema(
                            type="OBJECT",
                            properties={
                                "location": types.Schema(type="STRING", description="Destination city, state, or country"),
                                "duration_days": types.Schema(type="INTEGER", description="Number of days for the trip"),
                                "duration_nights": types.Schema(type="INTEGER", description="Number of nights for the trip"),
                                "min_price": types.Schema(type="NUMBER", description="Minimum budget per person in INR"),
                                "max_price": types.Schema(type="NUMBER", description="Maximum budget per person in INR"),
                                "travel_style": types.Schema(type="STRING", description="Travel style or category (e.g., luxury, budget, honeymoon, adventure)"),
                                "booking_type": types.Schema(type="STRING", description="INSTANT or ENQUIRY booking mode"),
                            }
                        )
                    ),
                    types.FunctionDeclaration(
                        name="get_package_details",
                        description="Get detailed information about a specific package using its ID. Use this when user selects a package from a list.",
                        parameters=types.Schema(
                            type="OBJECT",
                            properties={
                                "package_id": types.Schema(type="STRING", description="The ID of the package to retrieve"),
                            },
                            required=["package_id"]
                        )
                    ),
                    types.FunctionDeclaration(
                        name="get_package_by_name",
                        description="Get detailed information about a specific package using its name or title. Use this when the user mentions a specific package by name.",
                        parameters=types.Schema(
                            type="OBJECT",
                            properties={
                                "package_name": types.Schema(type="STRING", description="The name or title of the package (e.g., 'Amazing Kerala')"),
                            },
                            required=["package_name"]
                        )
                    ),
                    types.FunctionDeclaration(
                        name="get_booking_details",
                        description="Get detailed information about a booking using its reference number.",
                        parameters=types.Schema(
                            type="OBJECT",
                            properties={
                                "booking_reference": types.Schema(type="STRING", description="The booking reference number (e.g., BKSUO539177)"),
                            },
                            required=["booking_reference"]
                        )
                    ),
                ])
            ]

            config = types.GenerateContentConfig(
                system_instruction=self._get_package_search_system_prompt().format(context_str=context_str),
                temperature=0.7,
                tools=tools,
            )

            logger.info("[ChatService] Calling Gemini API...")
            try:
                response = self.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=config,
                )
            except Exception as e:
                logger.error(f"[ChatService] Gemini API Call Error: {e}")
                raise

            # Detect function call
            function_call = None
            try:
                if hasattr(response, 'function_calls') and response.function_calls:
                    function_call = response.function_calls[0]
            except Exception:
                pass

            if not function_call and response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        function_call = part.function_call
                        break

            if function_call:
                name = function_call.name
                args = function_call.args

                logger.info(f"[ChatService] Tool Call: {name}({args})")

                from app.services.package_search_tools import PackageSearchTools
                tool_result = await PackageSearchTools.execute(name, args, admin_id, session_state)
                logger.info(f"[ChatService] Tool Result: {str(tool_result)[:100]}...")

                try:
                    model_parts = [types.Part(function_call=function_call)]
                    contents.append(types.Content(role="model", parts=model_parts))

                    tool_output_part = types.Part(
                        function_response=types.FunctionResponse(
                            name=name,
                            response={"result": tool_result},
                        )
                    )
                    contents.append(types.Content(role="user", parts=[tool_output_part]))

                    logger.info("[ChatService] Sending tool result back to model...")
                    final_config = types.GenerateContentConfig(
                        system_instruction=self._get_package_search_system_prompt().format(context_str=context_str),
                        temperature=0.7,
                        # No tools here — force a text response
                    )

                    final_response = self.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=final_config,
                    )

                    final_text = "Here are the packages I found."
                    if final_response and final_response.text:
                        final_text = final_response.text

                    # Clean up any stray XML tags (failsafe)
                    final_text = re.sub(r'<package_card.*?>.*?</package_card>', '', final_text, flags=re.DOTALL)
                    final_text = re.sub(r'<package_card.*?>', '', final_text)
                    final_text = final_text.strip()

                    return {
                        "success": True,
                        "message": final_text,
                        "role": "assistant",
                        "tool_used": name,
                        "tool_result": tool_result,
                    }

                except Exception as e:
                    import traceback
                    logger.error(f"[ChatService] Error during tool follow-up: {e}")
                    traceback.print_exc()
                    return {
                        "success": True,
                        "message": "I processed your request, but had trouble generating a summary. Here are the results.",
                        "role": "assistant",
                        "tool_used": name,
                        "tool_result": tool_result,
                    }

            # Normal text response
            response_text = "I'm sorry, I couldn't understand that."
            try:
                if response.text:
                    response_text = response.text
                else:
                    logger.info("[ChatService] Response has no text content.")
                    if response.candidates and response.candidates[0].finish_reason:
                        logger.info(f"[ChatService] Finish reason: {response.candidates[0].finish_reason}")
            except ValueError:
                logger.error("[ChatService] ValueError accessing response.text (likely blocked content)")
                response_text = "I apologize, but I cannot generate a response for that request."

            return {
                "success": True,
                "message": response_text,
                "role": "assistant",
            }

        except Exception as e:
            error_str = str(e)
            import traceback
            logger.error(f"[ChatService] CRITICAL ERROR in chat_package_search: {error_str}")
            traceback.print_exc()

            is_quota_error = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str.upper() or "QUOTA" in error_str.upper()

            return {
                "success": False,
                "error": error_str,
                "quota_exceeded": is_quota_error,
                "message": "Currently I am not available, please try again." if is_quota_error else "I apologize, but I encountered an internal error. Please check the logs.",
            }

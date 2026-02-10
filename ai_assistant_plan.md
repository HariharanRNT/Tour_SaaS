# AI Itinerary Assistant Implementation Plan

## Overview
Integrate Google Gemini API to power the AI Itinerary Assistant in the Agent Dashboard, enabling agents to generate comprehensive tour packages through natural language conversation.

## User Review Required

> [!IMPORTANT]
> **Gemini API Key Required**: You'll need to obtain a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey) and add it to the `.env` file.

> [!WARNING]
> **API Costs**: Gemini API usage will incur costs. Consider implementing rate limiting and usage tracking for agents.

## Proposed Changes

### Backend Implementation

#### [NEW] [gemini_service.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/services/gemini_service.py)

- **Purpose**: Core service for Gemini API integration
- **Features**:
  - Initialize Gemini client with API key from environment
  - Implement chat session management
  - Handle package generation from natural language
  - Parse and validate AI responses
  - Error handling and retry logic
  - Token usage tracking

#### [NEW] [ai_assistant_schemas.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/schemas/ai_assistant_schemas.py)

- **Purpose**: Pydantic schemas for AI Assistant
- **Schemas**:
  - `ChatMessageRequest`: User message input
  - `ChatMessageResponse`: AI response with package data
  - `PackageGenerationRequest`: Structured package request
  - `PackageGenerationResponse`: Complete package JSON
  - `ConversationContext`: Chat history and state

#### [NEW] [ai_assistant.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/api/v1/ai_assistant.py)

- **Purpose**: API endpoints for AI Assistant
- **Endpoints**:
  - `POST /api/v1/ai-assistant/chat` - Send message to AI
  - `POST /api/v1/ai-assistant/generate-package` - Generate package from conversation
  - `GET /api/v1/ai-assistant/conversation/{id}` - Get conversation history
  - `DELETE /api/v1/ai-assistant/conversation/{id}` - Clear conversation

#### [MODIFY] [.env](file:///d:/Hariharan/G-Project/RNT_Tour/backend/.env)

- Add `GEMINI_API_KEY=your_api_key_here`
- Add `GEMINI_MODEL=gemini-1.5-pro` (or gemini-1.5-flash for faster responses)

---

### Frontend Implementation

#### [MODIFY] [dashboard/page.tsx](file:///d:/Hariharan/G-Project/RNT_Tour/frontend/src/app/agent/dashboard/page.tsx)

- **AI Assistant Dialog Enhancements**:
  - Implement chat message state management
  - Add message history display (user + AI messages)
  - Show loading states during AI processing
  - Display generated package preview
  - Add "Create Package" button to save AI-generated package
  - Handle errors gracefully

#### [NEW] [AIAssistantChat.tsx](file:///d:/Hariharan/G-Project/RNT_Tour/frontend/src/components/agent/AIAssistantChat.tsx)

- **Purpose**: Reusable AI chat component
- **Features**:
  - Message bubble rendering (user vs AI)
  - Typing indicator
  - Auto-scroll to latest message
  - Markdown rendering for AI responses
  - Quick suggestion chips
  - Package preview card

---

## Implementation Flow

### 1. Backend Setup

```python
# gemini_service.py structure
class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = genai.GenerativeModel('gemini-1.5-pro')
    
    async def chat(self, message: str, context: dict) -> dict:
        # Send message with conversation context
        # Return AI response
    
    async def generate_package(self, conversation_history: list) -> dict:
        # Use package generation prompt from AI_Trip_Assistant_Prompts.md
        # Return structured package JSON
```

### 2. API Integration

```python
# ai_assistant.py endpoints
@router.post("/chat")
async def chat_with_ai(
    request: ChatMessageRequest,
    agent_id: int = Depends(get_current_agent)
):
    # Process user message
    # Get AI response
    # Store conversation
    # Return response

@router.post("/generate-package")
async def generate_package(
    conversation_id: str,
    agent_id: int = Depends(get_current_agent)
):
    # Retrieve conversation history
    # Call Gemini with package generation prompt
    # Parse and validate package JSON
    # Save as draft package
    # Return package data
```

### 3. Frontend Integration

```typescript
// AI Assistant Dialog Flow
1. User types message (e.g., "Create a 7-day package for Bali")
2. Send to /api/v1/ai-assistant/chat
3. Display AI response in chat
4. Continue conversation to refine details
5. When ready, click "Generate Package"
6. Call /api/v1/ai-assistant/generate-package
7. Show package preview
8. Redirect to package editor with pre-filled data
```

---

## Verification Plan

### Automated Tests

- Unit tests for `GeminiService`
- API endpoint tests for chat and package generation
- Schema validation tests

### Manual Verification

1. **Chat Flow**:
   - Open AI Assistant from Agent Dashboard
   - Send various package requests
   - Verify AI understands and responds appropriately
   - Test multi-turn conversations

2. **Package Generation**:
   - Complete a conversation about a package
   - Generate package from conversation
   - Verify all fields are populated correctly
   - Check itinerary structure and activities

3. **Error Handling**:
   - Test with invalid API key
   - Test with network errors
   - Test with malformed AI responses
   - Verify user-friendly error messages

4. **Edge Cases**:
   - Very long conversations
   - Rapid message sending
   - Special characters in messages
   - Different languages (if supported)

---

## Dependencies

### Backend
```bash
pip install google-generativeai
```

### Environment Variables
```env
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-1.5-pro
```

---

## Notes

- The AI prompts from `AI_Trip_Assistant_Prompts.md` will be used as system prompts
- Conversation history will be stored in Redis for session management
- Generated packages will be saved as DRAFT status initially
- Agents can edit AI-generated packages before publishing
- Consider implementing usage limits per agent/subscription tier

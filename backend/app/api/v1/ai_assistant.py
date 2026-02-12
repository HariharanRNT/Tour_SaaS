"""
AI Assistant API endpoints for package generation using Gemini
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List
import uuid
import json
from datetime import datetime

from app.database import get_db
from app.services.gemini_service import gemini_service
from app.models import User
from app.schemas.ai_assistant_schemas import (
    ChatRequest,
    ChatResponse,
    PackageGenerationRequest,
    PackageGenerationResponse,
    ConversationHistoryResponse,
    ChatMessage
)
from app.core.redis import get_redis
from app.api.deps import get_current_agent, get_optional_current_user
from typing import Optional

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to the AI Assistant and get a response
    """
    try:
        # Use user ID or "guest"
        user_id = current_user.id if current_user else "guest"
        
        # Generate or use existing conversation ID
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Get conversation history from Redis
        redis = get_redis()
        history_key = f"ai_conversation:{user_id}:{conversation_id}"
        history_data = await redis.get(history_key)
        
        conversation_history = []
        if history_data:
            conversation_history = json.loads(history_data)
        
        # Add user message to history
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow().isoformat()
        }
        conversation_history.append(user_message)
        
        # Get AI response based on mode
        mode = getattr(request, "mode", "general") # Default to general if not present
        
        # Determine target admin ID for package filtering
        target_admin_id = None
        if current_user:
            # For customers, use their assigned agent/admin
            if current_user.role == "customer" and current_user.customer_profile:
                target_admin_id = current_user.customer_profile.agent_id
            # For admins/agents, use their own ID
            elif current_user.role in ["admin", "agent"]:
                target_admin_id = current_user.id
        
        if mode == "package_search":
            ai_response = await gemini_service.chat_package_search(
                message=request.message,
                conversation_history=conversation_history[:-1],
                admin_id=str(target_admin_id) if target_admin_id else None
            )
        else:
            ai_response = await gemini_service.chat(
                message=request.message,
                conversation_history=conversation_history[:-1]
            )
        
        if not ai_response.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=ai_response.get("error", "AI service error")
            )
        
        # Add AI response to history
        assistant_message = {
            "role": "assistant",
            "content": ai_response["message"],
            "timestamp": datetime.utcnow().isoformat(),
            # Store tool data if any
            "tool_used": ai_response.get("tool_used"),
            "tool_result": ai_response.get("tool_result")
        }
        conversation_history.append(assistant_message)
        
        # Store updated conversation in Redis (expire after 24 hours)
        await redis.setex(
            history_key,
            86400,  # 24 hours
            json.dumps(conversation_history)
        )
        
        return ChatResponse(
            success=True,
            message=ai_response["message"],
            conversation_id=conversation_id,
            tool_used=ai_response.get("tool_used"),
            tool_result=ai_response.get("tool_result")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat: {str(e)}"
        )


@router.post("/generate-package", response_model=PackageGenerationResponse)
async def generate_package(
    request: PackageGenerationRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a complete tour package from the conversation
    """
    try:
        user_id = current_user.id if current_user else "guest"
        print(f"[AI Assistant] Generating package for user {user_id}, conversation {request.conversation_id}")
        
        # Get conversation history from Redis
        redis = get_redis()
        history_key = f"ai_conversation:{user_id}:{request.conversation_id}"
        print(f"[AI Assistant] Looking for conversation at key: {history_key}")
        
        history_data = await redis.get(history_key)
        
        if not history_data:
            print(f"[AI Assistant] ERROR: Conversation not found in Redis for key: {history_key}")
            # Try to generate with a default summary if conversation not found
            if request.conversation_summary:
                summary = request.conversation_summary
                print(f"[AI Assistant] Using provided summary instead: {summary[:100]}...")
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found. Please provide more details in the chat."
                )
        else:
            conversation_history = json.loads(history_data)
            print(f"[AI Assistant] Found conversation with {len(conversation_history)} messages")
            
            # Create conversation summary
            if request.conversation_summary:
                summary = request.conversation_summary
            else:
                # Extract user messages to create summary
                user_messages = [msg["content"] for msg in conversation_history if msg["role"] == "user"]
                summary = "\n".join(user_messages)
            
            print(f"[AI Assistant] Summary for package generation: {summary[:200]}...")
        
        # Generate package using Gemini
        print(f"[AI Assistant] Calling Gemini to generate package...")
        result = await gemini_service.generate_package(summary)
        
        if not result.get("success"):
            print(f"[AI Assistant] Package generation failed: {result.get('error')}")
            return PackageGenerationResponse(
                success=False,
                error=result.get("error", "Failed to generate package"),
                raw_response=result.get("raw_response")
            )
        
        print(f"[AI Assistant] Package generated successfully: {result['package'].get('packageTitle', 'Unknown')}")
        return PackageGenerationResponse(
            success=True,
            package=result["package"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating package: {str(e)}"
        )


@router.get("/conversation/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    conversation_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Get conversation history by ID
    """
    try:
        user_id = current_user.id if current_user else "guest"
        redis = get_redis()
        history_key = f"ai_conversation:{user_id}:{conversation_id}"
        history_data = await redis.get(history_key)
        
        if not history_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        conversation_history = json.loads(history_data)
        
        # Convert to ChatMessage objects
        messages = [
            ChatMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=datetime.fromisoformat(msg["timestamp"])
            )
            for msg in conversation_history
        ]
        
        return ConversationHistoryResponse(
            conversation_id=conversation_id,
            messages=messages,
            created_at=messages[0].timestamp if messages else datetime.utcnow(),
            updated_at=messages[-1].timestamp if messages else datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving conversation: {str(e)}"
        )


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Delete a conversation
    """
    try:
        user_id = current_user.id if current_user else "guest"
        redis = get_redis()
        history_key = f"ai_conversation:{user_id}:{conversation_id}"
        deleted = await redis.delete(history_key)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return {"success": True, "message": "Conversation deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting conversation: {str(e)}"
        )

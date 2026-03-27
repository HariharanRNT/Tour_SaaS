import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import User, UserRole, ApprovalStatus
from app.services.agent_notification_service import AgentNotificationService

async def test_notifications():
    print("Testing AgentNotificationService...")
    
    # Mock User
    mock_agent = MagicMock(spec=User)
    mock_agent.id = "agent-123"
    mock_agent.email = "agent@example.com"
    mock_agent.first_name = "John"
    mock_agent.last_name = "Doe"
    mock_agent.agency_name = "JD Travels"
    mock_agent.role = UserRole.AGENT
    
    mock_admin = MagicMock(spec=User)
    mock_admin.email = "admin@example.com"
    mock_admin.role = UserRole.ADMIN

    # Mock dependencies
    with patch("app.services.agent_notification_service.send_email_task.delay") as mock_delay, \
         patch("app.services.agent_notification_service.AsyncSessionLocal") as mock_session_local:
        
        # Mock session
        mock_session = AsyncMock()
        mock_session_local.return_value.__aenter__.return_value = mock_session
        
        # Test Registration Received
        print("1. Testing send_registration_received_email...")
        await AgentNotificationService.send_registration_received_email(mock_agent)
        assert mock_delay.called
        print("   - OK: Celery task enqueued")
        mock_delay.reset_mock()
        
        # Test Admin Request
        print("2. Testing send_admin_registration_request_email...")
        await AgentNotificationService.send_admin_registration_request_email(mock_agent, [mock_admin])
        assert mock_delay.called
        assert mock_delay.call_args[1]['to_email'] == "admin@example.com"
        print("   - OK: Admin email enqueued")
        mock_delay.reset_mock()
        
        # Test Approval
        print("3. Testing send_approval_email...")
        await AgentNotificationService.send_approval_email(mock_agent)
        assert mock_delay.called
        assert "Approved" in mock_delay.call_args[1]['subject']
        print("   - OK: Approval email enqueued")
        mock_delay.reset_mock()
        
        # Test Rejection
        print("4. Testing send_rejection_email...")
        await AgentNotificationService.send_rejection_email(mock_agent)
        assert mock_delay.called
        assert "Declined" in mock_delay.call_args[1]['subject']
        print("   - OK: Rejection email enqueued")
        
    print("\nAll notification service tests passed (mocks checked)!")

if __name__ == "__main__":
    asyncio.run(test_notifications())

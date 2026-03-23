# Implement Customer Notification System

This plan outlines the creation of a comprehensive customer notification system based on the provided [Customer_notification.txt](file:///d:/Hariharan/G-Project/RNT_Tour/Customer_notification.txt) templates, using the Agent's SMTP credentials.

## Proposed Changes

### Backend Components

#### [NEW] `backend/app/utils/customer_email_templates.py`
Create a utility to generate HTML and Subject for the 9 templates defined in [Customer_notification.txt](file:///d:/Hariharan/G-Project/RNT_Tour/Customer_notification.txt):
1. Booking Confirmation
2. Invoice / Payment Receipt
3. Itinerary Details
4. Booking Status Update
5. Trip Reminder (7 Days Before)
6. Final Reminder (1 Day Before)
7. Pre-Travel Assistance
8. Real-Time Alert
9. Feedback Request
Each template will accept keyword arguments (like `customerName`, `packageName`, `referenceId`, etc.) and return a well-formatted HTML email body and subject line.

#### [NEW] `backend/app/services/customer_notification_service.py`
Create a centralized service for sending customer emails:
- `get_agent_smtp_config(agent)`: Extracts Agent's SMTP credentials (refactoring the logic from [booking_orchestrator.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/services/booking_orchestrator.py)).
- Methods for each notification type (e.g., `send_booking_confirmation(booking)`, `send_payment_receipt(booking, payment)`, etc.).
- These methods will fetch the agent's SMTP config and use `EmailService.send_email` to send the generated template to the customer.

#### [MODIFY] [backend/app/services/booking_orchestrator.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/services/booking_orchestrator.py)
- Refactor [_send_confirmation_email](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/services/booking_orchestrator.py#189-279) to delegate to `CustomerNotificationService.send_booking_confirmation(booking)`.
- Ensure that immediately after a successful booking, the appropriate email is sent directly to the customer using the Agent's SMTP credentials.

#### [MODIFY] [backend/app/services/subscription_service.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/services/subscription_service.py) or [invoice_service.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/services/invoice_service.py) (Optional)
- Use the new `CustomerNotificationService` for sending invoices or receipts if applicable.

## Verification Plan

### Automated Tests
- Currently, email sending is usually tested manually. We will rely on backend logging to confirm email tasks are dispatched successfully.

### Manual Verification
1. Open the frontend and initiate a new booking as a customer for an agent who has valid SMTP settings configured.
2. Complete the checkout process successfully.
3. Verify the backend logs indicating `CustomerNotificationService` was invoked and the Agent's SMTP config was successfully retrieved.
4. Verify the backend logs indicating that the email was successfully sent.
5. Provide a test script `scripts/test_customer_notifications.py` to trigger each of the 9 notification templates for a dummy booking, to verify they all work nicely.

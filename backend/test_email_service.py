import asyncio
import os
import sys

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.email_service import EmailService

async def test_email_service():
    # Test using the actual EmailService
    to_email = "hariharan@reshandthosh.com"
    subject = "Diagnostic Test via EmailService"
    body = "<h1>Test</h1><p>This is a test from the application EmailService.</p>"
    
    print(f"Testing EmailService.send_email to {to_email}...")
    
    # This should use system defaults (Gmail credentials)
    success = await EmailService.send_email(
        to_email=to_email,
        subject=subject,
        body=body
    )
    
    if success:
        print("SUCCESS: EmailService sent email!")
    else:
        print("FAILURE: EmailService failed to send email.")

if __name__ == "__main__":
    asyncio.run(test_email_service())

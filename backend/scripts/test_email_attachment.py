import asyncio
import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.email_service import EmailService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

async def test_attachment_email():
    print("Testing Email with Attachment...")
    
    mock_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/Name /F1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\n0000000304 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n398\n%%EOF"
    
    # We will just see if building the message throws an error.
    # To avoid actually sending, we can pass dummy smtp_config that will fail at connection
    # but succeed at message building.
    
    dummy_smtp = {
        "host": "localhost",
        "port": 2525,
        "user": "test",
        "password": "pwd",
        "from_email": "test@test.com",
        "from_name": "Test"
    }

    try:
        success = await EmailService.send_email(
            to_email="customer@example.com",
            subject="Test Payment Receipt",
            body="<h1>Here is your receipt</h1>",
            attachment_bytes=mock_pdf_bytes,
            attachment_filename="Test_Invoice.pdf",
            smtp_config=dummy_smtp
        )
        print(f"Build succeeded. Connection failed gracefully if not localhost? Result: {success}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_attachment_email())

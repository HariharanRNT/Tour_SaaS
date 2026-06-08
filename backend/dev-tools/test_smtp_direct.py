import asyncio
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def test_smtp():
    # Use the credentials from config.py
    host = "smtp.gmail.com"
    port = 587
    user = "arunpandianreshandthosh2022@gmail.com"
    password = "ughyudissonfgngt"  # This is the password from config.py
    
    # Recipient
    to_email = "hariharan@reshandthosh.com"
    
    print(f"Testing SMTP for {user} -> {to_email}...")
    
    message = MIMEMultipart()
    message["From"] = f"Tour SaaS <{user}>"
    message["To"] = to_email
    message["Subject"] = "SMTP Diagnostic Test"
    message.attach(MIMEText("This is a diagnostic test of the TourSaaS SMTP system.", "plain"))
    
    try:
        await aiosmtplib.send(
            message,
            hostname=host,
            port=port,
            username=user,
            password=password,
            use_tls=False,
            start_tls=True,
            timeout=30
        )
        print("SUCCESS: SMTP test email sent!")
    except Exception as e:
        print(f"FAILURE: SMTP test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_smtp())

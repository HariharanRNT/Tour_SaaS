from email.message import EmailMessage
import base64

def test_structure():
    body = "<h1>Hello</h1><p>This is a test.</p> \u20b9100"
    attachment_bytes = b"%PDF-1.4 dummy content"
    attachment_filename = "test.pdf"

    message = EmailMessage()
    message["Subject"] = "Test Subject"
    message["From"] = "Sender <sender@example.com>"
    message["To"] = "receiver@example.com"
    
    # This sets the content as HTML
    message.set_content(body, subtype='html')
    
    print(f"Structure after set_content: {message.get_content_maintype()}/{message.get_content_subtype()}")
    print(f"Is multipart? {message.is_multipart()}")
    
    # This should convert it to multipart/mixed
    message.add_attachment(
        attachment_bytes,
        maintype="application",
        subtype="pdf",
        filename=attachment_filename
    )
    
    print(f"Structure after add_attachment: {message.get_content_maintype()}/{message.get_content_subtype()}")
    print(f"Is multipart? {message.is_multipart()}")
    for part in message.iter_parts():
        print(f"Part: {part.get_content_type()}, Filename: {part.get_filename()}")

if __name__ == "__main__":
    test_structure()

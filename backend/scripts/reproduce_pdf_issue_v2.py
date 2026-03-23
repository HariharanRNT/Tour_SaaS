import os
import sys
from decimal import Decimal
from datetime import datetime
import uuid

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.services.invoice_service import InvoiceService

class MockObject:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def reproduce():
    print("Starting PDF generation test...")
    
    mock_package = MockObject(
        title="Chennai 3 days Packae",
        destination="Chennai",
        duration_days=3,
        duration_nights=2
    )
    
    # Use real absolute path for logo
    current_dir = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(current_dir, "app", "static", "logo.png")
    
    mock_agent_profile = MockObject(
        homepage_settings={"navbar_logo_image": logo_path}
    )
    
    mock_agent = MockObject(
        agency_name="RNT Travel Team",
        business_address="Chennai, Tamil Nadu",
        city="Chennai",
        state="Tamil Nadu",
        country="India",
        gst_no="29AAAAA0000A1Z5",
        email="hariharan@reshandthosh.com",
        first_name="Hari",
        last_name="Haran",
        agent_profile=mock_agent_profile
    )
    
    mock_user = MockObject(
        first_name="Hari",
        last_name="Haran",
        email="hariharan@reshandthosh.com"
    )
    
    mock_booking = MockObject(
        id=uuid.uuid4(),
        booking_reference="BKGPO366883",
        package=mock_package,
        agent=mock_agent,
        user=mock_user,
        total_amount=Decimal("1180.00"),
        created_at=datetime.now(),
        travel_date=datetime.now() ,
        number_of_travelers=2,
        payments=[]
    )
    
    try:
        pdf_bytes = InvoiceService.generate_booking_invoice_pdf(mock_booking, mock_user)
        if pdf_bytes:
            print(f"SUCCESS: Generated PDF bytes of length {len(pdf_bytes)}")
            with open("test_invoice_final.pdf", "wb") as f:
                f.write(pdf_bytes)
            print("PDF saved to test_invoice_final.pdf")
        else:
            print("FAILURE: PDF generation returned None")
    except Exception as e:
        print(f"EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reproduce()


import sys
import os
from datetime import date, timedelta
from decimal import Decimal

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.models import Booking, Payment, PaymentStatus, BookingStatus
from app.services.cancellation_service import calculate_refund

class SimpleObject:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def test_refund_calculation():
    print("Testing refund calculation with PAID status...")
    
    # 1. Setup mock booking
    package = SimpleObject(
        cancellation_enabled=True,
        cancellation_rules=[
            {"daysBefore": 6, "refundPercentage": 75},
            {"daysBefore": 3, "refundPercentage": 50},
            {"daysBefore": 2, "refundPercentage": 25},
            {"daysBefore": 1, "refundPercentage": 0}
        ],
        gst_applicable=False
    )
    
    booking = SimpleObject(
        id="test-booking-id",
        travel_date=date.today() + timedelta(days=13),
        total_amount=Decimal("1180.00"),
        package=package
    )
    
    # 2. Setup mock payment with PAID status
    payment = SimpleObject(
        amount=Decimal("1180.00"),
        status="PAID" # Testing string representation
    )
    booking.payments = [payment]
    
    # 3. Calculate refund
    rules = booking.package.cancellation_rules
    result = calculate_refund(booking, rules)
    
    print(f"Days before: {result['days_before']}")
    print(f"Paid amount: {result['paid_amount']}")
    print(f"Refund amount: {result['refund_amount']}")
    print(f"Refund percentage: {result['refund_percentage']}%")
    print(f"Message: {result['message']}")
    
    assert result['paid_amount'] == 1180.0
    assert result['refund_percentage'] == 75.0
    assert result['refund_amount'] == 885.0
    
    # Test with Enum-like object
    payment.status = SimpleObject(name="PAID", __str__=lambda s: "PAID")
    # Actually, the check is: 
    # p.status in (PaymentStatus.SUCCEEDED, PaymentStatus.PAID)
    # or str(p.status).lower() in ("succeeded", "paid", ...)
    
    payment.status = "PaymentStatus.PAID"
    result = calculate_refund(booking, rules)
    assert result['paid_amount'] == 1180.0
    
    print("\nSUCCESS: Refund calculation correctly identified PAID status.")

if __name__ == "__main__":
    try:
        test_refund_calculation()
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()

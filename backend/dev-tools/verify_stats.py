import os
import sys

# Add current directory to path for imports
sys.path.append(os.getcwd())

from sqlalchemy import select, func, or_, and_
from app.models import Booking, BookingStatus, PaymentStatus, Package
# We don't need a real engine, just a dialect for compilation
from sqlalchemy.dialects import postgresql 

# Mock values
agent_id = "some-uuid"

def print_query(stmt):
    print(str(stmt.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})))

print("--- Total Bookings Query ---")
bk_count_query = select(func.count(Booking.id)).where(
    Booking.agent_id == agent_id,
    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
    Booking.payment_status == PaymentStatus.SUCCEEDED
)
print_query(bk_count_query)

print("\n--- Active Bookings Query ---")
active_query = select(func.count(Booking.id)).where(
    Booking.agent_id == agent_id,
    Booking.status == BookingStatus.CONFIRMED,
    Booking.payment_status == PaymentStatus.SUCCEEDED
)
print_query(active_query)

print("\n--- Total Revenue Query ---")
rev_query = select(func.sum(Booking.total_amount)).where(
    Booking.agent_id == agent_id,
    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
    Booking.payment_status == PaymentStatus.SUCCEEDED
)
print_query(rev_query)

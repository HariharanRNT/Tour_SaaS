# Package Booking, GST, Cancellation & Dashboard Flow

This document outlines how package pricing, GST, cancellations, and dashboard statistics are implemented in the `RNT_Tour` project based on the current codebase.

## 1. Package Pricing & GST Flow

### 1.1 Package Setup
When an agent creates a package, pricing and GST settings are defined in the `Package` model:
- `price_per_person`: The base cost per traveler.
- `gst_applicable` (Boolean): Whether GST applies to this package.
- `gst_percentage` (Numeric): The tax rate (e.g., 18.00).
- `gst_mode` (String): Can be `'inclusive'` or `'exclusive'`.

### 1.2 Booking Creation
When a customer books a package, a `Booking` record is created. The booking captures a snapshot of the pricing and GST rules at that specific time to prevent future package edits from affecting existing bookings.
Fields saved in `Booking`:
- `total_amount`: The final amount the user pays.
- `gst_percentage`, `gst_amount`, `is_gst_inclusive`, `base_amount`: Snapshots of the tax calculations.
- `cancellation_enabled`, `cancellation_rules`: Snapshots of the cancellation policy.

If GST is **inclusive**, `base_amount = total_amount / (1 + gst_percentage / 100)`.
If GST is **exclusive**, `base_amount` is calculated similarly relative to the total, but the `total_amount` is the sum of the base fare and the calculated GST.

---

## 2. Cancellation Rules & Flow

### 2.1 Rule Configuration
Cancellation policies are stored as JSON in the `cancellation_rules` field on the `Package` (and snapshotted on the `Booking`).
A typical rule looks like this:
```json
[
  {"daysBefore": 30, "refundPercentage": 100, "fareType": "total_fare"},
  {"daysBefore": 15, "refundPercentage": 50, "fareType": "base_fare"},
  {"daysBefore": 0, "refundPercentage": 0, "fareType": "total_fare"}
]
```
These rules are **always sorted in descending order** by `daysBefore`.

### 2.2 Cancellation Execution (`cancellation_service.py`)
When a cancellation is triggered, the `process_cancellation` function is called:
1. **Validation & Locking**: The booking row is locked (`SELECT FOR UPDATE`) to prevent race conditions. It verifies the booking isn't already cancelled and the travel date hasn't passed.
2. **Refund Calculation**: 
   - Calculates `days_before` = `(travel_date - today)`.
   - Finds the first rule where `days_before >= rule.daysBefore`.
   - Retrieves the `refundPercentage` and `fareType`.
3. **GST-Aware Refund Logic**:
   - If `gst_applicable = True` AND `fareType = 'base_fare'`:
     The refund applies **only to the base fare**. The GST portion is forfeited.
     `refund = (refundPercentage / 100) * base_fare`
   - Otherwise (e.g., `fareType = 'total_fare'` or GST not applicable):
     `refund = (refundPercentage / 100) * total_paid`
4. **Razorpay Integration**: Resolves the agent's Razorpay credentials and triggers the refund API.
5. **Database Updates**: 
   - A `BookingRefund` record is created to track the Razorpay refund ID and status.
   - The `Booking` is updated with `status = 'CANCELLED'`, `refund_amount`, and `cancelled_at`.
6. **Notifications**: Sends cancellation confirmation emails to the customer and an alert to the agent, and cancels any scheduled reminders.

---

## 3. Agent Dashboard Data Flow

The agent dashboard (`agent_dashboard.py`) aggregates this booking and cancellation data to display key metrics. 

### 3.1 Date Filtering
The dashboard accepts date filters (`1D`, `7D`, `30D`, or `CUSTOM`). All stats are scoped to the `current_agent.agent_id` and filtered by `created_at`.

### 3.2 Key Metrics Shown
- **Package Stats**: Counts of Total, Published, and Draft packages.
- **Booking Stats**:
  - `totalBookings`: Count of CONFIRMED, COMPLETED, or CANCELLED bookings with successful payments.
  - `activeBookings`: Count of CONFIRMED bookings where `travel_date >= today`.
  - `pendingBookings`: Count of PENDING bookings where `travel_date >= today`.
  - `cancelledBookings`: Count of CANCELLED bookings.
  - `todayBookings`: Count of successful bookings created today.
- **Total Revenue**: 
  Calculated as the sum of `(total_amount - refund_amount)` for all successful bookings (CONFIRMED, COMPLETED, CANCELLED). This ensures refunded amounts are deducted from the agent's revenue.
- **Enquiries**: Total count of customer enquiries.

### 3.3 Analytics & Benchmarks
- **Most Popular Package**: The package with the highest number of bookings. Shows conversion rate (`bookings / views * 100`) and total revenue generated.
- **Least Popular Package**: The package with the lowest traction.
- **Most Booked Packages List**: Top 5 packages by booking count.
- **Recent Bookings**: 
  - `Upcoming`: Top 5 upcoming trips (`travel_date >= today` and not cancelled/completed).
  - `Completed`: Top 5 past trips (`travel_date < today` or status is completed).

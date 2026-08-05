# Split Payment — Full Implementation Prompt (RNT_Tour)

## Architecture Decision: Hybrid Model

This document describes the complete implementation of a two-payment split system using a **hybrid model** with three layers:

1. **Customer Portal** — primary self-service payment (always available)
2. **Automatic Reminder Emails** — Celery Beat driven, zero agent effort
3. **Agent Manual Reminder** — backup override from the Split Payment Tracker

Two split modes are supported:

- **Date-wise**: System automates everything based on a date rule
- **Agent Approval (Manual)**: Final payment is locked until agent explicitly unlocks it (useful for visa-dependent or complex packages)

> **Constraint**: This is purely additive. No existing models, services, views, or flows are modified unless explicitly stated. Every change to an existing file is a safe extension — new nullable fields, new conditional branches, new UI tabs.

---

## Part 1 — Database Changes

### 1.1 New Table: `BookingPayment` (Payment Ledger)

Replace the previously proposed `SplitPaymentLink` table with a proper payment ledger. This single table handles full payments, split advance, split final, and any future installment payments — making revenue calculation a simple `SUM(amount)` rather than complex CASE logic.

```
id                      UUID, primary key
booking_id              FK → Booking, not null, indexed
payment_type            String(20): 'FULL' | 'ADVANCE' | 'FINAL'
amount                  Numeric(10,2), not null
payment_status          String(20): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
razorpay_order_id       String(100), nullable
razorpay_payment_id     String(100), nullable
razorpay_link_id        String(100), nullable  ← for payment link based collections
payment_date            DateTime, nullable      ← set when status becomes PAID
due_date                Date, nullable          ← set for FINAL type
link_sent_at            DateTime, nullable
link_expires_at         DateTime, nullable
triggered_by            String(10): 'SYSTEM' | 'AGENT'  ← audit: who enabled this payment
triggered_by_name       String(100), nullable            ← agent name or "System Auto Trigger"
created_at              DateTime, auto
updated_at              DateTime, auto
```

**Why this replaces the CASE-based revenue approach:**

```
Revenue = SUM(amount) WHERE payment_status = 'PAID' AND booking_id IN [agent's bookings]
Refunded = SUM(refund_amount) FROM BookingRefund WHERE booking_id IN [agent's bookings]
Net Revenue = Revenue - Refunded
```

This works identically for full payment, split, and any future payment type without any schema change.

---

### 1.2 Package Model — New Fields (all nullable, default=False/None)

```
split_payment_enabled           Boolean, default=False
split_payment_mode              String(20), nullable: 'date_wise' | 'manual'
advance_payment_type            String(15), nullable: 'percentage' | 'fixed'
advance_payment_value           Numeric(10,2), nullable
final_payment_due_days          Integer, nullable
final_payment_due_direction     String(20), nullable: 'before_travel' | 'after_booking'
```

---

### 1.3 Booking Model — New Fields (all nullable, default=NOT_APPLICABLE)

```
is_split_payment                Boolean, default=False
split_payment_mode              String(20), nullable     ← snapshot at booking time
advance_amount                  Numeric(10,2), nullable
final_amount                    Numeric(10,2), nullable
final_payment_due_date          Date, nullable
advance_payment_status          String(20), default='NOT_APPLICABLE'
                                values: 'NOT_APPLICABLE' | 'PENDING' | 'PAID'
final_payment_status            String(20), default='NOT_APPLICABLE'
                                values: 'NOT_APPLICABLE' | 'LOCKED' | 'PENDING' | 'PAID'
```

`final_payment_status` carries the full state on its own — no separate boolean needed:

```
NOT_APPLICABLE  → non-split booking, field is irrelevant
LOCKED          → manual mode: advance paid, waiting for agent approval
PENDING         → payment link is active, customer can pay
PAID            → final payment received
```

The `LOCKED → PENDING` transition is the only state change the agent triggers. Everything else is driven by payment webhooks or Celery.

---

### 1.4 BookingRefund Model — Add One Field

```
refund_basis                    String(20), nullable: 'advance_only' | 'full'
```

Nullable so all existing refund records remain valid.

---

### 1.5 Migration Safety

All new fields have defaults or are nullable. Run migrations with zero downtime. Existing rows are unaffected — `is_split_payment=False` on all existing bookings means every existing code path bypasses the new logic entirely.

---

## Part 2 — Split Amount Calculation

### New File: `split_payment_service.py`

Nothing in existing service files is modified. All new logic lives here.

---

### `calculate_split_amounts(total_amount, advance_type, advance_value)`

```python
if advance_type == 'percentage':
    advance_amount = math.floor(total_amount * advance_value / 100)
elif advance_type == 'fixed':
    advance_amount = advance_value

final_amount = total_amount - advance_amount  # always derived, never independently rounded
return advance_amount, final_amount
```

This guarantees `advance + final = total` with no rounding drift.

---

### `calculate_final_payment_due_date(travel_date, booking_date, direction, days)`

```python
if direction == 'before_travel':
    return travel_date - timedelta(days=days)
elif direction == 'after_booking':
    return booking_date + timedelta(days=days)
```

---

### `should_bypass_split(travel_date, booking_date, package) → (bool, reason)`

```python
if package.split_payment_mode == 'date_wise':
    due_date = calculate_final_payment_due_date(...)
    if direction == 'before_travel':
        if (travel_date - booking_date).days < package.final_payment_due_days:
            return True, "Travel date too close — full payment collected"
    if direction == 'after_booking':
        if due_date >= travel_date:
            return True, "Payment due date falls on or after travel — full payment collected"

return False, None
```

---

### `enable_final_payment(booking_id, triggered_by, triggered_by_name)` ← key new function

This is called either automatically (date-wise, by Celery) or manually (by agent clicking unlock).
`triggered_by` is `'SYSTEM'` or `'AGENT'`. `triggered_by_name` is `'System Auto Trigger'` or the agent's name.

```python
booking = Booking.query.with_for_update().get(booking_id)

# Guard: only activate if advance is paid and final is still locked/pending
if booking.advance_payment_status != 'PAID':
    raise Exception("Advance not yet paid")
if booking.final_payment_status not in ('LOCKED', 'PENDING'):
    raise Exception("Final payment already processed or not applicable")

# Generate Razorpay Payment Link for final_amount
link = razorpay_client.payment_link.create({
    'amount': int(booking.final_amount * 100),
    'currency': 'INR',
    'description': f'Final payment for {booking.package.title} — Ref: {booking.reference}',
    'customer': {
        'email': booking.customer.email,
        'contact': booking.customer.phone,
        'name': booking.customer.name
    },
    'expire_by': int(booking.final_payment_due_date.timestamp()) if booking.final_payment_due_date else None,
    'notify': {'sms': True, 'email': True}
})

# Update BookingPayment record — set audit fields
final_payment = BookingPayment.query.filter_by(
    booking_id=booking_id, payment_type='FINAL'
).first()
final_payment.razorpay_link_id = link['id']
final_payment.link_sent_at = datetime.utcnow()
final_payment.payment_status = 'PENDING'
final_payment.triggered_by = triggered_by               # 'SYSTEM' or 'AGENT'
final_payment.triggered_by_name = triggered_by_name     # name for audit display

# Transition final_payment_status: LOCKED → PENDING (or stays PENDING for date_wise)
booking.final_payment_status = 'PENDING'

db.session.commit()

# Send email to customer
send_final_payment_link_email(booking, link['short_url'])

return link['short_url']
```

---

## Part 3 — Booking Creation Changes

### In existing booking creation service — additive branch only

The existing full-payment path is the `else` fallback and is completely unchanged.

```python
if package.split_payment_enabled and booking_type == 'instant':

    bypass, reason = should_bypass_split(travel_date, today, package)

    if not bypass:
        advance_amount, final_amount = calculate_split_amounts(
            total_amount,
            package.advance_payment_type,
            package.advance_payment_value
        )
        final_due_date = calculate_final_payment_due_date(
            travel_date, today,
            package.final_payment_due_direction,
            package.final_payment_due_days
        ) if package.split_payment_mode == 'date_wise' else None

        # Populate booking
        booking.is_split_payment = True
        booking.split_payment_mode = package.split_payment_mode  # snapshot
        booking.advance_amount = advance_amount
        booking.final_amount = final_amount
        booking.final_payment_due_date = final_due_date
        booking.advance_payment_status = 'PENDING'
        booking.final_payment_status = 'LOCKED' if package.split_payment_mode == 'manual' else 'PENDING'
        # Note: no final_payment_enabled field — final_payment_status='LOCKED' carries this meaning

        # Create BookingPayment records
        BookingPayment.create(booking_id, type='ADVANCE', amount=advance_amount,
                              status='PENDING', triggered_by='SYSTEM', triggered_by_name='System')
        BookingPayment.create(booking_id, type='FINAL', amount=final_amount,
                              status='PENDING', due_date=final_due_date,
                              triggered_by=None, triggered_by_name=None)  # set when link is enabled

        # Create Razorpay ORDER for advance_amount only
        razorpay_order = razorpay_client.order.create({'amount': int(advance_amount * 100), ...})

        # On advance payment webhook success:
        #   booking.advance_payment_status = 'PAID'
        #   booking.status = 'CONFIRMED'
        #   BookingPayment(ADVANCE).payment_status = 'PAID'
        #   BookingPayment(ADVANCE).payment_date = now()
        #   Send split_payment_booking_confirmation_email

    else:
        # Log bypass reason, proceed with existing full-payment flow
        booking.is_split_payment = False  # default, no change needed
        # → existing Razorpay order for total_amount, existing flow unchanged

else:
    # Existing full-payment flow — completely unchanged
```

---

## Part 4 — Cancellation Logic Changes

### In existing `cancellation_service.py` — new branch before Razorpay call

The existing logic becomes the `else` of this new condition. Nothing is deleted.

```python
# Existing rule-matching — unchanged
days_before = (travel_date - today).days
matched_rule = first rule where days_before >= rule['daysBefore']
refund_percentage = matched_rule['refundPercentage']
fare_type = matched_rule['fareType']

# Critical rule: refund is ALWAYS based on money actually received
# Never calculate refund against final_amount if it hasn't been paid

if booking.is_split_payment and booking.final_payment_status in ('PENDING', 'LOCKED'):
    # Only advance was received
    money_received = booking.advance_amount

    if fare_type == 'base_fare' and booking.gst_applicable:
        # Derive base proportion of advance amount only
        if booking.is_gst_inclusive:
            advance_base = money_received / (1 + booking.gst_percentage / 100)
        else:
            # advance already contains proportional GST
            advance_base = money_received / (1 + booking.gst_percentage / 100)
        refund = (refund_percentage / 100) * advance_base
    else:
        refund = (refund_percentage / 100) * money_received

    booking_refund.refund_basis = 'advance_only'

elif booking.is_split_payment and booking.final_payment_status == 'PAID':
    # Both payments received — treat identically to full payment booking
    # Existing logic applies, no change
    money_received = booking.total_amount
    # ... existing refund calculation unchanged ...
    booking_refund.refund_basis = 'full'

else:
    # Non-split booking — existing logic completely unchanged
    # ... existing refund calculation ...
    booking_refund.refund_basis = 'full'

# Everything after this point (Razorpay refund API, DB update, emails) — unchanged
```

**Edge case explicitly handled:** If advance is paid and final is due tomorrow and customer cancels, refund is based only on the advance amount received, never on the final amount that was never collected.

---

## Part 5 — Revenue Calculation

### In existing `agent_dashboard.py` — replace revenue query only

With the `BookingPayment` ledger, revenue is now simple and future-proof:

```python
# New revenue query — replaces the CASE-based formula
revenue_result = db.session.query(
    func.sum(BookingPayment.amount)
).join(Booking).filter(
    Booking.agent_id == current_agent.agent_id,
    BookingPayment.payment_status == 'PAID',
    Booking.status.in_(['CONFIRMED', 'COMPLETED', 'CANCELLED']),
    Booking.created_at.between(date_from, date_to)
).scalar() or 0

refund_result = db.session.query(
    func.sum(BookingRefund.refund_amount)
).join(Booking).filter(
    Booking.agent_id == current_agent.agent_id,
    BookingRefund.status == 'SUCCESS',
    Booking.created_at.between(date_from, date_to)
).scalar() or 0

total_revenue = revenue_result - refund_result
```

This works for full payment, split advance-only, split fully paid, and any future payment type without any further changes.

No other dashboard metrics are affected.

---

## Part 6 — Agent Package Creation UI (Basic Info Tab)

### Placement

Add a **Split Payment** section in the Basic Info tab, positioned directly below the existing **GST Configuration** section and above **Cancellation Policy**. Match the existing card style exactly.

### Toggle Disable Rule

If **Booking Type = Custom Enquiry**, disable the split payment toggle and show tooltip: *"Split payment is only available for Instant Booking packages."* When agent switches from Instant to Custom, auto-disable the toggle silently.

### Section UI Structure

```
┌────────────────────────────────────────────────────────────────────┐
│ 💳  Split Payment                                                  │
│     Collect payment in two parts — advance now, rest later         │
│                                               [ toggle  OFF / ON ] │
│                                                                    │
│  (Shown only when toggle ON + Booking Type = Instant)             │
│                                                                    │
│  PAYMENT MODE                                                      │
│  ( ●) Date-wise automatic    ( ) Agent approval (manual)           │
│                                                                    │
│  ADVANCE PAYMENT                                                   │
│  Type: [ Percentage ▼ ]    Value: [ 30 ] %                         │
│                                                                    │
│  — shown only when mode = date_wise —                             │
│  FINAL PAYMENT DUE                                                 │
│  [ 7 ] days   (●) Before travel date   ( ) After booking date      │
│                                                                    │
│  — shown only when mode = manual —                                │
│  ℹ  Final payment will be unlocked manually after your approval.  │
│     Customer sees a locked state until you enable it.             │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Payment Split Preview (per person)                        │   │
│  │                                                            │   │
│  │  Package Base Price           ₹  1,000.00                  │   │
│  │  GST 18% (exclusive)         +₹    180.00                  │   │
│  │  Total Amount                 ₹  1,180.00                  │   │
│  │  ──────────────────────────────────────                    │   │
│  │  Advance (30%)                ₹    354.00  ← pay at booking│   │
│  │  Final   (70%)                ₹    826.00  ← pay by rule   │   │
│  │  ──────────────────────────────────────                    │   │
│  │  Confirms total               ₹  1,180.00                  │   │
│  │                                                            │   │
│  │  📅 e.g. Booked Aug 1, travel Aug 20                       │   │
│  │     Final payment due: Aug 13 (7 days before travel)       │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ⚠  Packages booked within [days] days of travel date will        │
│     collect full payment automatically.                           │
└────────────────────────────────────────────────────────────────────┘
```

### Live Preview Calculation (frontend, no API call)

Recalculates on every change to: price per person, GST %, GST mode, advance type, advance value.

```javascript
// GST
if (gst_mode === 'exclusive') {
    total = price_per_person * (1 + gst_pct / 100)
    gst_amount = total - price_per_person
} else {
    total = price_per_person
    gst_amount = total - (total / (1 + gst_pct / 100))
}

// Split
if (advance_type === 'percentage') {
    advance = Math.floor(total * advance_pct / 100)
} else {
    advance = advance_fixed_value
}
final = total - advance  // always remainder
```

### Validation Rules

```
- advance_payment_value required when split is enabled
- type=percentage: 1 ≤ value ≤ 99
- type=fixed: value must be less than price_per_person (before GST)
- mode=date_wise: final_payment_due_days required, minimum = 1
- direction=before_travel + days < 3: show warning "Very short window for customer to pay"
```

---

## Part 7 — Customer Portal Changes

### 7.1 Booking Checkout Page — Payment Breakdown

When `split_payment_enabled = True` and split is not bypassed, replace the single total display:

```
┌──────────────────────────────────────────────────────┐
│  Payment Breakdown                                   │
│  ──────────────────────────────────────────────────  │
│  Package Base Price                    ₹  1,000.00   │
│  GST 18% (exclusive)                  +₹    180.00   │
│  Total                                 ₹  1,180.00   │
│  ──────────────────────────────────────────────────  │
│  Pay Now (Advance 30%)                 ₹    354.00   │
│  Pay Later (Final 70%)                 ₹    826.00   │
│    📅 Due by: 13 Aug 2026             ← date_wise    │
│    🔒 Unlocked after agent approval   ← manual       │
│  ──────────────────────────────────────────────────  │
│  Paying Today                          ₹    354.00   │
└──────────────────────────────────────────────────────┘
```

If bypassed: show normal total only with note *"Full payment required for this travel date."*

---

### 7.2 My Bookings Page — Card Changes

For split payment bookings, add one new chip to the existing chip row (Travel Date, Travelers, Payment Status, Policy). Keep all existing chips unchanged.

```
New chip — NEXT PAYMENT:

  ₹826 due Aug 13          ← date_wise, final pending, date set
  ₹826 pending unlock      ← manual, final locked by agent
  ₹826 — Pay Now           ← final enabled, link ready (clickable)
  Fully Paid ✓             ← both payments complete
```

TOTAL AMOUNT on the card always shows the full `total_amount`, not just advance. Consistent with all booking types.

---

### 7.3 Booking Detail Page — Payment Summary Tab

Extend the existing right-side **PAYMENT SUMMARY** tab. All existing fields (Package Base Cost, Taxes & Service, Reference) remain exactly as-is. Add a Payment Schedule section below:

**State 1 — Advance paid, final pending (date_wise):**
```
TOTAL INVESTMENT'S         ₹1,180.00
● Advance Paid  ◷ Final Pending

Package Base Cost                  ₹1,000.00
Taxes & Service (18% Excl)          ₹  180.00
Reference                         BKPUF234431

─── Payment Schedule ────────────────────────
✓  Advance Paid      ₹354.00   Jun 10, 2026
◷  Final Payment     ₹826.00   Due Aug 13, 2026
                                [ Pay Now → ]
─────────────────────────────────────────────
   Total             ₹1,180.00
```

`[ Pay Now → ]` appears once the Razorpay Payment Link has been generated (auto on date-wise trigger, or after agent enables for manual mode). Before a link is ready, show: *"Payment link will be sent to your email closer to due date."*

**State 2 — Manual mode, final locked:**
```
✓  Advance Paid      ₹354.00   Jun 10, 2026
🔒  Final Payment    ₹826.00   Waiting for agent approval
                               Visa processing in progress.
                               Final payment will be enabled after approval.
```

**State 3 — Manual mode, agent unlocked:**
```
✓  Advance Paid      ₹354.00   Jun 10, 2026
◷  Final Payment     ₹826.00   Enabled — Due Aug 13, 2026
                               [ Pay Now → ]
```

**State 4 — Fully paid:**
```
✓  Advance Paid      ₹354.00   Jun 10, 2026
✓  Final Paid        ₹826.00   Aug 5, 2026
─────────────────────────────────────────────
✓  Total Paid        ₹1,180.00
```

---

## Part 8 — Automatic Reminder Emails (Celery Beat)

### New File: `split_payment_tasks.py`

Do not modify the existing Celery tasks file.

---

### Task 1: `trigger_final_payment_links` (date_wise only)

**Schedule:** Daily at 9:00 AM

**Query:**
```python
bookings where:
  is_split_payment = True
  split_payment_mode = 'date_wise'
  advance_payment_status = 'PAID'
  final_payment_status = 'PENDING'      ← PENDING means link not yet generated (date_wise starts here)
  BookingPayment(FINAL).razorpay_link_id IS NULL  ← link not yet created
  final_payment_due_date = today + 7 days  ← first trigger window
  status != 'CANCELLED'
```

**Action:** Call `enable_final_payment(booking_id, triggered_by='SYSTEM', triggered_by_name='System Auto Trigger')` for each.

---

### Task 2: `send_final_payment_reminders` (both modes, after link is active)

**Schedule:** Daily at 9:00 AM

**Query:**
```python
bookings where:
  is_split_payment = True
  advance_payment_status = 'PAID'
  final_payment_status = 'PENDING'
  BookingPayment(FINAL).razorpay_link_id IS NOT NULL  ← link already generated
  status != 'CANCELLED'
  AND (
    final_payment_due_date = today + 7  ← 7-day reminder
    OR final_payment_due_date = today + 3  ← 3-day reminder
    OR final_payment_due_date = today + 1  ← 1-day reminder
    OR final_payment_due_date = today - 1  ← overdue reminder
  )
```

**Action per booking:** Send reminder email with amount, due date, and Pay Now button (linking to existing Razorpay Payment Link URL from `BookingPayment.razorpay_link_id`). Do not generate a new link — reuse the existing one.

Reminder schedule summary:
```
T-7 days  → "Final payment due in 7 days"
T-3 days  → "Final payment due in 3 days — don't miss it"
T-1 day   → "Final payment due tomorrow"
T+1 day   → "Your final payment is overdue — please pay to keep your booking"
```

---

### Task 3: `flag_overdue_split_payments`

**Schedule:** Daily at 10:00 AM

**Query:**
```python
bookings where:
  is_split_payment = True
  final_payment_status = 'PENDING'
  final_payment_due_date < today
  status != 'CANCELLED'
```

**Action:** Send overdue alert to agent (list of affected bookings). Do not auto-cancel — agent decides. Flag these bookings in the Split Payment Tracker with a red indicator.

---

## Part 9 — Agent Split Payment Tracker (Booking Report Extension)

### 9.1 Add Third Tab

```
[ Upcoming Trips ]  [ Past Travels ]  [ Split Payments ]
```

Tab is visible only when the agent has at least one split payment booking. Otherwise hide it.

---

### 9.2 Summary Bar (Split Payments tab only)

Replace the `TOTAL / UPCOMING / COMPLETED / CANCELLED` bar with:

```
ADVANCE PAID: 8    FINAL PENDING: 5    OVERDUE: 2    LOCKED: 3    FULLY PAID: 12
```

Each is a clickable filter chip. `LOCKED` is the new state unique to manual mode.

---

### 9.3 Booking Card — Extended Structure

Reuse the existing card structure exactly. Add a payment status section between the customer info row and the action buttons row:

**Date-wise card — final pending:**
```
[existing: package image, title, CONFIRMED badge, Ref, location/duration/guests]
[existing: customer avatar, name, accompaniment]

─── Split Payment ─────────────────────────────────────────────────
  Advance Paid:  ₹354.00   ✓  Jun 10, 2026
  Final Due:     ₹826.00      Due Aug 13, 2026    ⚠ 3 days left
  Auto-reminder scheduled: Aug 10
───────────────────────────────────────────────────────────────────

[existing: TOTAL PAYMENT  ₹1,180.00]
[existing: Details button]   [ Resend Reminder ↺ ]
```

**Manual mode card — locked:**
```
─── Split Payment ─────────────────────────────────────────────────
  Advance Paid:  ₹354.00   ✓  Jun 10, 2026
  Final Payment: ₹826.00   🔒 Locked — awaiting your approval
───────────────────────────────────────────────────────────────────

[existing: Details button]   [ Enable Final Payment → ]
```

**Manual mode card — unlocked, awaiting customer:**
```
  Final Payment: ₹826.00   ◷ Link Sent  Jun 12, 2026
                              [ Resend Link ↺ ]
  Enabled by: Agent Hari — Jun 12, 2026 03:25 PM    ← from BookingPayment.triggered_by_name
```

**Date-wise card — link auto-generated by system:**
```
  Final Payment: ₹826.00   ◷ Link Sent  Aug 10, 2026
                              [ Resend Reminder ↺ ]
  Enabled by: System Auto Trigger                    ← triggered_by='SYSTEM'
```

**Overdue card:** Red left border, due date text in red.

**Fully paid card:** Green left border, no action button.

---

### 9.4 Action Button States

```
State                         Button shown
──────────────────────────────────────────────────────────────────
date_wise, link not yet sent  [ — ]  (system will auto-send)
date_wise, link sent          [ Resend Reminder ↺ ]  Sent Aug 10
manual, final locked          [ Enable Final Payment → ]
manual, link sent             [ Resend Link ↺ ]  Sent Jun 12, 4:23 PM
any, paid                     [ Paid ✓ ]  (green, disabled)
any, cancelled                [hidden]
```

**`[ Enable Final Payment → ]`** calls `enable_final_payment(booking_id, triggered_by='AGENT', triggered_by_name=current_agent.name)`:
- Generates Razorpay Payment Link
- Sends link email to customer
- Transitions `final_payment_status`: `LOCKED → PENDING`
- Records `triggered_by='AGENT'` and `triggered_by_name` on the `BookingPayment` record for audit
- Button changes to Resend state immediately (no page reload)

**`[ Resend Reminder ↺ ]` / `[ Resend Link ↺ ]`** calls `send_final_payment_link_email(booking)`:
- Reuses existing `BookingPayment.razorpay_link_id` — does NOT generate a new Razorpay link
- Updates `BookingPayment.link_sent_at = now()`
- Show loading spinner during call

---

## Part 10 — Razorpay Webhook Extension

### In existing webhook handler — add new event branch only

Do not modify any existing event handling.

```python
if event_type == 'payment_link.paid':
    payment_link_id = payload['payment_link']['id']

    final_payment = BookingPayment.query.filter_by(
        razorpay_link_id=payment_link_id,
        payment_type='FINAL',
        payment_status='PENDING'
    ).with_for_update().first()  # row lock for idempotency

    if final_payment:
        booking = Booking.query.get(final_payment.booking_id)

        if booking.final_payment_status == 'PENDING':  # idempotency guard
            final_payment.payment_status = 'PAID'
            final_payment.payment_date = datetime.utcnow()
            final_payment.razorpay_payment_id = payload['payment']['entity']['id']
            booking.final_payment_status = 'PAID'
            db.session.commit()

            send_final_payment_confirmation_email(booking)
            send_agent_final_payment_notification(booking)
```

---

## Part 11 — Email Templates (New, Additive)

No existing templates are modified. Create these new templates:

```
1. split_payment_booking_confirmation_email
   To: customer
   Content: advance paid amount + confirmation, final amount, due date or
            "locked until agent approval" message, booking ref, package,
            travel date, link to My Bookings portal

2. final_payment_link_email
   To: customer
   Content: amount due, due date, [ Pay Now → ] button,
            booking ref, package name, urgency line based on days remaining

3. final_payment_reminder_email  (reused for T-7, T-3, T-1 reminders)
   To: customer
   Content: same as above, subject line changes with urgency
            "7 days left" / "3 days left" / "Due tomorrow"

4. final_payment_overdue_email
   To: customer
   Content: overdue notice, amount, [ Pay Now → ] button, support contact

5. final_payment_confirmation_email
   To: customer
   Content: both payments complete, total paid, booking fully confirmed

6. split_payment_overdue_agent_email
   To: agent
   Content: table of overdue bookings — customer name, package, amount, days overdue

7. final_payment_enabled_notification_email
   To: customer (manual mode only, sent when agent clicks Enable)
   Content: "Your final payment is now ready", amount, [ Pay Now → ] button
```

---

## Part 12 — Impact Analysis

### What Changes (safe extensions only)

| Area | Change |
|---|---|
| `Package` model | 6 new nullable fields |
| `Booking` model | 7 new nullable fields (`final_payment_enabled` removed — `final_payment_status` carries that meaning) |
| `BookingRefund` model | 1 new nullable field |
| Booking creation service | New `if is_split_payment` branch, existing path is `else` |
| `cancellation_service.py` | New `if is_split_payment` branch wrapping existing logic |
| `agent_dashboard.py` | Revenue query rewritten using `BookingPayment` ledger |
| Razorpay webhook handler | New `payment_link.paid` event branch added |
| Booking Report page | New `Split Payments` tab added |
| Customer booking detail | Payment Schedule section added to PAYMENT SUMMARY tab |
| Customer My Bookings | One new chip added per split booking card |
| Customer checkout page | Conditional payment breakdown shown for split packages |

### What Is Guaranteed Unchanged

| Existing Feature | Status |
|---|---|
| Full-payment instant booking | Zero changes |
| Custom enquiry booking | Zero changes |
| GST calculation logic | Zero changes — split operates on output |
| Cancellation rule JSON structure | Zero changes |
| `process_cancellation` non-split path | Zero changes — new code is an `if` above it |
| All other dashboard metrics | Zero changes |
| Existing Celery tasks | Zero changes — new tasks in new file |
| All existing email templates | Zero changes |
| Agent package creation steps 2 & 3 | Zero changes |
| Booking Report Upcoming/Past tabs | Zero changes |
| Customer detail REFUND/POLICY/SUPPORT tabs | Zero changes |

---

## Part 13 — Implementation Order (Recommended)

```
Step 1  Database migrations (BookingPayment table, new fields)
Step 2  split_payment_service.py (pure logic, no UI dependency)
Step 3  Booking creation service — split branch
Step 4  Razorpay webhook — payment_link.paid handler
Step 5  Cancellation service — split branch
Step 6  Revenue query update in agent_dashboard.py
Step 7  Agent package creation UI — split payment section
Step 8  Customer checkout page — payment breakdown
Step 9  Customer My Bookings — new chip
Step 10 Customer booking detail — payment schedule section
Step 11 Agent Booking Report — Split Payments tab
Step 12 Celery tasks — split_payment_tasks.py
Step 13 Email templates
Step 14 End-to-end testing (date_wise flow, manual flow, cancellation, revenue)
```

Each step is independently deployable. Steps 1–6 (backend) can be deployed before any UI change ships. The feature is invisible to end users until Step 7 onwards because `split_payment_enabled = False` on all existing packages.

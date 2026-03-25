# Project Specification Document: TourSaaS

**Document Version:** 1.0  
**Date:** March 24, 2026  
**Status:** Approved for QA / Development  

---

## 1. PROJECT OVERVIEW

- **Product Name:** TourSaaS
- **Purpose:** A comprehensive Agent Portal for Tour Operations, enabling tour agents to create, manage, and sell tour packages, track bookings, and monitor financial performance.
- **Target Users:** 
  - **Tour Agents (B2B):** Primary users accessing the portal to manage their tour operations.
  - **Customers (B2C):** End-users interacting with the storefront to book packages.
- **Core Value Proposition:** A seamless, multi-tenant platform for tour operators to digitize inventory, automate bookings and payments, and gain actionable analytics, styled with a modern glassmorphic interface.
- **Tech Stack:** Next.js (React), Typescript, Vanilla CSS/Tailwind, FastAPI (Python), PostgreSQL, SQLAlchemy.
- **Deployment Environment:** Cloud-native environment (Vercel/AWS configuration) supporting multi-tenant architecture with high availability.

---

## 2. USER ROLES & PERMISSIONS

### 2.1 Role Descriptions
- **Agent Role:** Has full capabilities over their own tenant workspace. Can create and publish packages, manage activities, oversee bookings, dispatch partial or full refunds, and view proprietary analytics.
- **Admin Role:** Platform-level administrators. Can oversee all agents, monitor global platform revenue, handle system-wide settings, configure global payment gateways, and troubleshoot tenant issues.
- **Customer-Facing Role:** Can view published packages, initiate booking workflows, execute payments via Razorpay, and view their booking status.

### 2.2 Permission Matrix

| Feature / Action | Customer | Agent | Admin |
| :--- | :---: | :---: | :---: |
| View Published Packages | ✅ | ✅ | ✅ |
| Book a Package | ✅ | ❌ | ❌ |
| Cancel Own Booking | ✅ | ✅ | ❌ |
| Create / Edit Draft Packages | ❌ | ✅ (Own) | ✅ (All) |
| Publish / Unpublish Packages | ❌ | ✅ (Own) | ✅ (All) |
| Create / Manage Activities | ❌ | ✅ (Own) | ✅ (All) |
| Issue Manual Refunds | ❌ | ✅ | ✅ |
| View Financial Reports | ❌ | ✅ (Own) | ✅ (Global) |
| Modify Global / Payment Settings | ❌ | ❌ | ✅ |

---

## 3. MODULE-WISE FEATURE SPECIFICATION

### 3.1 Dashboard
- **Description:** Central landing hub for agents summarizing operations.
- **Business Rules:** Default view is 'Today'. Values are aggregated based on the selected period.
- **Validations:** Must gracefully handle 0/null data states.
- **Expected Behavior:** Renders top-line stats, quick actions (Create Package, View Bookings), and snapshot of recent performance.

### 3.2 Manage Packages
- **Description:** Core inventory management for creating and modifying tour packages.
- **Fields:** Name, Duration, Destination, Itinerary, Pricing, Inclusions, Exclusions, Images.
- **Business Rules:** Agents can save rough drafts. A package must have a valid Name, Destination, Price > 0, at least 1 Image, and an Itinerary to be eligible for "Publishing".
- **Validations:** Duration must be an integer > 0. Price cannot be negative.
- **Expected Behavior:** Ability to Create, Read, Update, Delete (CRUD), switch status from Draft to Published, and Archive packages. 

### 3.3 Activity Master
- **Description:** A library of individual activities/experiences to attach to itineraries.
- **Business Rules:** Activities are scoped per Agent. They can be reused across multiple packages.
- **Validations:** Activity Name is mandatory.
- **Expected Behavior:** Agents can add a new activity, edit existing ones, or delete unused activities.

### 3.4 My Bookings
- **Description:** Comprehensive ledger of all customer reservations.
- **Business Rules:** Only bookings attached to the Agent's packages are visible.
- **Validations:** Valid formatting required for Reference ID search.
- **Expected Behavior:** Filter bookings by status (Pending, Confirmed, Cancelled). Agents can click to view granular booking details, customer info, and pricing breakdown.

### 3.5 Billing & Finance
- **Description:** Financial administration layer handling invoices and payouts.
- **Business Rules:** Invoices are auto-generated upon Confirmation status.
- **Expected Behavior:** Tracks payments, generates downloadable PDF invoices, and displays payout summaries for the Agent's configured bank accounts.

### 3.6 Reports Module
- **Description:** Advanced analytics for revenue and package success rates. 
- **Expected Behavior:** Dynamically renders charts to compare performance across timelines. (See detailed spec in Section 4).

### 3.7 Settings
- **Description:** Agent preference and integration configuration center.
- **Business Rules:** Payment Gateway configurations require verified Live/Test keys to validate.
- **Expected Behavior:** Control over Agency Profile details, notification preferences (Email/SMS opt-ins), and Razorpay Integration setups.

---

## 4. REPORTS MODULE — DETAILED SPEC

### 4.1 Global Filters
- **Period Filter:** Options must exactly include: Today, Week, Month, YTM (Year-To-Month, Jan 1 to current date), All, Custom Range.
- **Custom Range Tool:** Contains a calendar split to pick Start Date and End Date.

### 4.2 Chart Granularity Rules
- **Today:** Data points per hour (24 data points).
- **Week:** Data points per day (7 data points).
- **Month:** Data points per day (~30 data points).
- **YTM:** Data points per month from January 1st to the current month.
- **All:** Data points grouped by month across all historical periods.
- **Custom Range:** Auto-detected granularity. <= 7 days (Daily), <= 60 days (Weekly), > 60 days (Monthly).

### 4.3 Key Components
- **Stat Cards:** Cards showing Total Revenue, Total Bookings, Cancellations, Total Refunds. Must include a `% change` indicator comparing to the immediately preceding equivalent period.
- **Revenue Trend:** Line chart combining two metrics (Revenue Line + Bookings line mapped on dual Y-axes or normalized scale).
- **Bookings vs Cancellations:** Grouped or stacked Vertical Bar chart comparing volume.
- **Revenue by Package:** Horizontal Bar chart sorting packages by highest revenue contribution.
- **Package Performance Table:** 
  - *Columns:* Package Name, Status, Page Views, Bookings, Revenue, Cancel %, Conversion %, Revenue Bar (Inline micro-chart).
- **Recent Bookings Table:**
  - *Columns:* Ref ID, Package Name, Customer, Amount, Booking Status, Refund Status, Refund Amount.
  - *Filters:* Includes dropdowns for Booking Status and Refund Filters.

---

## 5. BOOKING LIFECYCLE

### 5.1 Booking States
`Pending` ➔ `Confirmed` ➔ `Cancelled` ➔ `Refund Initiated` ➔ `Refund Success` / `Refund Failed`

### 5.2 State Transition & Business Logic
- **Pending:** Created when user initiates checkout. Inventory locked temporarily.
- **Confirmed:** Activated via webhook only upon successful Razorpay payment capture.
- **Cancelled:** Triggered manually by the Agent or the Customer via UI.
- **Refund Initiated:** Triggered if cancellation occurs during a refundable window.

### 5.3 Cancellation & Refund Rules
- **Cancellation Policy Rules:** Agents configure a policy per package (e.g., Strict, Flexible).
- **Refund Calculation:** Evaluated dynamically based on hours remaining until the start date. 
  - Example: 100% refund if > 7 days, 50% if > 48h, 0% if < 48h.
- System allows Agents to execute **Partial Refunds** outside automated guidelines if requested manually for disputes.

---

## 6. PAYMENT INTEGRATION (RAZORPAY)

### 6.1 Payment Flow
1. **Initiate:** Frontend sends package info to Backend. Backend requests Razorpay `order_id`.
2. **Checkout:** Frontend opens Razorpay popup. User completes transaction.
3. **Verify:** Razorpay returns `payment_id` and signature. Backend validates SHA256 signature to prevent tampering.
4. **Confirm:** Booking state is shifted to Confirmed and invoices are generated.

### 6.2 Webhooks & Events
- `payment.captured` - Triggers booking confirmation offline.
- `payment.failed` - Frees inventory lock, marks booking failed.
- `refund.processed` - Sets Booking Refund Status to Success.
- `refund.failed` - Alerts agent of processing anomaly.

### 6.3 Edge Cases to Handle
- **Payment Failed:** Show gentle error, retain booking context to let user try again.
- **Duplicate Payment Captures:** Webhook idempotency ensures same `order_id` is only confirmed once.
- **Partial Payment/Timeout:** Fail gracefully if payment is stalled.

---

## 7. DATA MODELS / ENTITIES

| Entity | Key Fields | Relationships | Constraints |
| :--- | :--- | :--- | :--- |
| **Agent** | ID, Name, Email, PasswordHash, RZ_Keys | 1:M with Package, Activity | Email must be unique |
| **Package** | ID, AgentID, Name, Destination, Price, Status | M:1 with Agent, 1:M with Booking | Price >= 0 |
| **Activity** | ID, AgentID, Name, Description | M:1 with Agent, M:M with Package | Name cannot be null |
| **Customer** | ID, Name, Email, Phone | 1:M with Bookings | |
| **Booking** | ID, RefID, PackageID, CustomerID, Status | M:1 with Pkg & Cust, 1:1 with Payment | RefID unique |
| **Payment** | ID, BookingID, RZ_OrderID, RZ_PaymentID | 1:1 with Booking | |
| **Refund** | ID, PaymentID, Amount, Status | M:1 with Payment | Amount <= Payment Total |
| **Invoice** | ID, BookingID, PDF_Url, CreatedAt | 1:1 with Booking | |

---

## 8. API ENDPOINTS SUMMARY

| Module | Method | Endpoint | Description | Auth Required |
| :--- | :---: | :--- | :--- | :---: |
| **Auth** | POST | `/api/v1/auth/login` | Authenticate Agent/User | None |
| **Packages** | GET | `/api/v1/packages` | List all agent inventory | Agent |
| **Packages** | POST | `/api/v1/packages` | Create new package | Agent |
| **Packages** | PUT | `/api/v1/packages/{id}` | Update package | Agent |
| **Bookings** | GET | `/api/v1/bookings` | Retrieve booking list (filtered) | Agent |
| **Bookings** | POST | `/api/v1/bookings/{id}/cancel`| Initiate cancellation flow | Agent / Customer |
| **Reports** | GET | `/api/v1/reports/dashboard` | Aggregated high-level metrics | Agent |
| **Reports** | GET | `/api/v1/reports/revenue-trend`| Revenue chart time-series data | Agent |
| **Payments** | POST | `/api/v1/payments/verify` | Verify Razorpay integrity | Customer Base |
| **Webhooks** | POST | `/api/v1/webhooks/razorpay` | Listen for Razorpay states | API Sec Signature |

---

## 9. BUSINESS RULES & VALIDATIONS

- **Package Publish Rules:** Hard stop on publish action if fields {Name, Destination, Images.length >= 1, Base Price > 0} are omitted.
- **Booking Rules:** A customer cannot complete checkout for a `Draft` package, or a `Published` package with dates in the past.
- **Refund Eligibility Check:** Prevent automated refund generation if Booking Status is `Pending` or already `Refund Initiated`.
- **Custom Filter Date Bounds:** Start Date must be `<= ` End Date. Total difference cannot exceed 365 days.
- **Revenue Calculation Engine:** Calculation must strictly subtract processed partial/full refunds from the total `payment.captured` gross amount.

---

## 10. UI/UX SPECIFICATION

### 10.1 Theme & Aesthetics
- **Core Theme:** Orange/Peach Glassmorphism. Highly premium, vibrant, deeply engaging.
- **Design Tokens:**
  - primary: `linear-gradient(to right, #FF7E5F, #FEB47B)`
  - surface: `rgba(255, 255, 255, 0.7)` with `backdrop-filter: blur(12px)`
  - rounded radius: `16px` for heavy containers, `8px` for buttons.
  - shadow depth: soft multi-layered shadows.

### 10.2 Component Behavior
- **Stat Cards:** Subtle scaling on hover (`scale 1.02`) with smooth CSS transition.
- **Sidebar Nav:** Fixed height to screen, active route indicated by peach accent color pill.
- **Period Filter Bar:** Sticks to the top of the viewport on scroll during deep analytics diving.

### 10.3 States Handling
- **Responsive:** Converts to hamburger navigation on screens `< 768px`; Tables introduce a horizontal scrollbar wrap.
- **Empty States:** Renders custom graphical illustrations (e.g., empty calendar) instead of blank white space.
- **Loading States:** Uses matching-layout skeleton loaders to avoid layout shifting (CLS) while data fetches.
- **Error States:** Uses styled toast notifications and graceful component-level error boundaries.

---

## 11. EDGE CASES & ERROR SCENARIOS

*QA Testers must explicitly verify these edge cases during UAT.*

### 11.1 Dashboard Module
1. Display behavior when the account is brand new (Zero data scenario).
2. Verifying % change logic when previous period had `0` bookings (prevent divide-by-zero fatal error).
3. Confirming widgets respect Agent's localized timezone at the 11:59 PM boundary.
4. Large integer rendering on Stat Cards (e.g., Millions in revenue breaking div widths).
5. Attempting to reload the Dashboard without an internet connection.

### 11.2 Manage Packages 
1. Bypassing UI validations to force-publish missing fields directly via cURL/Postman.
2. Entering negative values inside the custom pricing and duration input fields.
3. Uploading executable `.exe` or broken `.txt` files masquerading as Image files.
4. Concurrency: Two agents on the same tenant editing the same Draft package.
5. Deletion of a package that currently holds active future confirmed bookings.

### 11.3 Activity Master
1. Submissions with only 'white space' characters inside the Name field.
2. Character limit overflow inside the multi-line description text box.
3. Creation of duplicate identical Activity Names across an account.
4. Payload injection (XSS/SQLi) inside Activity description fields.
5. Deleting an activity that is mapped inside 10 different published itineraries.

### 11.4 My Bookings
1. Querying the Reference ID search box with regex flags or heavy special characters.
2. Selecting multiple conflicting status filters simultaneously (e.g., Both Pending & Confirmed if radio, valid if checkbox).
3. Pagination overflow: Requesting page 99 over API when only 2 pages exist.
4. Overly long customer names shifting table layouts and covering price columns.
5. Testing Race Condition where Customer cancels from B2C site and Agent presses Cancel at the exact same millisecond.

### 11.5 Billing & Finance
1. Attempting to trigger an invoice download for a $0/Free component package.
2. Evaluating layout when a partial refund invoice is dynamically appended to full invoice.
3. Correct rendering of Currency symbols across Safari, Firefox, and Chrome.
4. Load testing PDF Generation delay (Timeouts if generation exceeds 15 seconds).
5. Attempting to issue a manual refund exceeding the captured authorized Total.

### 11.6 Reports Module
1. Setting Custom Range Start Date significantly far ahead of End Date.
2. Checking 'YTM' filter behavior specifically on January 1st to ensure it defaults cleanly to current day subset.
3. Behavior of Line charts when gaps of "0" exist (must drop to baseline, not bridge missing days).
4. Extracting the "All" period filter for an agency with 10 years of data (Stress Test).
5. Rapidly toggling between filters before the API resolves (ensuring latest fetch applies, no race conditions).

### 11.7 Settings
1. Verifying API keys with whitespace padding.
2. Profile image form submission with an arbitrarily enormous filesize (e.g., 50MB).
3. Agent attempting to navigate away with unsaved modifications to the active config form.
4. Modifying Razorpay webhooks while active payments are in checkout flow.
5. Confirming disabled opt-out notifications correctly blocks the SMTP send pipeline.

---

## 12. TEST COVERAGE HINTS

### 12.1 Smoke Tests
- Validate Agent Login flow authenticates and lands successfully on Dashboard.
- Draft can be saved in Manage Packages and fetched back.
- Reports load within acceptable TTI (Time to Interactive).

### 12.2 Functional Tests
- E2E Validation of the **Critical User Journey (CUJ)**: Agent creates package ➔ Publishes ➔ Customer completes Razorpay transaction ➔ Booking confirms ➔ Agent sees booking in dashboard.
- Verification of dynamic chart re-rendering upon period filter toggles.

### 12.3 Negative Tests
- Attempting API mutations via direct REST calls using invalidated or spoofed JWT tokens.
- Intentional Razorpay signature corruption to verify webhook rejection parameters.
- Validating file constraints by forcefully passing binary structures to image upload ports.

### 12.4 UI / Visual Regression Tests
- Check if Glassmorphism aesthetics break or conflict on legacy browser engines.
- Verify mobile hamburgers trigger correctly at `768px` breakpoints.
- Ensure Skeleton loaders match identical pixel dimensions to final rendered DOM objects.

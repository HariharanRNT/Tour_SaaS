# 🐛 Destructive QA Bug List & Remediation Guide

This document lists the critical vulnerabilities and bugs identified during the "Antigravity" testing phase. Use this checklist to fix the issues one by one.

## 🔴 High Severity (Security & Data Integrity)

- [ ] **B-01: Cross-Site Scripting (XSS) in Text Fields**
    - **Description**: Backend accepts and persists unsanitized HTML/JS tags.
    - **Found in**: [AgentRegistration](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/schemas.py#63-89) (Agency Name, Company Legal Name, Address) and [BookingCreate](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/schemas.py#460-467) (Special Requests).
    - **Risk**: Malicious scripts can execute in Admin/Agent dashboards, potentially stealing session cookies.
    - **Fix**: Implement HTML stripping/sanitization in the backend (e.g., using `bleach` or similar) before saving to the DB.

- [ ] **B-02: Persistence of SQL Injection Strings**
    - **Description**: Malicious SQL fragments (e.g., `' OR '1'='1'`) are stored as literal strings without escaping or rejection.
    - **Found in**: All text input fields.
    - **Risk**: Risks SQLi in non-ORM queries, exports, or third-party integrations.
    - **Fix**: Reject strings containing common SQL keywords or implement stricter input pattern matching.

- [ ] **B-03: Lack of Booking Idempotency (Spam/Double-Click)**
    - **Description**: Rapidly submitting identical booking requests creates multiple unique bookings.
    - **Found in**: `POST /api/v1/bookings`
    - **Risk**: Duplicate bookings, payment record fragmentation, and operational overhead.
    - **Fix**: Implement a server-side lock (Redis) or unique constraint check (user, package, travel_date) to prevent duplicates within ~60 seconds.

## 🟡 Medium Severity (Validation & Logic)

- [ ] **B-04: Length Overflow (Resource Exhaustion)**
    - **Description**: Extremely long strings (2000+ chars) are accepted in name and address fields.
    - **Risk**: Can break frontend UI layouts and cause database performance degradation.
    - **Fix**: Add `max_length` constraints to Pydantic models in [backend/app/schemas.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/schemas.py).

- [ ] **B-05: Missing Mobile Number Validation**
    - **Description**: Accepts alphabetic characters and extremely short numbers (e.g., "123", "abc").
    - **Fix**: Add a regex validator to the [phone](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/models/__init__.py#87-90) field in Pydantic schemas to ensure it matches common international formats.

- [ ] **B-06: Missing Domain/Website Format Validation**
    - **Description**: Accepts invalid URLs and strings with spaces (e.g., "not a domain", "http://domain.com").
    - **Fix**: Use Pydantic's `HttpUrl` or implement a custom domain regex validator in [backend/app/schemas.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/schemas.py).

- [ ] **B-07: Future Date of Birth Acceptance**
    - **Description**: Accepts traveler DOBs that are set in the future (e.g., tomorrow's date).
    - **Risk**: Logically impossible data and potential calculation errors.
    - **Fix**: Add a validator in [TravelerBase](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/schemas.py#443-451) schema to ensure `date_of_birth < date.today()`.

- [ ] **B-08: Empty/Whitespace-Only Inputs**
    - **Description**: Fields like [agency_name](file:///d:/Hariharan/G-Project/RNT_Tour/backend/app/models/__init__.py#100-103) accept just spaces ("   ") as valid data.
    - **Fix**: Apply `.strip()` to all string inputs or add `min_length=1` and ensure it's not just whitespace.

---

### 📝 Final Verification
After fixing each bug, run the corresponding test script to verify:
- [qa_test_registration_v3.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/qa_test_registration_v3.py) (for Registration bugs)
- [qa_test_booking_v2.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/qa_test_booking_v2.py) (for Booking bugs)
- [qa_test_spam.py](file:///d:/Hariharan/G-Project/RNT_Tour/backend/qa_test_spam.py) (for Idempotency bugs)

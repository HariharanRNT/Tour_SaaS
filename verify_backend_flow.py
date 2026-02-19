import requests
import json
import hmac
import hashlib
import time
import random
import string

BASE_URL = "http://localhost:8000/api/v1"
WEBHOOK_SECRET = "webhook_secret_123456"

def register_user():
    print("Registering new user...")
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    email = f"test_renewal_{rand_suffix}@example.com"
    password = "password123"
    
    payload = {
        "email": email,
        "password": password,
        "first_name": "Test",
        "last_name": "User",
        "phone": "+919999999999"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
        if resp.status_code != 201:
            print("Registration failed:", resp.text)
            return None
        
        print(f"Registered user: {email}")
        return resp.json()["access_token"]
    except Exception as e:
        print(f"Registration Exception: {e}")
        return None

def get_plans(token):
    print("Fetching plans...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/subscriptions/plans", headers=headers)
    if resp.status_code != 200:
        print("Get plans failed:", resp.text)
        return []
    return resp.json()

def purchase_subscription(token, plan_id):
    print(f"Initiating purchase for plan {plan_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/subscriptions/purchase?plan_id={plan_id}", headers=headers)
    if resp.status_code != 200:
        print("Purchase failed:", resp.text)
        return None
    return resp.json()

def verify_payment(token, purchase_data):
    print("Verifying payment...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Mock payment details
    rzp_sub_id = purchase_data['razorpay_subscription_id']
    payload = {
        "subscription_id": purchase_data['subscription_id'],
        "razorpay_order_id": purchase_data['order_id'], # likely None
        "razorpay_payment_id": f"pay_mock_{int(time.time())}",
        "razorpay_signature": f"sig_mock_{int(time.time())}",
        "razorpay_subscription_id": rzp_sub_id
    }
    
    resp = requests.post(f"{BASE_URL}/subscriptions/verify", json=payload, headers=headers)
    if resp.status_code != 200:
        print("Verification failed:", resp.text)
        return False
    print("Verification success:", resp.json())
    return True

def trigger_webhook(rzp_sub_id, amount=10000):
    print(f"Triggering webhook for {rzp_sub_id}...")
    
    payload = {
        "entity": "event",
        "account_id": "acc_test_123",
        "event": "subscription.charged",
        "contains": ["payment", "subscription"],
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_webhook_{int(time.time())}",
                    "amount": amount,
                    "currency": "INR",
                    "status": "captured",
                    "order_id": "order_webhook_123",
                    "invoice_id": "inv_webhook_123",
                    "international": False,
                    "method": "card",
                    "amount_refunded": 0,
                    "refund_status": None,
                    "captured": True,
                    "description": "Subscription Renewal",
                    "card_id": "card_test_123",
                    "bank": None,
                    "wallet": None,
                    "vpa": None,
                    "email": "void@razorpay.com",
                    "contact": "+919999999999"
                }
            },
            "subscription": {
                "entity": {
                    "id": rzp_sub_id,
                    "plan_id": "plan_test_123",
                    "customer_id": "cust_test_123",
                    "status": "active",
                    "current_start": int(time.time()),
                    "current_end": int(time.time()) + 30*24*3600,
                    "ended_at": None,
                    "quantity": 1,
                    "notes": [],
                    "charge_at": int(time.time()) + 30*24*3600,
                    "start_at": int(time.time()),
                    "end_at": int(time.time()) + 365*24*3600,
                    "auth_attempts": 0,
                    "total_count": 120,
                    "paid_count": 1,
                    "customer_notify": True,
                    "created_at": int(time.time()) - 3600,
                    "expire_by": None,
                    "short_url": None,
                    "has_scheduled_changes": False,
                    "change_scheduled_at": None,
                    "source": "api",
                    "payment_method": "card",
                    "offer_id": None,
                    "remaining_count": 119
                }
            }
        },
        "created_at": int(time.time())
    }
    
    body_str = json.dumps(payload)
    
    # Generate Signature
    signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        body_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature
    }
    
    resp = requests.post(f"{BASE_URL}/webhooks/razorpay", data=body_str, headers=headers)
    if resp.status_code != 200:
        print("Webhook failed:", resp.text)
        return False
    print("Webhook success:", resp.json())
    return True

def main():
    token = register_user()
    if not token:
        print("Registration failed. Exiting.")
        return
        
    plans = get_plans(token)
    if not plans:
        print("No plans found.")
        return
        
    # Pick a plan (e.g., Pro or Gold, price > 0)
    target_plan = next((p for p in plans if p['price'] > 0), None)
    if not target_plan:
        print("No paid plans found.")
        return
        
    print(f"Selected plan: {target_plan['name']} (ID: {target_plan['id']})")
    
    # Purchase
    purchase_data = purchase_subscription(token, target_plan['id'])
    if not purchase_data:
        return
        
    print("Purchase Data:", purchase_data)
    
    # Verify Payment (Initial)
    if not verify_payment(token, purchase_data):
        return
        
    # Trigger Renewal Webhook
    rzp_sub_id = purchase_data['razorpay_subscription_id']
    if not rzp_sub_id:
        print("No Razorpay Subscription ID returned.")
        return
        
    print("Waiting 2s before webhook...")
    time.sleep(2)
    
    if trigger_webhook(rzp_sub_id, amount=int(target_plan['price']*100)):
        print("TEST PASSED: Full subscription flow + Auto-renewal webhook verified.")
    else:
        print("TEST FAILED: Webhook processing failed.")

if __name__ == "__main__":
    main()

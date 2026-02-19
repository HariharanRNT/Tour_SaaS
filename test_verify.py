"""
Quick script to test the verify endpoint with mock data
"""
import requests
import json

# Replace with a real subscription_id from your database if needed
# For now, using a test UUID
payload = {
    "subscription_id": "00000000-0000-0000-0000-000000000001",  # Replace with real UUID
    "razorpay_order_id": "order_mock_test123",
    "razorpay_payment_id": "pay_mock_test123",
    "razorpay_signature": "sig_mock_test123",
    "razorpay_subscription_id": "sub_mock_test123"
}

headers = {
    "Authorization": "Bearer test_token_here",  # Replace with real token if needed
    "Content-Type": "application/json"
}

try:
    response = requests.post(
        "http://localhost:8000/api/v1/subscriptions/verify",
       json=payload,
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
except Exception as e:
    print(f"Error: {e}")

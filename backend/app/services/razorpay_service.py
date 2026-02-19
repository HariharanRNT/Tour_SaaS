import razorpay
from app.config import settings
from fastapi import HTTPException
import time

class RazorpayService:
    def __init__(self):
        self.client = razorpay.Client(auth=(settings.RAZORPAY_SUBSCRIPTION_KEY_ID, settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET))

    def create_plan(self, plan_data: dict) -> str:
        """
        Create a plan on Razorpay and return the plan_id.
        plan_data: {
            "period": "daily" | "weekly" | "monthly" | "yearly",
            "interval": int,
            "period": "monthly",
            "item": {
                "name": "Plan Name",
                "amount": 10000, # in paise
                "currency": "INR",
                "description": "Description"
            }
        }
        """
        try:
            # Check for mock
            if "mock" in settings.RAZORPAY_SUBSCRIPTION_KEY_ID:
                return f"plan_mock_{int(time.time())}"

            plan = self.client.plan.create(plan_data)
            return plan['id']
        except Exception as e:
            print(f"Razorpay Plan Creation Failed: {e}")
            # If in dev/test, return a mock ID if real creation fails (optional)
            # raise HTTPException(status_code=500, detail=f"Razorpay Error: {str(e)}")
            # For now, let's allow fail to surface
            raise e

    def create_subscription(self, plan_id: str, total_count: int = 120, customer_notify: int = 1, notes: dict = None) -> str:
        """
        Create a subscription for a user.
        total_count: Number of billing cycles (e.g. 120 months = 10 years).
        """
        try:
             # Check for mock
            if "mock" in settings.RAZORPAY_SUBSCRIPTION_KEY_ID or "plan_mock" in plan_id:
                return f"sub_mock_{int(time.time())}"

            data = {
                "plan_id": plan_id,
                "total_count": total_count,
                "customer_notify": customer_notify,
                "notes": notes or {}
            }
            subscription = self.client.subscription.create(data)
            return subscription['id']
        except Exception as e:
            print(f"Razorpay Subscription Creation Failed: {e}")
            raise e

    def cancel_subscription(self, subscription_id: str):
        try:
            if "sub_mock" in subscription_id:
                return 

            self.client.subscription.cancel(subscription_id)
        except Exception as e:
            print(f"Razorpay Subscription Cancellation Failed: {e}")
            # Don't raise, just log

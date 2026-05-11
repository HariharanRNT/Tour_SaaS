import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, and_
from app.models import Subscription
from app.database import AsyncSessionLocal
from app.config import settings
import razorpay
import logging

logger = logging.getLogger(__name__)

def fetch_rzp_subscription_data(client, sub_id):
    """
    Synchronous wrapper for Razorpay API calls.
    Returns the subscription object and its associated invoices.
    """
    rzp_sub = client.subscription.fetch(sub_id)
    # Fetch all invoices associated with this subscription
    invoices = client.invoice.all({"subscription_id": sub_id})
    return rzp_sub, invoices

async def sync_stuck_subscriptions():
    """
    Find subscriptions stuck in 'payment_initiated' for > 30 mins.
    Differentiates between 'abandoned' and 'failed' based on invoice attempts.
    """
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(minutes=30)
    
    logger.info("[Job] Starting refined stuck subscription sync...")
    
    try:
        async with AsyncSessionLocal() as db:
            # 1. Find stuck subscriptions
            stmt = select(Subscription).where(
                and_(
                    Subscription.status == 'payment_initiated',
                    Subscription.created_at <= threshold
                )
            )
            result = await db.execute(stmt)
            stuck_subs = result.scalars().all()
            
            if not stuck_subs:
                logger.info("[Job] No stuck subscriptions found.")
                return

            logger.info(f"[Job] Found {len(stuck_subs)} candidates. Polling Razorpay API...")
            
            client = razorpay.Client(auth=(settings.RAZORPAY_SUBSCRIPTION_KEY_ID, settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET))
            loop = asyncio.get_event_loop()
            
            updated_count = 0
            for sub in stuck_subs:
                try:
                    # Run sync Razorpay calls in a thread pool executor to avoid blocking the event loop
                    rzp_sub, invoices = await loop.run_in_executor(
                        None, fetch_rzp_subscription_data, client, sub.razorpay_subscription_id
                    )
                    
                    rzp_status = rzp_sub.get('status')
                    old_status = sub.status
                    new_status = old_status
                    reason = ""

                    if rzp_status == 'created':
                        # Differentiate Abandoned vs Failed
                        invoice_list = invoices.get('items', [])
                        # If status is created but there is ANY invoice with a failed status, it's a failed attempt
                        has_failed_invoices = any(inv.get('status') == 'failed' for inv in invoice_list)
                        
                        if has_failed_invoices:
                            new_status = 'failed'
                            reason = "Found failed invoice attempts in Razorpay"
                        else:
                            new_status = 'abandoned'
                            reason = "No invoice attempts found (User likely closed tab/abandoned)"
                            
                    elif rzp_status == 'active':
                        new_status = 'active'
                        reason = "Missed webhook recovery (Subscription is Active)"
                    elif rzp_status in ['halted', 'cancelled', 'expired']:
                        new_status = 'failed'
                        reason = f"Razorpay status reported as {rzp_status}"
                    
                    if new_status != old_status:
                        sub.status = new_status
                        updated_count += 1
                        logger.info(f"[Job] Updated Sub {sub.id} (RZP: {sub.razorpay_subscription_id}): {old_status} -> {new_status} | Reason: {reason}")
                
                except Exception as e:
                    logger.error(f"[Job] Error processing sub {sub.id}: {e}")
            
            # Single commit after processing all subscriptions
            if updated_count > 0:
                await db.commit()
                logger.info(f"[Job] Successfully synchronized {updated_count} subscriptions.")
            else:
                logger.info("[Job] No status changes detected during synchronization.")
            
    except Exception as e:
        logger.error(f"[Job] Refined Sync Job Error: {e}", exc_info=True)

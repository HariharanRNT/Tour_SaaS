from datetime import date, timedelta
from uuid import UUID
from sqlalchemy import select, and_, desc, asc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Subscription, SubscriptionPlan, User
from app.services.invoice_service import InvoiceService
from app.services.email_service import EmailService

class SubscriptionService:
    @staticmethod
    async def get_active_subscription(user_id: UUID, db: AsyncSession) -> Subscription | None:
        """
        Get the currently active subscription for a user.
        Checks explicit 'active' status.
        Does NOT perform expiry checks (use check_subscription_status for that).
        """
        stmt = select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == 'active'
        ).options(selectinload(Subscription.plan))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_upcoming_subscriptions(user_id: UUID, db: AsyncSession) -> list[Subscription]:
        """
        Get all upcoming (queued) subscriptions, ordered by creation (FIFO).
        """
        stmt = select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == 'upcoming'
        ).order_by(asc(Subscription.created_at)).options(selectinload(Subscription.plan))
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def check_and_auto_activate(user_id: UUID, db: AsyncSession) -> Subscription | None:
        """
        Core Logic:
        1. Check current active sub.
        2. If expired or limit reached -> Mark 'completed'.
        3. If no active sub (or just completed) -> Find 'upcoming'.
        4. If upcoming found -> Activate it.
        5. Return the potentially NEW active sub.
        """
        current_sub = await SubscriptionService.get_active_subscription(user_id, db)
        
        if current_sub:
            # Check validity
            is_expired_date = current_sub.end_date < date.today()
            
            # Check limit (if not unlimited)
            is_limit_reached = False
            if current_sub.plan.booking_limit != -1:
                is_limit_reached = current_sub.current_bookings_usage >= current_sub.plan.booking_limit
            
            if is_expired_date or is_limit_reached:
                print(f"[SubscriptionService] Expiring active sub {current_sub.id}. Reason: Date={is_expired_date}, Limit={is_limit_reached}")
                current_sub.status = 'completed'
                await db.commit() # Commit closure of old plan
                current_sub = None # No longer active
            else:
                return current_sub # Still valid

        # If we are here, we have NO active subscription (or we just finished one)
        # Try to activate queued plan
        upcoming = await SubscriptionService.get_upcoming_subscriptions(user_id, db)
        if upcoming:
            next_sub = upcoming[0] # FIFO
            await SubscriptionService.activate_subscription(next_sub, db)
            return next_sub
            
        return None

    @staticmethod
    async def activate_subscription(subscription: Subscription, db: AsyncSession):
        """
        Activates a specific subscription immediately.
        Sets start_date = Today, end_date = Today + Duration.
        """
        print(f"[SubscriptionService] Activating subscription {subscription.id}")
        
        # Calculate new dates
        today = date.today()
        # Assume monthly if not specified or check plan
        # We need the plan loaded
        if not subscription.plan:
            # Reload if plan is missing
            await db.refresh(subscription, attribute_names=['plan'])
            
        # Calculate duration
        billing_cycle = subscription.plan.billing_cycle
        if billing_cycle == 'yearly':
            duration_days = 365
        elif billing_cycle == 'quarterly':
            duration_days = 90
        elif billing_cycle == 'monthly':
            duration_days = 30
        elif billing_cycle == 'custom':
            duration_days = subscription.plan.duration_days or 30 # Fallback
        else:
            duration_days = 30 # Default
        
        subscription.status = 'active'
        subscription.start_date = today
        subscription.end_date = today + timedelta(days=duration_days)
        subscription.current_bookings_usage = 0
        
        await db.commit()
        await db.refresh(subscription)

    @staticmethod
    async def handle_purchase_activation(user_id: UUID, new_sub: Subscription, db: AsyncSession):
        """
        Decide whether to activate immediately or queue as 'upcoming'.
        Then generate and send invoice.
        """
        # Run the auto-check logic first to clean up any expired stuff
        active_sub = await SubscriptionService.check_and_auto_activate(user_id, db)
        
        if active_sub:
             # User HAS a valid active plan. Queue this new one.
             print(f"[SubscriptionService] Queueing new sub {new_sub.id} as 'upcoming'")
             new_sub.status = 'upcoming'
             # Set tentative dates (optional, can be updated on activation)
             new_sub.start_date = active_sub.end_date + timedelta(days=1)
             
             # Calculate duration for upcoming
             cycle = new_sub.plan.billing_cycle
             if cycle == 'yearly':
                 duration = 365
             elif cycle == 'quarterly':
                 duration = 90
             elif cycle == 'monthly':
                 duration = 30
             elif cycle == 'custom':
                 duration = new_sub.plan.duration_days or 30
             else:
                 duration = 30
                 
             new_sub.end_date = new_sub.start_date + timedelta(days=duration)
        else:
             # No active plan. Activate immediately.
             print(f"[SubscriptionService] Activating new sub {new_sub.id} immediately")
             await SubscriptionService.activate_subscription(new_sub, db)
             
        await db.commit()
        await db.refresh(new_sub)
        
        # --- Invoice Generation & Email ---
        try:
            # Fetch User for email with eager loading of profiles to avoid MissingGreenlet error
            user_stmt = select(User).where(User.id == user_id).options(
                selectinload(User.agent_profile),
                selectinload(User.admin_profile),
                selectinload(User.customer_profile)
            )
            user = (await db.execute(user_stmt)).scalar_one_or_none()
            
            if user:
                pdf_bytes = InvoiceService.generate_invoice_pdf(new_sub, user, str(new_sub.id))
                if pdf_bytes:
                    summary_html = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
                            .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #0056b3; }}
                            .header h1 {{ margin: 0; color: #0056b3; font-size: 24px; }}
                            .content {{ padding: 30px 20px; }}
                            .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                            .details-table th {{ text-align: left; padding: 12px; background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0; color: #475569; }}
                            .details-table td {{ padding: 12px; border-bottom: 1px solid #e2e8f0; }}
                            .amount {{ font-weight: bold; color: #0056b3; }}
                            .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e0e0e0; }}
                            .button {{ display: inline-block; padding: 12px 24px; background-color: #0056b3; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Subscription Confirmed</h1>
                            </div>
                            <div class="content">
                                <p>Dear {user.first_name} {user.last_name},</p>
                                <p>Thank you for subscribing to the <strong>{new_sub.plan.name}</strong> on TourSaaS. Your payment has been successfully processed.</p>
                                
                                <table class="details-table">
                                    <tr>
                                        <th>Plan Name</th>
                                        <td>{new_sub.plan.name}</td>
                                    </tr>
                                    <tr>
                                        <th>Billing Cycle</th>
                                        <td style="text-transform: capitalize;">{new_sub.plan.billing_cycle}</td>
                                    </tr>
                                    <tr>
                                        <th>Start Date</th>
                                        <td>{new_sub.start_date.strftime('%d %b %Y')}</td>
                                    </tr>
                                    <tr>
                                        <th>End Date</th>
                                        <td>{new_sub.end_date.strftime('%d %b %Y')}</td>
                                    </tr>
                                    <tr>
                                        <th>Amount Paid</th>
                                        <td class="amount">INR {new_sub.plan.price}</td>
                                    </tr>
                                </table>

                                <p>Please find attached the official tax invoice for your records.</p>
                                
                                <div style="text-align: center;">
                                    <a href="http://localhost:3000/admin/dashboard" class="button" style="color: white !important;">Go to Dashboard</a>
                                </div>
                            </div>
                            <div class="footer">
                                <p>&copy; {date.today().year} TourSaaS. All rights reserved.</p>
                                <p>Resh and Thosh pvt Ltd, Chennai - 600043, India</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """

                    await EmailService.send_email(
                        to_email=user.email,
                        subject=f"TourSaaS – Subscription Invoice & Payment Confirmation",
                        body=summary_html,
                        attachment_bytes=pdf_bytes,
                        attachment_filename=f"Invoice_{new_sub.id}.pdf"
                    )
        except Exception as e:
            import traceback
            print(f"Error generating/sending invoice: {e}")
            print(traceback.format_exc())
            # Don't fail the transaction just because email failed logic

    @staticmethod
    async def manual_activate_upcoming(user_id: UUID, subscription_id: UUID, db: AsyncSession):
        """
        User manually clicks 'Activate Now' on an upcoming OR 'on_hold' plan.
        1. Find the target plan (must be upcoming or on_hold).
        2. Put current active plan (if any) 'on_hold'.
        3. Activate target plan.
        """
        stmt = select(Subscription).where(
            Subscription.id == subscription_id, 
            Subscription.user_id == user_id,
            Subscription.status.in_(['upcoming', 'on_hold'])
        ).options(selectinload(Subscription.plan))
        
        target_sub = (await db.execute(stmt)).scalar_one_or_none()
        if not target_sub:
            raise ValueError("Subscription not found or not in upcoming/on_hold state")
            
        # Handle current active
        current_active = await SubscriptionService.get_active_subscription(user_id, db)
        if current_active:
            print(f"[SubscriptionService] Moving active sub {current_active.id} to 'on_hold'")
            current_active.status = 'on_hold'
            
        print(f"[SubscriptionService] Activating target sub {target_sub.id} (was {target_sub.status})")
        
        if target_sub.status == 'on_hold' and target_sub.end_date > date.today():
             # Just resume
             target_sub.status = 'active'
             await db.commit()
             await db.refresh(target_sub)
        else:
             # Full activation (reset dates for New/Expired items)
             await SubscriptionService.activate_subscription(target_sub, db)
             
        return target_sub

import asyncio
import sys
import os
import json
from sqlalchemy import text
from decimal import Decimal
from uuid import UUID
from datetime import date, datetime

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import SubscriptionPlan, Subscription

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError ("Type %s not serializable" % type(obj))

async def check_subscriptions():
    report = []
    async with AsyncSessionLocal() as db:
        report.append("--- Database Check ---")
        
        tables = ['subscription_plans', 'subscriptions', 'invoices', 'payments']
        for table in tables:
            try:
                result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                report.append(f"Table {table}: {count} rows")
            except Exception as e:
                report.append(f"Error checking table {table}: {e}")

        report.append("\n--- SubscriptionPlan Detail ---")
        try:
            result = await db.execute(text("SELECT * FROM subscription_plans"))
            columns = result.keys()
            rows = result.fetchall()
            report.append(f"Columns: {columns}")
            for row in rows:
                row_dict = dict(zip(columns, row))
                report.append(f"Plan ID: {row_dict['id']}, Name: {row_dict['name']}")
                # Check for nulls in required fields
                required = ['name', 'price', 'billing_cycle', 'booking_limit']
                for req in required:
                    if row_dict.get(req) is None:
                        report.append(f"  CRITICAL: Missing required field '{req}'!")
        except Exception as e:
            report.append(f"Error checking SubscriptionPlans: {e}")

        report.append("\n--- Subscription Detail ---")
        try:
            result = await db.execute(text("SELECT * FROM subscriptions"))
            columns = result.keys()
            rows = result.fetchall()
            report.append(f"Columns: {columns}")
            for row in rows:
                row_dict = dict(zip(columns, row))
                report.append(f"Sub ID: {row_dict['id']}, Plan ID: {row_dict['plan_id']}")
                # Check for plan existence
                plan_check = await db.execute(text(f"SELECT id FROM subscription_plans WHERE id = '{row_dict['plan_id']}'"))
                if not plan_check.scalar():
                    report.append(f"  CRITICAL: plan_id '{row_dict['plan_id']}' DOES NOT EXIST in subscription_plans!")
                
                # Check for nulls in fields required by SubscriptionResponse
                required_resp = ['user_id', 'plan_id', 'status', 'start_date', 'end_date', 'current_bookings_usage', 'created_at', 'auto_renew']
                for req in required_resp:
                    if row_dict.get(req) is None:
                        report.append(f"  CRITICAL: Missing required field '{req}' in subscription!")
        except Exception as e:
            report.append(f"Error checking Subscriptions: {e}")

        report.append("\n--- Agent Detail ---")
        try:
            result = await db.execute(text("SELECT * FROM agents LIMIT 1"))
            columns = result.keys()
            report.append(f"Columns: {columns}")
            # Check for agency_name
            if 'agency_name' not in columns:
                report.append("  CRITICAL: table 'agents' is MISSING 'agency_name' column!")
            
            # Check for newly added GST columns if they exist
            target_cols = ['gst_inclusive', 'gst_percentage']
            for col in target_cols:
                if col not in columns:
                    report.append(f"  WARNING: table 'agents' is MISSING '{col}' column!")
        except Exception as e:
            report.append(f"Error checking Agents: {e}")

    with open("db_check_report.txt", "w") as f:
        f.write("\n".join(report))
    print("Report written to db_check_report.txt")

if __name__ == "__main__":
    asyncio.run(check_subscriptions())

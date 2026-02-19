
import psycopg2
import os
from dotenv import load_dotenv

backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(backend_dir, ".env"))
DB_URL = "postgresql://postgres:1243@localhost:5432/tour_saas"

def check_domain_gst():
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        domain = "rnt.local"
        print(f"Checking GST for domain: {domain}")
        
        cursor.execute("SELECT id, company_name, gst_percentage FROM agents WHERE domain = 'rnt.local'")
        row = cursor.fetchone()
        
        if row:
            print(f"Agent Found: {row[1]} (ID: {row[0]})")
            print(f"GST Percentage in DB: {row[2]}%")
        else:
            print(f"No agent found for domain {domain}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_domain_gst()

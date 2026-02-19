
import psycopg2
import sys

import os
from dotenv import load_dotenv

# Load .env from backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(backend_dir, ".env"))

# Configuration
SESSION_ID = "ab10546b-3905-4aef-926d-0530e2faaad8" 
DOMAIN = "rnt.local"
DB_URL = "postgresql://postgres:1243@localhost:5432/tour_saas"

def investigate():
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        print(f"\n--- Investigating Session: {SESSION_ID} ---")
        
        # 1. Get Session Details & Linked Package
        query_session = "SELECT t.id, t.matched_package_id, t.destination, a.gst_percentage, a.company_name, a.id FROM trip_planning_sessions t LEFT JOIN packages p ON t.matched_package_id = p.id LEFT JOIN agents a ON p.created_by = a.id WHERE t.id = %s"
        
        cursor.execute(query_session, (SESSION_ID,))
        sess_row = cursor.fetchone()
        
        if not sess_row:
            print("❌ Session not found!")
            return

        print(f"Session Destination: {sess_row[2]}")
        print(f"Matched Package ID: {sess_row[1]}")
        
        pkg_agent_name = sess_row[4]
        pkg_agent_id = sess_row[5]
        pkg_agent_gst = sess_row[3]

        print(f"Package Creator Agent: {pkg_agent_name} (ID: {pkg_agent_id})")
        print(f"Package Creator GST: {pkg_agent_gst}%")
        
        # 2. Get Domain Agent Details
        print(f"\n--- Investigating Domain: {DOMAIN} ---")
        query_domain = "SELECT CAST(id AS TEXT), company_name, gst_percentage, gst_inclusive FROM agents WHERE domain = %s"
        cursor.execute(query_domain, (DOMAIN,))
        dom_row = cursor.fetchone()
        
        if not dom_row:
            print(f"❌ No agent found for domain {DOMAIN}")
            return
            
        dom_agent_id = dom_row[0]
        dom_agent_name = dom_row[1]
        dom_agent_gst = dom_row[2]
        
        print(f"Domain Agent: {dom_agent_name} (ID: {dom_agent_id})")
        print(f"Domain Agent GST: {dom_agent_gst}%")
        print(f"Domain Agent GST Inclusive: {dom_row[3]}")
        
        # 3. Conclusion
        print("\n--- Conclusion ---")
        if pkg_agent_id and dom_agent_id and pkg_agent_id != dom_agent_id:
             print("⚠️ MISMATCH DETECTED: The session is using a package created by a DIFFERENT agent.")
             print(f"   - Displayed GST ({pkg_agent_gst}%) comes from Package Creator ({pkg_agent_name}).")
             print(f"   - Expected GST ({dom_agent_gst}%) belongs to Domain Agent ({dom_agent_name}).")
             print("   -> The API Logic prioritizes Package Creator over Domain Agent.")
        elif pkg_agent_id == dom_agent_id:
             print("✅ Agents Match. If displayed value is wrong, check database persistence.")
             if str(pkg_agent_gst) != "17.0":
                 print(f"   -> Database has {pkg_agent_gst}%, but User expects 17%.")
        else:
             print("❓ Could not determine relationship.")
             
        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    investigate()


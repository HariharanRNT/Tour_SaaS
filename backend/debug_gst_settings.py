import sqlite3
import os

def check_gst_settings():
    db_path = 'tour_saas.db'
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print(f"--- Tables in {db_path} ---")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        for table in tables:
            print(table[0])
            
        print("\n--- Agent GST Settings ---")
        try:
            # Query agents joined with users to get email
            # Maybe table is 'agent' singular?
            query = """
            SELECT u.email, a.id, a.gst_inclusive, a.gst_percentage
            FROM agents a
            JOIN users u ON a.user_id = u.id
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            if not rows:
                print("No agents found.")
            
            for row in rows:
                email, agent_id, inclusive, percentage = row
                status = "Inclusive" if inclusive else "Exclusive"
                print(f"Agent: {email} | ID: {agent_id} | GST: {status} ({percentage}%) | Raw Inclusive: {inclusive}")
        except Exception as e:
            print(f"Query failed: {e}")
            
        conn.close()
        
    except Exception as e:
        print(f"Error querying database: {e}")

if __name__ == "__main__":
    check_gst_settings()

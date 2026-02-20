import sqlite3
import os
from sqlalchemy import create_engine, text

# Try to check if it's PostgreSQL or SQLite
DATABASE_URL = "postgresql://postgres:1243@localhost:5432/tour_saas"

def check_columns():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM agent_themes LIMIT 0"))
            columns = result.keys()
            
            trust_cols = [
                "itin_trust_title",
                "itin_trust_title_color",
                "itin_show_trust_section",
                "itin_trust_section_bg",
                "itin_trust_card_style",
                "itin_trust_cards"
            ]
            
            print("Columns found in agent_themes:")
            for col in trust_cols:
                if col in columns:
                    print(f"✅ {col}")
                else:
                    print(f"❌ {col}")
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    check_columns()

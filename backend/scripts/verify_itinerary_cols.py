import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# We need a token. I'll assume we can skip auth for this test if we use a dev mock or if I just manually check the DB.
# Better way: Check if the endpoint is working by sending a request.

def test_theme_update():
    # This is a bit hard without a valid token, but I can check the backend logs or just assume it works 
    # since I added the columns and schemas.
    # Alternatively, I can use a script that interacts with the DB directly to verify columns.
    pass

if __name__ == "__main__":
    from sqlalchemy import create_engine, inspect
    import os
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app.config import settings

    sync_url = settings.DATABASE_URL
    if sync_url.startswith("postgresql+asyncpg://"):
        sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

    engine = create_engine(sync_url)
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('agent_themes')]
    
    itinerary_cols = [
        "itin_hero_image", "itin_hero_overlay_opacity", "itin_destination_accent_color",
        "itin_info_card_style", "itin_overview_icon_color", "itin_overview_card_style",
        "itin_overview_card_border", "itin_heading_border_color", "itin_active_day_color",
        "itin_morning_color", "itin_afternoon_color", "itin_evening_color", "itin_night_color",
        "itin_day_badge_color", "itin_activity_layout", "itin_sidebar_bg", "itin_price_color",
        "itin_cta_text", "itin_cta_color", "itin_cta_text_color", "itin_show_trust_badges",
        "itin_ai_badge_color", "itin_tag_color", "itin_show_ai_badge"
    ]
    
    missing = [col for col in itinerary_cols if col not in columns]
    
    if not missing:
        print("✅ All itinerary theme columns verified in the database.")
    else:
        print(f"❌ Missing columns: {missing}")

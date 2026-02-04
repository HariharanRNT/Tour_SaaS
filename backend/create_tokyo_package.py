"""Create a Tokyo 3-day package with sample activities"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.database import get_db, engine
from app.models import Package, ItineraryItem, PackageStatus
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

async def create_tokyo_package():
    """Create a sample Tokyo 3-day package"""
    
    async with AsyncSession(engine) as db:
        try:
            # Create package
            package_id = uuid.uuid4()
            
            package_query = text("""
                INSERT INTO packages (
                    id, title, slug, description, destination, duration_days, duration_nights,
                    category, price_per_person, max_group_size, status, is_popular_destination
                ) VALUES (
                    :id, :title, :slug, :description, :destination, :days, :nights,
                    :category, :price, :max_size, :status, :is_popular
                )
            """)
            
            await db.execute(package_query, {
                "id": package_id,
                "title": "Tokyo Cultural Experience - 3 Days",
                "slug": "tokyo-cultural-3days",
                "description": "Immerse yourself in Tokyo's rich culture and modern marvels. Experience ancient temples, bustling markets, and cutting-edge technology.",
                "destination": "Tokyo",
                "days": 3,
                "nights": 2,
                "category": "Cultural",
                "price": 899.00,
                "max_size": 15,
                "status": "PUBLISHED",
                "is_popular": True
            })
            
            print(f"Created package: {package_id}")
            
            # Day 1 Activities
            activities_day1 = [
                {
                    "day": 1,
                    "time_slot": "morning",
                    "title": "Visit Senso-ji Temple",
                    "description": "Explore Tokyo's oldest and most significant Buddhist temple in Asakusa. Walk through the iconic Thunder Gate and browse traditional shops along Nakamise Street.",
                    "display_order": 1
                },
                {
                    "day": 1,
                    "time_slot": "afternoon",
                    "title": "Explore Shibuya Crossing",
                    "description": "Experience the world's busiest pedestrian crossing and explore the vibrant Shibuya district. Visit the famous Hachiko statue and enjoy shopping in trendy boutiques.",
                    "display_order": 1
                },
                {
                    "day": 1,
                    "time_slot": "evening",
                    "title": "Tokyo Tower Night View",
                    "description": "Ascend Tokyo Tower for breathtaking panoramic views of the illuminated city skyline. Perfect photo opportunity and romantic atmosphere.",
                    "display_order": 1
                },
                {
                    "day": 1,
                    "time_slot": "night",
                    "title": "Dinner in Shinjuku",
                    "description": "Enjoy authentic Japanese cuisine in the bustling Shinjuku district. Choose from countless izakayas, ramen shops, and fine dining restaurants.",
                    "display_order": 1
                }
            ]
            
            # Day 2 Activities
            activities_day2 = [
                {
                    "day": 2,
                    "time_slot": "morning",
                    "title": "Tsukiji Outer Market",
                    "description": "Start your day at the famous Tsukiji Outer Market. Sample fresh sushi, street food, and experience the vibrant atmosphere of Tokyo's food culture.",
                    "display_order": 1
                },
                {
                    "day": 2,
                    "time_slot": "afternoon",
                    "title": "Meiji Shrine & Harajuku",
                    "description": "Visit the serene Meiji Shrine nestled in a forested area, then explore the colorful and trendy Harajuku district with its unique fashion and cafes.",
                    "display_order": 1
                },
                {
                    "day": 2,
                    "time_slot": "evening",
                    "title": "Akihabara Electric Town",
                    "description": "Dive into Tokyo's anime, manga, and electronics paradise. Explore multi-story arcades, anime shops, and cutting-edge technology stores.",
                    "display_order": 1
                },
                {
                    "day": 2,
                    "time_slot": "night",
                    "title": "Karaoke Experience",
                    "description": "Enjoy a quintessential Japanese experience at a karaoke box. Sing your heart out in a private room with friends and enjoy Japanese snacks.",
                    "display_order": 1
                }
            ]
            
            # Day 3 Activities
            activities_day3 = [
                {
                    "day": 3,
                    "time_slot": "morning",
                    "title": "Imperial Palace Gardens",
                    "description": "Stroll through the beautiful East Gardens of the Imperial Palace. Enjoy peaceful landscapes, historic ruins, and traditional Japanese garden design.",
                    "display_order": 1
                },
                {
                    "day": 3,
                    "time_slot": "afternoon",
                    "title": "Ginza Shopping District",
                    "description": "Explore Tokyo's upscale Ginza district. Browse luxury boutiques, department stores, and art galleries in this sophisticated shopping area.",
                    "display_order": 1
                },
                {
                    "day": 3,
                    "time_slot": "evening",
                    "title": "Odaiba Waterfront",
                    "description": "Visit the futuristic Odaiba island. See the life-size Gundam statue, enjoy shopping malls, and relax at the waterfront with views of Rainbow Bridge.",
                    "display_order": 1
                }
            ]
            
            # Insert all activities
            all_activities = activities_day1 + activities_day2 + activities_day3
            
            itinerary_query = text("""
                INSERT INTO itinerary_items (
                    id, package_id, day_number, title, description, time_slot, display_order
                ) VALUES (
                    :id, :package_id, :day, :title, :description, :time_slot, :display_order
                )
            """)
            
            for activity in all_activities:
                await db.execute(itinerary_query, {
                    "id": uuid.uuid4(),
                    "package_id": package_id,
                    "day": activity["day"],
                    "title": activity["title"],
                    "description": activity["description"],
                    "time_slot": activity["time_slot"],
                    "display_order": activity["display_order"]
                })
            
            await db.commit()
            print(f"Created {len(all_activities)} activities")
            print(f"\nPackage ID: {package_id}")
            print(f"Destination: Tokyo")
            print(f"Duration: 3 Days / 2 Nights")
            print(f"\nPackage created successfully!")
            
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(create_tokyo_package())

"""Seed sample data into PostgreSQL database"""
import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import (
    User, Agent, Customer, Package, PackageImage, ItineraryItem, PackageAvailability,
    Booking, Traveler, Payment,
    UserRole, PackageStatus, BookingStatus, PaymentStatus
)
from app.core.security import get_password_hash
import json


async def seed_data():
    """Seed sample data into database"""
    async with AsyncSessionLocal() as session:
        print("Starting to seed sample data...")
        
        # Check if data already exists
        from sqlalchemy import select, func
        result = await session.execute(select(func.count(User.id)))
        user_count = result.scalar()
        
        if user_count > 1:  # More than just admin
            print("\n[INFO] Sample data already exists!")
            print(f"Found {user_count} users in database.")
            print("\nTo reseed data, run: python init_db.py (this will clear all data)")
            return
        
        # 1. Create 5 sample users (in addition to admin)
        print("\n1. Creating users...")
        users = []
        user_data = [
            {"email": "john.doe@example.com", "first_name": "John", "last_name": "Doe", "phone": "+1234567890", "role": UserRole.CUSTOMER},
            {"email": "jane.smith@example.com", "first_name": "Jane", "last_name": "Smith", "phone": "+1234567891", "role": UserRole.CUSTOMER},
            {"email": "agent1@toursaas.com", "first_name": "Agent", "last_name": "One", "phone": "+1234567892", "role": UserRole.AGENT},
            {"email": "mike.wilson@example.com", "first_name": "Mike", "last_name": "Wilson", "phone": "+1234567893", "role": UserRole.CUSTOMER},
            {"email": "sarah.jones@example.com", "first_name": "Sarah", "last_name": "Jones", "phone": "+1234567894", "role": UserRole.CUSTOMER},
        ]
        
        for data in user_data:
            user = User(
                email=data["email"],
                password_hash=get_password_hash("password123"),
                role=data["role"],
                email_verified=True,
                is_active=True
            )
            session.add(user)
            await session.flush() # Get user ID
            
            # Create profile
            if data["role"] == UserRole.AGENT:
                profile = Agent(
                    user_id=user.id,
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    phone=data["phone"],
                    agency_name=f"{data['first_name']}'s Travels",
                    domain="agent1.local" if data["email"] == "agent1@toursaas.com" else None
                )
                session.add(profile)
            elif data["role"] == UserRole.CUSTOMER:
                profile = Customer(
                    user_id=user.id,
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    phone=data["phone"]
                )
                session.add(profile)
                
            users.append(user)
        
        await session.flush()
        print(f"   Created {len(users)} users with profiles")
        
        # 2. Create 5 sample packages
        print("\n2. Creating packages...")
        packages = []
        package_data = [
            {
                "title": "Bali Paradise Adventure",
                "slug": "bali-paradise-adventure",
                "description": "Experience the magic of Bali with pristine beaches, ancient temples, and lush rice terraces. This 7-day journey takes you through the best of Bali's culture and natural beauty.",
                "destination": "Bali, Indonesia",
                "duration_days": 7,
                "duration_nights": 6,
                "category": "Beach & Culture",
                "price_per_person": Decimal("1299.00"),
                "max_group_size": 15,
                "included_items": json.dumps(["Accommodation", "Breakfast", "Airport transfers", "Guided tours", "Temple entrance fees"]),
                "excluded_items": json.dumps(["Flights", "Lunch & Dinner", "Personal expenses", "Travel insurance"])
            },
            {
                "title": "Swiss Alps Mountain Escape",
                "slug": "swiss-alps-mountain-escape",
                "description": "Discover the breathtaking beauty of the Swiss Alps with stunning mountain views, charming villages, and world-class skiing. Perfect for adventure enthusiasts!",
                "destination": "Swiss Alps, Switzerland",
                "duration_days": 5,
                "duration_nights": 4,
                "category": "Adventure",
                "price_per_person": Decimal("1899.00"),
                "max_group_size": 12,
                "included_items": json.dumps(["4-star hotel", "Breakfast", "Ski pass", "Mountain guide", "Cable car tickets"]),
                "excluded_items": json.dumps(["Flights", "Meals (except breakfast)", "Ski equipment rental", "Travel insurance"])
            },
            {
                "title": "Tokyo Cultural Experience",
                "slug": "tokyo-cultural-experience",
                "description": "Immerse yourself in Japanese culture with visits to ancient temples, modern Tokyo, traditional tea ceremonies, and authentic cuisine experiences.",
                "destination": "Tokyo, Japan",
                "duration_days": 6,
                "duration_nights": 5,
                "category": "Cultural",
                "price_per_person": Decimal("1599.00"),
                "max_group_size": 20,
                "included_items": json.dumps(["Hotel accommodation", "Daily breakfast", "City tours", "Tea ceremony", "Sumo wrestling show"]),
                "excluded_items": json.dumps(["International flights", "Lunch & Dinner", "Shopping", "Travel insurance"])
            },
            {
                "title": "Dubai Luxury Getaway",
                "slug": "dubai-luxury-getaway",
                "description": "Experience luxury in Dubai with 5-star hotels, desert safaris, Burj Khalifa visits, and world-class shopping. The ultimate luxury vacation!",
                "destination": "Dubai, UAE",
                "duration_days": 4,
                "duration_nights": 3,
                "category": "Luxury",
                "price_per_person": Decimal("2299.00"),
                "max_group_size": 10,
                "included_items": json.dumps(["5-star hotel", "All meals", "Desert safari", "Burj Khalifa tickets", "Dubai Mall tour", "Private transfers"]),
                "excluded_items": json.dumps(["Flights", "Personal shopping", "Spa services", "Travel insurance"])
            },
            {
                "title": "Maldives Beach Retreat",
                "slug": "maldives-beach-retreat",
                "description": "Relax in paradise with crystal-clear waters, white sandy beaches, and overwater bungalows. Perfect for honeymooners and beach lovers!",
                "destination": "Maldives",
                "duration_days": 5,
                "duration_nights": 4,
                "category": "Beach & Relaxation",
                "price_per_person": Decimal("2799.00"),
                "max_group_size": 8,
                "included_items": json.dumps(["Overwater villa", "All-inclusive meals", "Snorkeling equipment", "Spa session", "Sunset cruise"]),
                "excluded_items": json.dumps(["Flights", "Scuba diving", "Water sports", "Travel insurance"])
            }
        ]
        
        for data in package_data:
            package = Package(
                title=data["title"],
                slug=data["slug"],
                description=data["description"],
                destination=data["destination"],
                duration_days=data["duration_days"],
                duration_nights=data["duration_nights"],
                category=data["category"],
                price_per_person=data["price_per_person"],
                max_group_size=data["max_group_size"],
                included_items=data["included_items"],
                excluded_items=data["excluded_items"],
                status=PackageStatus.PUBLISHED,
                created_by=users[0].id  # Created by first customer user
            )
            session.add(package)
            packages.append(package)
        
        await session.flush()
        print(f"   Created {len(packages)} packages")
        
        # 3. Create package images (2 per package)
        print("\n3. Creating package images...")
        image_count = 0
        image_urls = [
            "https://images.unsplash.com/photo-1537996194471-e657df975ab4",  # Bali
            "https://images.unsplash.com/photo-1559827260-dc66d52bef19",  # Swiss Alps
            "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf",  # Tokyo
            "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",  # Dubai
            "https://images.unsplash.com/photo-1514282401047-d79a71a590e8",  # Maldives
        ]
        
        for idx, package in enumerate(packages):
            for i in range(2):
                image = PackageImage(
                    package_id=package.id,
                    image_url=f"{image_urls[idx]}?w=800&q=80&auto=format&fit=crop&ixlib=rb-4.0.3&ixid={i}",
                    display_order=i
                )
                session.add(image)
                image_count += 1
        
        await session.flush()
        print(f"   Created {image_count} package images")
        
        # 4. Create itinerary items (3 days for each package)
        print("\n4. Creating itinerary items...")
        itinerary_count = 0
        
        # Bali itinerary
        bali_itinerary = [
            {"day": 1, "title": "Arrival & Ubud Exploration", "description": "Arrive in Bali, transfer to Ubud. Visit Tegalalang Rice Terraces and Ubud Monkey Forest.", "activities": json.dumps(["Airport pickup", "Rice terrace visit", "Monkey forest tour"]), "meals": json.dumps(["Dinner"])},
            {"day": 2, "title": "Temple Tour & Cultural Show", "description": "Visit ancient temples including Tanah Lot and enjoy traditional Balinese dance performance.", "activities": json.dumps(["Temple visits", "Cultural show", "Local market"]), "meals": json.dumps(["Breakfast", "Lunch"])},
            {"day": 3, "title": "Beach Day & Water Sports", "description": "Relax at Seminyak Beach, try water sports, and enjoy sunset dinner.", "activities": json.dumps(["Beach activities", "Water sports", "Sunset dinner"]), "meals": json.dumps(["Breakfast", "Dinner"])},
        ]
        
        for item in bali_itinerary:
            itinerary = ItineraryItem(
                package_id=packages[0].id,
                day_number=item["day"],
                title=item["title"],
                description=item["description"],
                activities=item["activities"],
                meals_included=item["meals"]
            )
            session.add(itinerary)
            itinerary_count += 1
        
        # Add similar itineraries for other packages (simplified)
        for pkg_idx in range(1, 5):
            for day in range(1, 4):
                itinerary = ItineraryItem(
                    package_id=packages[pkg_idx].id,
                    day_number=day,
                    title=f"Day {day}: {packages[pkg_idx].title} Activities",
                    description=f"Exciting activities and experiences on day {day} of your {packages[pkg_idx].destination} adventure.",
                    activities=json.dumps([f"Activity {i+1}" for i in range(3)]),
                    meals_included=json.dumps(["Breakfast"])
                )
                session.add(itinerary)
                itinerary_count += 1
        
        await session.flush()
        print(f"   Created {itinerary_count} itinerary items")
        
        # 5. Create package availability
        print("\n5. Creating package availability...")
        availability_count = 0
        today = date.today()
        
        for package in packages:
            # Create 3 availability slots for each package
            for i in range(3):
                start_date = today + timedelta(days=30 + (i * 30))
                end_date = start_date + timedelta(days=60)
                
                availability = PackageAvailability(
                    package_id=package.id,
                    available_from=start_date,
                    available_to=end_date,
                    max_bookings=10,
                    current_bookings=i,  # Some slots have bookings
                    is_blackout=False
                )
                session.add(availability)
                availability_count += 1
        
        await session.flush()
        print(f"   Created {availability_count} availability slots")
        
        # 6. Create bookings
        print("\n6. Creating bookings...")
        bookings = []
        booking_data = [
            {"package_idx": 0, "user_idx": 0, "travelers": 2, "travel_date": today + timedelta(days=45), "status": BookingStatus.CONFIRMED, "payment_status": PaymentStatus.SUCCEEDED},
            {"package_idx": 1, "user_idx": 1, "travelers": 3, "travel_date": today + timedelta(days=60), "status": BookingStatus.CONFIRMED, "payment_status": PaymentStatus.SUCCEEDED},
            {"package_idx": 2, "user_idx": 3, "travelers": 1, "travel_date": today + timedelta(days=50), "status": BookingStatus.PENDING, "payment_status": PaymentStatus.PENDING},
            {"package_idx": 3, "user_idx": 4, "travelers": 2, "travel_date": today + timedelta(days=70), "status": BookingStatus.CONFIRMED, "payment_status": PaymentStatus.SUCCEEDED},
            {"package_idx": 4, "user_idx": 0, "travelers": 2, "travel_date": today + timedelta(days=90), "status": BookingStatus.PENDING, "payment_status": PaymentStatus.PENDING},
        ]
        
        for idx, data in enumerate(booking_data):
            package = packages[data["package_idx"]]
            user = users[data["user_idx"]]
            total_amount = package.price_per_person * data["travelers"]
            
            booking = Booking(
                booking_reference=f"BK{1000 + idx:06d}",
                package_id=package.id,
                user_id=user.id,
                booking_date=today,
                travel_date=data["travel_date"],
                number_of_travelers=data["travelers"],
                total_amount=total_amount,
                status=data["status"],
                payment_status=data["payment_status"],
                special_requests="Please arrange vegetarian meals" if idx % 2 == 0 else None
            )
            session.add(booking)
            bookings.append(booking)
        
        await session.flush()
        print(f"   Created {len(bookings)} bookings")
        
        # 7. Create travelers
        print("\n7. Creating travelers...")
        traveler_count = 0
        traveler_names = [
            ("John", "Doe"), ("Jane", "Smith"), ("Mike", "Wilson"),
            ("Sarah", "Jones"), ("Tom", "Brown"), ("Emily", "Davis")
        ]
        
        for booking in bookings:
            for i in range(booking.number_of_travelers):
                name = traveler_names[i % len(traveler_names)]
                traveler = Traveler(
                    booking_id=booking.id,
                    first_name=name[0],
                    last_name=name[1],
                    date_of_birth=date(1990 - i, 1 + i, 15),
                    gender="male" if i % 2 == 0 else "female",
                    passport_number=f"P{1000000 + traveler_count:07d}",
                    nationality="USA",
                    is_primary=(i == 0)
                )
                session.add(traveler)
                traveler_count += 1
        
        await session.flush()
        print(f"   Created {traveler_count} travelers")
        
        # 8. Create payments
        print("\n8. Creating payments...")
        payment_count = 0
        
        for idx, booking in enumerate(bookings):
            payment = Payment(
                booking_id=booking.id,
                razorpay_order_id=f"order_{1000 + idx:010d}",
                razorpay_payment_id=f"pay_{2000 + idx:010d}" if booking.payment_status == PaymentStatus.SUCCEEDED else None,
                razorpay_signature=f"sig_{3000 + idx:010d}" if booking.payment_status == PaymentStatus.SUCCEEDED else None,
                amount=booking.total_amount,
                currency="INR",
                status=booking.payment_status,
                payment_method="card" if booking.payment_status == PaymentStatus.SUCCEEDED else None
            )
            session.add(payment)
            payment_count += 1
        
        await session.flush()
        print(f"   Created {payment_count} payments")
        
        # Commit all changes
        await session.commit()
        
        print("\n" + "="*60)
        print("Sample data seeded successfully!")
        print("="*60)
        print(f"\nSummary:")
        print(f"  Users: {len(users)}")
        print(f"  Packages: {len(packages)}")
        print(f"  Package Images: {image_count}")
        print(f"  Itinerary Items: {itinerary_count}")
        print(f"  Availability Slots: {availability_count}")
        print(f"  Bookings: {len(bookings)}")
        print(f"  Travelers: {traveler_count}")
        print(f"  Payments: {payment_count}")
        print("\nYou can now test the API with this sample data!")
        print("Login credentials for sample users:")
        print("  Email: john.doe@example.com, Password: password123")
        print("  Email: jane.smith@example.com, Password: password123")


if __name__ == "__main__":
    asyncio.run(seed_data())

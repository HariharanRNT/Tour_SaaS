"""
Package Search Tools — Database tool handlers for the AI package search chat.

These are called by ChatService when Gemini triggers a function call
(search_packages, get_package_details, get_package_by_name, get_booking_details).
"""
import logging
import json
import re
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models import Package, PackageStatus


class PackageSearchTools:
    """
    Static executor for all Gemini function-calling tools used in package search chat.
    """

    @staticmethod
    async def execute(
        name: str,
        args: Dict,
        admin_id: Optional[str] = None,
        session_state: Dict = None,
    ) -> Any:
        """Dispatch the correct tool by name."""
        try:
            async with AsyncSessionLocal() as db:
                if name == "search_packages":
                    return await PackageSearchTools._search_packages(db, args, admin_id, session_state)
                elif name == "get_package_details":
                    return await PackageSearchTools._get_package_details(db, args, admin_id, session_state)
                elif name == "get_package_by_name":
                    return await PackageSearchTools._get_package_by_name(db, args, admin_id, session_state)
                elif name == "get_booking_details":
                    return await PackageSearchTools._get_booking_details(db, args, admin_id)
                else:
                    return {"error": f"Unknown tool: {name}"}
        except Exception as e:
            logger.error(f"[PackageSearchTools] Tool execution error: {e}")
            return {"error": str(e)}

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_json_list(items) -> list:
        """Safely parse a JSON list field from the DB."""
        if not items:
            return []
        try:
            if isinstance(items, list):
                return items
            return json.loads(items)
        except Exception:
            return []

    # ── Tool Implementations ───────────────────────────────────────────────────

    @staticmethod
    async def _search_packages(db, args: Dict, admin_id: Optional[str], session_state: Dict) -> Any:
        logger.info(f"[PackageSearchTools] search_packages({args})")

        # Update session context
        if session_state and "conversationContext" in session_state:
            ctx = session_state["conversationContext"]
            if args.get("max_price"):
                ctx["budget"] = args["max_price"]
                ctx["budget_type"] = "under"
            elif args.get("min_price"):
                ctx["budget"] = args["min_price"]
                ctx["budget_type"] = "above"
            if args.get("location"):
                ctx["destination"] = args["location"]
            if args.get("duration_days"):
                ctx["days"] = args["duration_days"]
            if args.get("travel_style"):
                ctx["trip_style"] = args["travel_style"]

        async def run_search(strict=True):
            query = (
                select(Package)
                .options(selectinload(Package.images))
                .where(Package.status == PackageStatus.PUBLISHED)
            )
            if admin_id:
                query = query.where(Package.created_by == admin_id)

            if args.get("location"):
                loc = args["location"]
                words = loc.strip().split()
                title_search = " ".join(words[:3]) if len(words) >= 3 else loc
                query = query.where(or_(
                    Package.destination.ilike(f"%{loc}%"),
                    Package.country.ilike(f"%{loc}%"),
                    Package.title.ilike(f"%{title_search}%"),
                ))

            if args.get("duration_days"):
                limit = args["duration_days"]
                tolerance = 1 if strict else 3
                query = query.where(and_(
                    Package.duration_days >= limit - tolerance,
                    Package.duration_days <= limit + tolerance,
                ))

            if args.get("duration_nights"):
                if not args.get("duration_days") or strict:
                    limit = args["duration_nights"]
                    tolerance = 1 if strict else 2
                    query = query.where(and_(
                        Package.duration_nights >= limit - tolerance,
                        Package.duration_nights <= limit + tolerance,
                    ))

            if args.get("travel_style") and strict:
                style = args["travel_style"]
                query = query.where(or_(
                    Package.trip_style.ilike(f"%{style}%"),
                    Package.category.ilike(f"%{style}%"),
                ))

            if args.get("booking_type"):
                query = query.where(Package.booking_type == args["booking_type"])

            if args.get("max_price"):
                limit = args["max_price"]
                if not strict:
                    limit *= 1.2
                query = query.where(Package.price_per_person <= limit)

            if args.get("min_price"):
                limit = args["min_price"]
                if not strict:
                    limit *= 0.8
                query = query.where(Package.price_per_person >= limit)

            query = query.limit(5)
            result = await db.execute(query)
            return result.scalars().all()

        packages = await run_search(strict=True)

        if not packages and (args.get("duration_days") or args.get("max_price") or args.get("travel_style")):
            logger.info("[PackageSearchTools] Retrying with relaxed filters...")
            packages = await run_search(strict=False)

        if not packages and args.get("location"):
            logger.info("[PackageSearchTools] Falling back to location-only search...")
            query = (
                select(Package)
                .options(selectinload(Package.images))
                .where(and_(
                    Package.status == PackageStatus.PUBLISHED,
                    or_(
                        Package.destination.ilike(f"%{args['location']}%"),
                        Package.country.ilike(f"%{args['location']}%"),
                    )
                ))
            )
            if admin_id:
                query = query.where(Package.created_by == admin_id)
            query = query.limit(5)
            result = await db.execute(query)
            packages = result.scalars().all()

        parse = PackageSearchTools._parse_json_list
        results = [
            {
                "id": str(p.id),
                "title": p.title,
                "destination": p.destination,
                "price": float(p.price_per_person) if p.price_per_person else 0.0,
                "price_label": p.price_label,
                "booking_type": p.booking_type,
                "duration": f"{p.duration_days} Days / {p.duration_nights} Nights",
                "highlights": parse(p.included_items)[:3],
                "feature_image_url": p.feature_image_url,
                "image_url": p.images[0].image_url if p.images else None,
            }
            for p in packages
        ]

        if session_state is not None:
            if "shownPackages" not in session_state:
                session_state["shownPackages"] = []
            for pkg_data in results:
                if not any(sp["id"] == pkg_data["id"] for sp in session_state["shownPackages"]):
                    session_state["shownPackages"].append({
                        "id": pkg_data["id"],
                        "name": pkg_data["title"],
                        "booking_type": pkg_data["booking_type"],
                        "price": pkg_data["price"],
                        "price_label": pkg_data["price_label"],
                    })
            session_state["lastIntent"] = "search"
            session_state["shownPackages"] = session_state["shownPackages"][-20:]

        return results

    @staticmethod
    async def _get_package_details(db, args: Dict, admin_id: Optional[str], session_state: Dict) -> Any:
        pkg_id = args.get("package_id")
        query = (
            select(Package)
            .options(selectinload(Package.images))
            .where(Package.id == pkg_id)
        )
        if admin_id:
            query = query.where(Package.created_by == admin_id)
        result = await db.execute(query)
        package = result.scalar_one_or_none()

        if not package:
            return {"error": "Package not found"}

        parse = PackageSearchTools._parse_json_list
        details = {
            "id": str(package.id),
            "title": package.title,
            "description": package.description,
            "price": float(package.price_per_person) if package.price_per_person else 0.0,
            "price_label": package.price_label,
            "booking_type": package.booking_type,
            "duration": f"{package.duration_days} Days / {package.duration_nights} Nights",
            "duration_days": package.duration_days,
            "included": parse(package.included_items),
            "cancellation_enabled": package.cancellation_enabled,
            "cancellation_rules": package.cancellation_rules,
            "itinerary": "Detailed itinerary available upon booking.",
            "feature_image_url": package.feature_image_url,
            "image_url": package.images[0].image_url if package.images else None,
        }

        if session_state is not None:
            if "shownPackages" not in session_state:
                session_state["shownPackages"] = []
            if not any(sp["id"] == str(package.id) for sp in session_state["shownPackages"]):
                session_state["shownPackages"].append({
                    "id": str(package.id),
                    "name": package.title,
                    "booking_type": package.booking_type,
                    "price": float(package.price_per_person) if package.price_per_person else 0.0,
                    "price_label": package.price_label,
                })
            session_state["lastIntent"] = "details"

        return details

    @staticmethod
    async def _get_package_by_name(db, args: Dict, admin_id: Optional[str], session_state: Dict) -> Any:
        pkg_name = args.get("package_name")
        logger.info(f"[PackageSearchTools] get_package_by_name: {pkg_name}")

        query = (
            select(Package)
            .options(selectinload(Package.images))
            .where(Package.status == PackageStatus.PUBLISHED)
        )
        if admin_id:
            query = query.where(Package.created_by == admin_id)
        result = await db.execute(query)
        packages = result.scalars().all()

        # Fuzzy title matching
        best_package = None
        best_score = -1
        clean_query = pkg_name.lower()
        suffixes = ["package", "trip", "tour", "holiday", "holidays", "itinerary", "booking", "details"]
        for s in suffixes:
            clean_query = re.sub(rf'\b{s}\b', '', clean_query)
        clean_query = clean_query.strip()
        query_words = set(clean_query.split())

        for p in packages:
            p_title = p.title.lower() if p.title else ""
            clean_p_title = p_title
            for s in suffixes:
                clean_p_title = re.sub(rf'\b{s}\b', '', clean_p_title)
            clean_p_title = clean_p_title.strip()

            score = 0
            if clean_p_title == clean_query and clean_query != "":
                score = 100
            elif clean_query != "" and (clean_p_title.startswith(clean_query) or clean_query.startswith(clean_p_title)):
                score = 80
            elif clean_query != "" and (clean_query in clean_p_title or clean_p_title in clean_query):
                score = 60
            else:
                p_words = set(clean_p_title.split())
                match_count = len(query_words.intersection(p_words))
                if match_count >= 2:
                    score = 40 + match_count

            if score > best_score:
                best_score = score
                best_package = p

        package = best_package if best_score >= 40 else None

        if not package:
            return {"error": f"Package '{pkg_name}' not found"}

        parse = PackageSearchTools._parse_json_list
        details = {
            "id": str(package.id),
            "title": package.title,
            "description": package.description,
            "price": float(package.price_per_person) if package.price_per_person else 0.0,
            "price_label": package.price_label,
            "booking_type": package.booking_type,
            "duration": f"{package.duration_days} Days / {package.duration_nights} Nights",
            "duration_days": package.duration_days,
            "included": parse(package.included_items),
            "cancellation_enabled": package.cancellation_enabled,
            "cancellation_rules": package.cancellation_rules,
            "itinerary": "Detailed itinerary available upon booking.",
            "feature_image_url": package.feature_image_url,
            "image_url": package.images[0].image_url if package.images else None,
        }

        if session_state is not None:
            if "shownPackages" not in session_state:
                session_state["shownPackages"] = []
            if not any(sp["id"] == str(package.id) for sp in session_state["shownPackages"]):
                session_state["shownPackages"].append({
                    "id": str(package.id),
                    "name": package.title,
                    "booking_type": package.booking_type,
                    "price": float(package.price_per_person) if package.price_per_person else 0.0,
                    "price_label": package.price_label,
                })
            session_state["lastIntent"] = "details"

        return details

    @staticmethod
    async def _get_booking_details(db, args: Dict, admin_id: Optional[str]) -> Any:
        from app.models import Booking
        booking_ref = args.get("booking_reference")
        logger.info(f"[PackageSearchTools] get_booking_details: {booking_ref}")

        query = select(Booking).where(Booking.booking_reference == booking_ref)
        if admin_id:
            query = query.join(Booking.package).where(Package.created_by == admin_id)
        result = await db.execute(query)
        booking = result.scalar_one_or_none()

        if not booking:
            return {"error": f"Booking with reference {booking_ref} not found."}

        package = booking.package
        if not package:
            return {"error": "Associated package not found for this booking."}

        parse = PackageSearchTools._parse_json_list
        return {
            "booking_reference": booking.booking_reference,
            "package_name": package.title,
            "total_price": float(booking.total_amount),
            "gst_status": "Inclusive" if booking.is_gst_inclusive else "Exclusive",
            "gst_amount": float(booking.gst_amount) if booking.gst_amount else 0,
            "cancellation_policy": package.cancellation_rules if package.cancellation_enabled else "No cancellation details available.",
            "inclusions": parse(package.included_items),
            "exclusions": parse(package.excluded_items),
            "travel_date": booking.travel_date.isoformat() if booking.travel_date else None,
            "status": str(booking.status),
        }

import os
import logging
from io import BytesIO
from typing import Optional, List, Dict, Any
from xhtml2pdf import pisa
from datetime import timedelta
from app.models import Package, Booking, ItineraryItem

logger = logging.getLogger(__name__)

class ItineraryPdfService:
    @staticmethod
    def generate_itinerary_pdf(package: Package, booking: Optional[Booking] = None) -> Optional[bytes]:
        """
        Generates a Day-wise Tabular Itinerary PDF.
        Matches the visual reference with Date, Morning, Afternoon, Evening columns.
        """
        try:
            # Group items by day_number
            # Ensure itinerary_items is sorted by day_number (it should be, due to order_by in models)
            items_by_day: Dict[int, List[ItineraryItem]] = {}
            for item in package.itinerary_items:
                if item.day_number not in items_by_day:
                    items_by_day[item.day_number] = []
                items_by_day[item.day_number].append(item)
                
            max_day = max(items_by_day.keys()) if items_by_day else 0
            
            # HTML generation
            html_rows = ""
            
            # Helper to parse destinations
            destinations = []
            if package.destinations:
                try:
                    import json
                    destinations = json.loads(package.destinations) if isinstance(package.destinations, str) else package.destinations
                except Exception as e:
                    logger.error(f"Error parsing destinations: {e}")
            
            # Map day to destination header
            day_to_header = {}
            if package.package_mode == "multi" and destinations:
                current_start_day = 1
                for dest in destinations:
                    city = dest.get("city", "Unknown")
                    days = dest.get("days", 0)
                    if city and days > 0:
                        day_to_header[current_start_day] = f"{city} – {days} Days"
                        current_start_day += days
            else:
                # Fallback for single destination or empty multi
                day_to_header[1] = package.destination or "Itinerary"
            
            for day_idx in range(1, max_day + 1):
                # Check for destination header
                if day_idx in day_to_header:
                    html_rows += f"""
                    <tr class="destination-row">
                        <td colspan="4"><b>{day_to_header[day_idx]}</b></td>
                    </tr>
                    """
                
                items = items_by_day.get(day_idx, [])
                
                # Determine the text for the Date column
                date_text = f"Day {day_idx}"
                if booking and booking.travel_date:
                    current_date = booking.travel_date + timedelta(days=day_idx - 1)
                    date_text = current_date.strftime("%d %b")
                
                # Check for a single full-day activity
                full_day_item = next((item for item in items if item.time_slot == "full_day" or not item.time_slot), None)
                
                if full_day_item and len(items) == 1:
                    # Renders a single row spanning Morning, Afternoon, Evening
                    html_rows += f"""
                    <tr>
                        <td class="date-col">{date_text}</td>
                        <td colspan="3">{full_day_item.title}</td>
                    </tr>
                    """
                else:
                    # Separate into Morning, Afternoon, Evening slots
                    morning_items = [i for i in items if i.time_slot == "morning"]
                    afternoon_items = [i for i in items if i.time_slot == "afternoon"]
                    evening_items = [i for i in items if i.time_slot in ["evening", "night"]]
                    
                    def format_slot(slot_items):
                        if not slot_items:
                            return "At Leisure"
                        return "<br/>".join([f"{item.title}" for item in slot_items])
                        
                    morning_html = format_slot(morning_items)
                    afternoon_html = format_slot(afternoon_items)
                    evening_html = format_slot(evening_items)
                    
                    html_rows += f"""
                    <tr>
                        <td class="date-col">{date_text}</td>
                        <td>{morning_html}</td>
                        <td>{afternoon_html}</td>
                        <td>{evening_html}</td>
                    </tr>
                    """

            # Build full HTML
            html_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: Helvetica, sans-serif;
                        color: #333;
                        font-size: 13px;
                    }}
                    h2 {{
                        color: #1f2937;
                        margin-bottom: 20px;
                        font-size: 20px;
                    }}
                    table {{
                        width: 100%;
                        border-collapse: collapse;
                        border: 1px solid #d1d5db;
                    }}
                    th {{
                        background-color: #4b5563; /* Dark Grey/Blue */
                        color: white;
                        text-align: left;
                        padding: 12px;
                        font-weight: bold;
                        border: 1px solid #d1d5db;
                    }}
                    td {{
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        vertical-align: top;
                    }}
                    .destination-row td {{
                        background-color: #e5e7eb; /* Light grey */
                        font-size: 14px;
                    }}
                    .date-col {{
                        white-space: nowrap;
                        width: 80px;
                        color: #4b5563;
                    }}
                    /* Alternating row colors aren't strictly shown for data, but can help readability. The image uses white backgrounds mostly for data */
                </style>
            </head>
            <body>
                <h2>Day wise itinerary</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Morning</th>
                            <th>Afternoon</th>
                            <th>Evening</th>
                        </tr>
                    </thead>
                    <tbody>
                        {html_rows}
                    </tbody>
                </table>
            </body>
            </html>
            """
            
            # Generate PDF
            result_file = BytesIO()
            pisa_status = pisa.CreatePDF(
                html_template,
                dest=result_file,
                encoding='utf-8'
            )
            
            if pisa_status.err:
                logger.error(f"Failed to generate Itinerary PDF for Package {package.id}: {pisa_status.err}")
                return None
                
            return result_file.getvalue()
            
        except Exception as e:
            logger.error(f"Exception generating Itinerary PDF: {e}", exc_info=True)
            return None

import os
import logging
from io import BytesIO
from typing import Optional, List, Dict, Any
from xhtml2pdf import pisa
from datetime import datetime, timedelta
from app.models import Package, Booking, ItineraryItem

logger = logging.getLogger(__name__)

class ItineraryPdfService:
    @staticmethod
    def generate_itinerary_pdf(package: Package, booking: Optional[Booking] = None) -> Optional[bytes]:
        """
        Generates a Modern Day-wise Tabular Itinerary PDF.
        Matches the visual reference with Date, Morning, Afternoon, Evening columns.
        """
        try:
            # Group items by day_number
            items_by_day: Dict[int, List[ItineraryItem]] = {}
            for item in package.itinerary_items:
                if item.day_number not in items_by_day:
                    items_by_day[item.day_number] = []
                items_by_day[item.day_number].append(item)
                
            max_day = max(items_by_day.keys()) if items_by_day else 0
            
            # Fetch Agent Branding
            agent_name = "Registered Travel Partner"
            agent_logo = None
            
            if package.creator:
                # Accessing agent_profile - ensure it's loaded via selectinload
                agent = getattr(package.creator, 'agent_profile', None)
                if agent:
                    agent_name = agent.agency_name or f"{agent.first_name} {agent.last_name}"
                    # Safely handle homepage_settings which might be a string or dict
                    settings = agent.homepage_settings
                    if settings:
                        if isinstance(settings, str):
                            try:
                                import json
                                settings = json.loads(settings)
                            except:
                                settings = {}
                        
                        if isinstance(settings, dict):
                            # Prioritize navbar_logo_image as requested
                            agent_logo = settings.get('navbar_logo_image')
                            if not agent_logo:
                                agent_logo = settings.get('logo') or settings.get('agency_logo') or settings.get('profile_logo')

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
                day_to_header[1] = package.destination or "Your Journey"
            
            import html
            for day_idx in range(1, max_day + 1):
                # Check for destination header
                if day_idx in day_to_header:
                    header_text = html.escape(day_to_header[day_idx])
                    html_rows += f"""
                    <tr class="destination-row">
                        <td colspan="4" style="background-color: #f3f4f6; color: #374151; font-weight: bold; padding: 10px 15px; border-top: 2px solid #e5e7eb;">
                            <img src="https://img.icons8.com/ios-filled/20/3b82f6/marker.png" style="vertical-align: middle; margin-right: 5px;"/>
                            {header_text}
                        </td>
                    </tr>
                    """
                
                items = items_by_day.get(day_idx, [])
                date_text = f"Day {day_idx}"
                if booking and booking.travel_date:
                    current_date = booking.travel_date + timedelta(days=day_idx - 1)
                    date_text = current_date.strftime("%d %b, %a")
                
                # Separate into Morning, Afternoon, Evening slots
                morning_items = [i for i in items if i.time_slot == "morning"]
                afternoon_items = [i for i in items if i.time_slot == "afternoon"]
                evening_items = [i for i in items if i.time_slot in ["evening", "night"]]
                half_day_items = [i for i in items if i.time_slot == "half_day"]
                full_day_items = [i for i in items if i.time_slot == "full_day" or not i.time_slot]
                
                # Distribute half-day items based on time
                for item in half_day_items:
                    try:
                        if item.start_time:
                            hour = int(item.start_time.split(':')[0])
                            if hour < 12:
                                morning_items.append(item)
                            else:
                                afternoon_items.append(item)
                        else:
                            # Default half-day to morning if no time specified
                            morning_items.append(item)
                    except:
                        morning_items.append(item)

                def format_slot(slot_items):
                    if not slot_items:
                        return '<span style="color: #9ca3af; font-style: italic;">At Leisure</span>'
                    return "<br/>".join([f"• {html.escape(item.title)}" for item in slot_items])
                
                # If there's a full day activity and nothing else, span it
                if full_day_items and not (morning_items or afternoon_items or evening_items):
                    html_rows += f"""
                    <tr>
                        <td class="date-col" style="width: 15%; color: #4b5563; font-weight: bold; text-align: center; border-right: 1px solid #e5e7eb;">{date_text}</td>
                        <td colspan="3" style="padding: 15px; color: #1f2937;">
                            <b style="color: #2563eb;">Full Day Experience:</b><br/>
                            {format_slot(full_day_items)}
                        </td>
                    </tr>
                    """
                else:
                    # Combined view
                    # Include full_day items in the morning column if we are not in spanned view
                    morning_html = format_slot(morning_items + full_day_items)
                    afternoon_html = format_slot(afternoon_items)
                    evening_html = format_slot(evening_items)
                    
                    html_rows += f"""
                    <tr>
                        <td class="date-col" style="width: 15%; color: #4b5563; font-weight: bold; text-align: center; border-right: 1px solid #e5e7eb;">{date_text}</td>
                        <td style="width: 28%; padding: 12px; border-right: 1px solid #f3f4f6;">{morning_html}</td>
                        <td style="width: 28%; padding: 12px; border-right: 1px solid #f3f4f6;">{afternoon_html}</td>
                        <td style="width: 28%; padding: 12px;">{evening_html}</td>
                    </tr>
                    """

            # Build full HTML with modern styling
            # Using table-based layout for the header since Flexbox isn't supported in xhtml2pdf
            logo_html = ""
            if agent_logo:
                # Ensure logo URL is absolute for xhtml2pdf
                if agent_logo.startswith('/'):
                    # Get base URL from environment or fallback to common local dev port
                    base_url = os.getenv("BACKEND_URL", "http://localhost:8000")
                    agent_logo = f"{base_url}{agent_logo}"
                logo_html = f'<img src="{agent_logo}" style="width: 50px; height: 50px; border-radius: 25px;"/>'
            else:
                logo_html = f'<div style="width: 50px; height: 50px; border-radius: 25px; background-color: #3b82f6; color: white; text-align: center; line-height: 50px; font-weight: bold; font-size: 24px;">{agent_name[0]}</div>'

            # Determine Generate Date
            gen_date_obj = booking.created_at if (booking and hasattr(booking, 'created_at') and booking.created_at) else datetime.now()
            gen_date_str = gen_date_obj.strftime('%d %b %Y')

            html_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page {{
                        margin: 1.5cm;
                        size: A4;
                    }}
                    body {{
                        font-family: Helvetica, Arial, sans-serif;
                        color: #374151;
                        font-size: 11px;
                        line-height: 1.5;
                    }}
                    .header-container {{
                        margin-bottom: 30px;
                        border-bottom: 2px solid #3b82f6;
                        padding-bottom: 20px;
                    }}
                    .agent-branding {{
                        margin-bottom: 15px;
                    }}
                    .package-title {{
                        font-size: 24px;
                        font-weight: bold;
                        color: #111827;
                        margin: 0;
                        padding: 0;
                    }}
                    .destination-badge {{
                        color: #6b7280;
                        font-size: 13px;
                        margin-top: 5px;
                    }}
                    table.itinerary-table {{
                        width: 100%;
                        border-collapse: collapse;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                    }}
                    th {{
                        background-color: #1f2937;
                        color: #ffffff;
                        text-align: left;
                        padding: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        font-size: 10px;
                    }}
                    td {{
                        padding: 10px;
                        border-bottom: 1px solid #e5e7eb;
                        vertical-align: top;
                    }}
                    .section-title {{
                        font-size: 18px;
                        font-weight: bold;
                        color: #1f2937;
                        margin-top: 30px;
                        margin-bottom: 15px;
                    }}
                </style>
            </head>
            <body>
                <div class="header-container">
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 60%; border: none; padding: 0;">
                                <div class="agent-branding">
                                    <table style="border: none;">
                                        <tr>
                                            <td style="border: none; padding: 0; width: 60px;">
                                                {logo_html}
                                            </td>
                                            <td style="border: none; padding: 0 0 0 10px; vertical-align: middle;">
                                                <div style="font-size: 10px; color: #9ca3af; font-weight: bold; text-transform: uppercase;">Travel Partner</div>
                                                <div style="font-size: 14px; font-weight: bold; color: #4b5563;">{html.escape(agent_name)}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                <h1 class="package-title">{html.escape(package.title)}</h1>
                                <div class="destination-badge">
                                    <img src="https://img.icons8.com/ios-filled/14/6b7280/marker.png" style="vertical-align: middle;"/>
                                    {html.escape(package.destination)} &bull; {package.duration_days} Days / {package.duration_nights} Nights
                                </div>
                            </td>
                            <td style="width: 40%; border: none; padding: 0; text-align: right; vertical-align: bottom;">
                                <div style="font-size: 10px; color: #9ca3af; font-weight: bold;">GENERATE DATE</div>
                                <div style="font-size: 12px; color: #4b5563;">{gen_date_str}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="section-title">Day-by-Day Journey</div>
                <table class="itinerary-table">
                    <thead>
                        <tr>
                            <th style="width: 15%;">Date / Day</th>
                            <th style="width: 28%;">Morning</th>
                            <th style="width: 28%;">Afternoon</th>
                            <th style="width: 28%;">Evening</th>
                        </tr>
                    </thead>
                    <tbody>
                        {html_rows}
                    </tbody>
                </table>
                
                <div style="margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 9px;">
                    This is a computer-generated itinerary provided by {html.escape(agent_name)}. 
                    All activities are subject to availability and weather conditions.
                </div>
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

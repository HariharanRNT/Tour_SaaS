import os
import json
import uuid
import html
from datetime import datetime, timedelta
from xhtml2pdf import pisa
from io import BytesIO
from typing import List, Dict, Any
from app.config import settings
from app.models import Enquiry, Package, Agent

class PDFService:
    @staticmethod
    async def generate_quote_pdf(
        enquiry: Enquiry,
        packages: List[Package],
        agent_profile: Agent,
        quoted_data: List[Dict[str, Any]]
    ) -> str:
        """
        Generate a professional travel quotation PDF with optimized page breaking.
        """
        html_content = PDFService._build_quote_html(enquiry, packages, agent_profile, quoted_data)
        
        pdf_filename = f"quote_{enquiry.id.hex[:8]}_{uuid.uuid4().hex[:6]}.pdf"
        static_dir = os.path.join(os.path.dirname(__file__), "..", "..", "static", "quotes")
        os.makedirs(static_dir, exist_ok=True)
        
        file_path = os.path.join(static_dir, pdf_filename)
        
        with open(file_path, "wb") as f:
            pisa_status = pisa.CreatePDF(html_content, dest=f)
            
        if pisa_status.err:
            raise Exception(f"Failed to generate PDF: {pisa_status.err}")
            
        return f"/static/quotes/{pdf_filename}"

    @staticmethod
    def _build_quote_html(
        enquiry: Enquiry,
        packages: List[Package],
        agent_profile: Agent,
        quoted_data: List[Dict[str, Any]]
    ) -> str:
        """Build a stable, page-break-optimized PDF template."""
        
        price_map = {str(item['packageId']): item['quotedPrice'] for item in quoted_data}
        agency_name = html.escape(agent_profile.agency_name or "Your Travel Agency")
        customer_name = html.escape(enquiry.customer_name)
        quote_ref = f"ENQ-{enquiry.id.hex[:6].upper()}"
        
        company_logo_url = ""
        if agent_profile.homepage_settings:
            custom_logo = agent_profile.homepage_settings.get("navbar_logo_image")
            if custom_logo:
                company_logo_url = custom_logo
        
        if not company_logo_url:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            logo_path = os.path.join(current_dir, "..", "..", "static", "logo.png")
            if os.path.exists(logo_path):
                company_logo_url = "file:///" + os.path.abspath(logo_path).replace("\\", "/")

        today = datetime.now()
        valid_until = (today + timedelta(days=7)).strftime("%d %B %Y")
        travel_date = enquiry.travel_date.strftime("%d %B %Y")
        
        logo_html = f'<img src="{company_logo_url}" width="40" height="40" />' if company_logo_url else f'<div style="font-weight: bold; color: #1e3a5f; font-size: 18px;">{agency_name[:2].upper()}</div>'

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 40px;
                    margin-top: 100px;
                    margin-bottom: 80px;
                    @frame header_frame {{
                        -pdf-frame-content: header_content;
                        left: 40pt; width: 515pt; top: 30pt; height: 60pt;
                    }}
                    @frame footer_frame {{
                        -pdf-frame-content: footer_content;
                        left: 40pt; width: 515pt; top: 780pt; height: 60pt;
                    }}
                }}
                
                body {{
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    color: #2c3e50;
                    line-height: 1.6;
                    font-size: 10px;
                }}
                
                /* Compact Fixed Header */
                #header_content {{
                    border-bottom: 1.5px solid #1e3a5f;
                    padding-bottom: 5px;
                }}
                .header-table {{ width: 100%; }}
                .header-ref {{ text-align: right; font-size: 9px; font-weight: bold; color: #1e3a5f; }}
                
                /* Layout Utilities */
                .page-break {{ page-break-before: always; }}
                .no-break {{ page-break-inside: avoid; break-inside: avoid; }}
                
                /* Sections */
                .hero {{
                    background-color: #fcfcfc;
                    padding: 15px;
                    border: 1px solid #eee;
                    margin-bottom: 20px;
                    text-align: center;
                }}
                .quote-title {{ font-size: 20px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px; }}
                
                .meta-table {{ width: 100%; margin-bottom: 25px; border-collapse: collapse; }}
                .meta-box {{ background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 6px; text-align: center; width: 24%; }}
                .meta-label {{ font-size: 7px; color: #95a5a6; font-weight: bold; text-transform: uppercase; }}
                .meta-value {{ font-size: 9px; color: #2c3e50; font-weight: bold; }}
                
                .section-card {{
                    background-color: #ffffff;
                    margin-bottom: 25px;
                }}
                
                /* Itinerary Styling */
                .day-block {{
                    page-break-inside: avoid;
                    break-inside: avoid;
                    margin-bottom: 15px;
                }}
                .day-label {{
                    font-size: 11px;
                    font-weight: bold;
                    color: #ffffff;
                    background-color: #1e3a5f;
                    padding: 3px 10px;
                    display: inline-block;
                    margin-bottom: 8px;
                }}
                .timeline-content {{
                    border-left: 2px solid #1e3a5f;
                    margin-left: 15px;
                    padding-left: 15px;
                }}
                .activity-title {{ font-size: 10px; font-weight: bold; color: #2c3e50; word-break: break-word; }}
                .activity-desc {{ font-size: 9px; color: #7f8c8d; margin-top: 2px; word-break: break-word; }}
                
                /* Pricing Box */
                .pricing-section {{
                    page-break-inside: avoid;
                    margin-top: 30px;
                    border: 1px solid #eee;
                    padding: 10px;
                }}
                .price-table {{ width: 100%; border-collapse: collapse; }}
                .price-table th {{ background-color: #1e3a5f; color: white; font-size: 9px; padding: 8px; text-align: left; }}
                .price-table td {{ padding: 8px; font-size: 9px; border-bottom: 1px solid #eee; }}
                .total-row {{ background-color: #f8f9fa; border-top: 2px solid #1e3a5f; }}
                .total-value {{ font-size: 16px; font-weight: bold; color: #1e3a5f; text-align: right; padding: 12px; }}
                
                /* Footer */
                #footer_content {{ border-top: 1px solid #eee; padding-top: 10px; text-align: center; }}
                .footer-text {{ font-size: 8px; color: #bdc3c7; }}
            </style>
        </head>
        <body>
            <div id="header_content">
                <table class="header-table">
                    <tr>
                        <td style="width: 50px;">{logo_html}</td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                            <div style="font-size: 14px; font-weight: bold; color: #1e3a5f;">{agency_name}</div>
                        </td>
                        <td class="header-ref">
                            <div>QUOTE REF: {quote_ref}</div>
                            <div style="font-size: 7px; color: #95a5a6; font-weight: normal; margin-top: 2px;">
                                PAGE <pdf:pagenumber/> OF <pdf:pagecount/>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <div id="footer_content">
                <div style="font-size: 10px; font-weight: bold; color: #1e3a5f; margin-bottom: 5px;">Contact us to confirm your booking</div>
                <div class="footer-text">{agency_name} | Created for {customer_name}</div>
            </div>
            
            <div class="hero">
                <div class="quote-title">Travel Quotation</div>
                <div style="font-size: 12px; color: #2980b9; margin-top: 5px;">Prepared for {customer_name}</div>
            </div>
            
            <table class="meta-table">
                <tr>
                    <td class="meta-box"><div class="meta-label">Quote Ref</div><div class="meta-value">{quote_ref}</div></td>
                    <td style="width: 1%;"></td>
                    <td class="meta-box"><div class="meta-label">Travel Date</div><div class="meta-value">{travel_date}</div></td>
                    <td style="width: 1%;"></td>
                    <td class="meta-box"><div class="meta-label">Guests</div><div class="meta-value">{enquiry.travellers} Person(s)</div></td>
                    <td style="width: 1%;"></td>
                    <td class="meta-box"><div class="meta-label">Valid Until</div><div class="meta-value">{valid_until}</div></td>
                </tr>
            </table>
        """

        for idx, pkg in enumerate(packages):
            quoted_price = float(price_map.get(str(pkg.id), pkg.price_per_person))
            
            itinerary_by_day = {}
            for item in sorted(pkg.itinerary_items, key=lambda x: x.day_number):
                if item.day_number not in itinerary_by_day:
                    itinerary_by_day[item.day_number] = []
                itinerary_by_day[item.day_number].append(item)

            # Package always starts on a fresh page if it's not the first one
            break_class = "page-break" if idx > 0 else ""

            html_content += f"""
            <div class="section-card {break_class}">
                <div style="border-left: 4px solid #1e3a5f; padding-left: 12px; margin-bottom: 15px;">
                    <div style="font-size: 15px; font-weight: bold; color: #1e3a5f;">{html.escape(pkg.title)}</div>
                    <div style="font-size: 8px; color: #7f8c8d;">{pkg.duration_days} Days in {html.escape(pkg.destination)}</div>
                </div>
                
                <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; margin-bottom: 10px; border-bottom: 1px solid #eee;">Plan Details</div>
            """
            
            for day_num in sorted(itinerary_by_day.keys()):
                activities = itinerary_by_day[day_num]
                html_content += f"""
                <div class="day-block">
                    <div class="day-label">DAY {day_num}</div>
                    <div class="timeline-content">
                """
                for act in activities:
                    html_content += f"""
                        <div style="margin-bottom: 10px;">
                            <div class="activity-title">• {html.escape(act.title)}</div>
                            <div class="activity-desc">{html.escape(act.description)}</div>
                        </div>
                    """
                html_content += "</div></div>"

            total_for_guests = quoted_price * enquiry.travellers
            html_content += f"""
                <div class="pricing-section">
                    <table class="price-table">
                        <tr>
                            <th style="width: 50%;">Description</th>
                            <th style="width: 10%; text-align: center;">Qty</th>
                            <th style="width: 20%; text-align: right;">Unit Price</th>
                            <th style="width: 20%; text-align: right;">Subtotal</th>
                        </tr>
                        <tr>
                            <td><strong>{html.escape(pkg.title)}</strong></td>
                            <td style="text-align: center;">{enquiry.travellers}</td>
                            <td style="text-align: right;">₹ {quoted_price:,.2f}</td>
                            <td style="text-align: right;">₹ {total_for_guests:,.2f}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="2" style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-align: right;">Total Amount</td>
                            <td colspan="2" class="total-value">₹ {total_for_guests:,.2f}</td>
                        </tr>
                    </table>
                </div>
            </div>
            """

        html_content += "</body></html>"
        return html_content

pdf_service = PDFService()

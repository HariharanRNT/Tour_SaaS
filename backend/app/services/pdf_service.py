import os
import uuid
from datetime import datetime
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
        Generate a branded PDF quote for travel packages.
        Returns the relative URL to the generated PDF.
        """
        # 1. Prepare HTML Template
        html_content = PDFService._build_quote_html(enquiry, packages, agent_profile, quoted_data)
        
        # 2. Generate PDF
        pdf_filename = f"quote_{enquiry.id.hex[:8]}_{uuid.uuid4().hex[:6]}.pdf"
        static_dir = os.path.join(os.path.dirname(__file__), "..", "..", "static", "quotes")
        os.makedirs(static_dir, exist_ok=True)
        
        file_path = os.path.join(static_dir, pdf_filename)
        
        with open(file_path, "wb") as f:
            pisa_status = pisa.CreatePDF(html_content, dest=f)
            
        if pisa_status.err:
            raise Exception(f"Failed to generate PDF: {pisa_status.err}")
            
        # 3. Return relative URL
        return f"/static/quotes/{pdf_filename}"

    @staticmethod
    def _build_quote_html(
        enquiry: Enquiry,
        packages: List[Package],
        agent_profile: Agent,
        quoted_data: List[Dict[str, Any]]
    ) -> str:
        """Build the HTML string for the PDF."""
        # Map quoted prices for easy lookup
        price_map = {str(item['packageId']): item['quotedPrice'] for item in quoted_data}
        
        agency_name = agent_profile.agency_name or "Your Travel Agency"
        agency_contact = f"{agent_profile.phone or ''} | {agent_profile.user.email}"
        agency_address = agent_profile.business_address or ""
        
        today = datetime.now().strftime("%d %B %Y")
        travel_date = enquiry.travel_date.strftime("%d %B %Y")
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page {{
                    size: A4;
                    margin: 2cm;
                }}
                body {{
                    font-family: Helvetica, Arial, sans-serif;
                    color: #333;
                    line-height: 1.5;
                }}
                .header {{
                    text-align: center;
                    border-bottom: 2px solid #3B82F6;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                .agency-name {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #1E40AF;
                }}
                .quote-title {{
                    font-size: 32px;
                    font-weight: bold;
                    margin: 40px 0;
                    text-align: center;
                    color: #3B82F6;
                    text-transform: uppercase;
                }}
                .info-table {{
                    width: 100%;
                    margin-bottom: 30px;
                }}
                .info-table td {{
                    padding: 5px;
                }}
                .label {{
                    font-weight: bold;
                    color: #666;
                }}
                .package-section {{
                    margin-top: 40px;
                    page-break-before: always;
                }}
                .package-title {{
                    font-size: 24px;
                    font-weight: bold;
                    background-color: #F3F4F6;
                    padding: 10px;
                    border-left: 5px solid #3B82F6;
                }}
                .section-header {{
                    font-size: 18px;
                    font-weight: bold;
                    margin-top: 20px;
                    margin-bottom: 10px;
                    color: #1E40AF;
                    border-bottom: 1px solid #DDD;
                }}
                .itinerary-day {{
                    margin-bottom: 15px;
                }}
                .day-number {{
                    font-weight: bold;
                    color: #3B82F6;
                }}
                .pricing-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }}
                .pricing-table th, .pricing-table td {{
                    border: 1px solid #DDD;
                    padding: 10px;
                    text-align: left;
                }}
                .pricing-table th {{
                    background-color: #F9FAFB;
                }}
                .inclusion-list {{
                    list-style-type: none;
                    padding-left: 0;
                }}
                .inclusion-item {{
                    margin-bottom: 5px;
                }}
                .check {{ color: green; font-weight: bold; }}
                .cross {{ color: red; font-weight: bold; }}
                .footer {{
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #DDD;
                    padding-top: 20px;
                }}
                .total-row {{
                    font-size: 18px;
                    font-weight: bold;
                    background-color: #EFF6FF;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="agency-name">{agency_name}</div>
                <div>{agency_address}</div>
                <div>{agency_contact}</div>
            </div>

            <div class="quote-title">Travel Quote</div>

            <table class="info-table">
                <tr>
                    <td class="label">Customer:</td>
                    <td>{enquiry.customer_name}</td>
                    <td class="label">Reference:</td>
                    <td>ENQ-{enquiry.id.hex[:6].upper()}</td>
                </tr>
                <tr>
                    <td class="label">Travel Date:</td>
                    <td>{travel_date}</td>
                    <td class="label">Generated On:</td>
                    <td>{today}</td>
                </tr>
                <tr>
                    <td class="label">Guests:</td>
                    <td>{enquiry.travellers} Adults</td>
                    <td class="label">Validity:</td>
                    <td>7 Days from generation</td>
                </tr>
            </table>

            <p>Dear {enquiry.customer_name},<br/><br/>
            Thank you for your enquiry. We are pleased to provide you with the following personalized travel options for your upcoming trip.</p>
        """

        for pkg in packages:
            quoted_price = price_map.get(str(pkg.id), pkg.price_per_person)
            
            # Simple Inclusions/Exclusions logic (simplified for PDF)
            import json
            try:
                 inclusions = pkg.included_items if isinstance(pkg.included_items, list) else json.loads(pkg.included_items or '[]')
                 exclusions = pkg.excluded_items if isinstance(pkg.excluded_items, list) else json.loads(pkg.excluded_items or '[]')
            except:
                 inclusions = []
                 exclusions = []

            html += f"""
            <div class="package-section">
                <div class="package-title">{pkg.title} - {pkg.destination}</div>
                
                <div class="section-header">Package Highlights</div>
                <ul>
                    {" ".join([f"<li>{h}</li>" for h in inclusions[:5]])}
                </ul>

                <div class="section-header">Itinerary Details ({pkg.duration_days} Days / {pkg.duration_nights} Nights)</div>
            """
            
            # Day-wise Itinerary
            for item in pkg.itinerary_items:
                html += f"""
                <div class="itinerary-day">
                    <span class="day-number">Day {item.day_number}:</span> {item.title}<br/>
                    <small>{item.description[:300] if len(item.description) > 300 else item.description}...</small>
                </div>
                """

            # Pricing Table
            total_for_guests = float(quoted_price) * enquiry.travellers
            html += f"""
                <div class="section-header">Quote Pricing</div>
                <table class="pricing-table">
                    <tr>
                        <th>Item</th>
                        <th>Details</th>
                        <th>Amount</th>
                    </tr>
                    <tr>
                        <td>Quoted Price (per person)</td>
                        <td>For {enquiry.travellers} Guests</td>
                        <td>INR {float(quoted_price):,.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="2">Total Quote Amount</td>
                        <td>INR {total_for_guests:,.2f}</td>
                    </tr>
                </table>
                <p><small>* Prices including applicable taxes. Quoted price is specific to this offer and may vary if booked later.</small></p>

                <div class="section-header">Inclusions & Exclusions</div>
                <table style="width:100%">
                    <tr>
                        <td style="width:50%; vertical-align:top;">
                            <div style="font-weight:bold; margin-bottom:5px;">What's Included:</div>
                            <ul class="inclusion-list">
                                {" ".join([f'<li class="inclusion-item"><span class="check">✓</span> {i}</li>' for i in inclusions])}
                            </ul>
                        </td>
                        <td style="width:50%; vertical-align:top;">
                            <div style="font-weight:bold; margin-bottom:5px;">What's Not Included:</div>
                            <ul class="inclusion-list">
                                {" ".join([f'<li class="inclusion-item"><span class="cross">✗</span> {e}</li>' for e in exclusions])}
                            </ul>
                        </td>
                    </tr>
                </table>
            </div>
            """

        html += f"""
            <div class="footer">
                <p>This quote is valid for 7 days from the date of issue. Availability is not guaranteed until booking is confirmed.</p>
                <div style="font-weight:bold; font-size:16px; margin-top:10px;">To confirm your booking, reply to this email or call us at {agent_profile.phone or ''}</div>
                <p>© 2026 {agency_name} | Powered by TourSaaS</p>
            </div>
        </body>
        </html>
        """
        return html

pdf_service = PDFService()

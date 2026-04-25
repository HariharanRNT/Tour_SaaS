import os
import json
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
        """Build the HTML string for the PDF with a modern design."""
        import os
        import json
        
        # Map quoted prices for easy lookup
        price_map = {str(item['packageId']): item['quotedPrice'] for item in quoted_data}
        
        agency_name = agent_profile.agency_name or "Your Travel Agency"
        agency_contact = f"{agent_profile.phone or ''} | {agent_profile.user.email}"
        agency_address = agent_profile.business_address or ""
        
        # Logo handling (similar to invoice_service)
        company_logo_url = ""
        if agent_profile.homepage_settings:
            custom_logo = agent_profile.homepage_settings.get("navbar_logo_image")
            if custom_logo:
                company_logo_url = custom_logo
        
        # Standard logo fallback and xhtml2pdf protocol fix
        if not company_logo_url:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            logo_path = os.path.join(current_dir, "..", "..", "static", "logo.png")
            if os.path.exists(logo_path):
                company_logo_url = "file:///" + os.path.abspath(logo_path).replace("\\", "/")
        elif not company_logo_url.startswith(("http://", "https://", "file://")):
            # If it's a relative path from static, resolve it
            if company_logo_url.startswith("/static/"):
                current_dir = os.path.dirname(os.path.abspath(__file__))
                local_path = os.path.join(current_dir, "..", "..", company_logo_url.lstrip("/"))
                if os.path.exists(local_path):
                    company_logo_url = "file:///" + os.path.abspath(local_path).replace("\\", "/")

        today = datetime.now().strftime("%d %B %Y")
        travel_date = enquiry.travel_date.strftime("%d %B %Y")
        
        logo_html = f'<img src="{company_logo_url}" class="logo-img" />' if company_logo_url else f'<div class="agency-name">{agency_name}</div>'
        agency_name_html = f'<div class="agency-name">{agency_name}</div>' if company_logo_url else ''

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 0;
                }}
                body {{
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    color: #1f2937;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }}
                .header-container {{
                    background-color: #f8fafc;
                    padding: 30px 40px;
                    border-bottom: 4px solid #2563eb;
                }}
                .header-table {{
                    width: 100%;
                    border-collapse: collapse;
                }}
                .logo-cell {{
                    width: 50%;
                    vertical-align: middle;
                }}
                .agency-info-cell {{
                    width: 50%;
                    text-align: right;
                    vertical-align: middle;
                }}
                .logo-img {{
                    max-height: 60px;
                    max-width: 200px;
                }}
                .agency-name {{
                    font-size: 22px;
                    font-weight: bold;
                    color: #1e3a8a;
                    margin-bottom: 2px;
                }}
                .agency-details {{
                    font-size: 10px;
                    color: #64748b;
                }}
                
                .quote-banner {{
                    background-color: #1e3a8a;
                    color: white;
                    padding: 12px 40px;
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }}
                
                .summary-box {{
                    margin: 20px 40px;
                    padding: 15px;
                    background-color: #eff6ff;
                    border-radius: 10px;
                }}
                .summary-table {{
                    width: 100%;
                    border-collapse: collapse;
                }}
                .summary-table td {{
                    padding: 6px 10px;
                    font-size: 12px;
                }}
                .summary-label {{
                    color: #3b82f6;
                    font-weight: bold;
                    width: 110px;
                }}
                .summary-value {{
                    color: #1e293b;
                    font-weight: bold;
                }}
                
                .intro-text {{
                    padding: 0 40px;
                    font-size: 13px;
                    color: #475569;
                }}
                
                .package-container {{
                    margin: 30px 0;
                }}
                .package-header {{
                    background-color: #f1f5f9;
                    padding: 12px 40px;
                    border-left: 5px solid #2563eb;
                    margin-bottom: 15px;
                }}
                .package-title {{
                    font-size: 18px;
                    font-weight: bold;
                    color: #0f172a;
                }}
                .package-meta {{
                    font-size: 11px;
                    color: #64748b;
                    font-weight: bold;
                    margin-top: 3px;
                }}
                
                .section-title {{
                    margin: 20px 40px 10px 40px;
                    font-size: 14px;
                    font-weight: bold;
                    color: #2563eb;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 4px;
                }}
                
                .highlight-grid {{
                    margin: 10px 40px;
                }}
                .highlight-item {{
                    display: inline-block;
                    background-color: #f0fdf4;
                    color: #166534;
                    padding: 3px 10px;
                    border-radius: 15px;
                    font-size: 10px;
                    font-weight: bold;
                    margin: 3px;
                    border: 1px solid #bbf7d0;
                }}
                
                .itinerary-container {{
                    margin: 10px 40px;
                }}
                .itinerary-day {{
                    margin-bottom: 12px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed #e2e8f0;
                }}
                .day-badge {{
                    background-color: #2563eb;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: bold;
                    margin-right: 8px;
                }}
                .day-title {{
                    font-size: 13px;
                    font-weight: bold;
                    color: #1e293b;
                }}
                .day-desc {{
                    font-size: 11px;
                    color: #64748b;
                    margin-top: 4px;
                    display: block;
                }}
                
                .pricing-container {{
                    margin: 15px 40px;
                }}
                .pricing-table {{
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #e2e8f0;
                }}
                .pricing-table th {{
                    background-color: #f8fafc;
                    padding: 10px;
                    text-align: left;
                    font-size: 11px;
                    color: #64748b;
                    border-bottom: 2px solid #e2e8f0;
                }}
                .pricing-table td {{
                    padding: 10px;
                    font-size: 12px;
                    border-bottom: 1px solid #e2e8f0;
                }}
                .price-total-row {{
                    background-color: #f0f9ff;
                }}
                .total-label {{
                    font-weight: bold;
                    color: #1e3a8a;
                    font-size: 14px;
                }}
                .total-amount {{
                    font-weight: 800;
                    color: #2563eb;
                    font-size: 16px;
                    text-align: right;
                }}
                
                .inc-exc-container {{
                    margin: 15px 40px;
                }}
                .inc-exc-table {{
                    width: 100%;
                    border-collapse: collapse;
                }}
                .inc-exc-cell {{
                    width: 50%;
                    vertical-align: top;
                    padding: 8px;
                }}
                .inc-box {{
                    background-color: #f0fdf4;
                    padding: 12px;
                    border-radius: 6px;
                    border: 1px solid #dcfce7;
                }}
                .exc-box {{
                    background-color: #fef2f2;
                    padding: 12px;
                    border-radius: 6px;
                    border: 1px solid #fee2e2;
                }}
                .inc-title {{ color: #15803d; font-weight: bold; font-size: 12px; margin-bottom: 6px; }}
                .exc-title {{ color: #b91c1c; font-weight: bold; font-size: 12px; margin-bottom: 6px; }}
                .inc-list {{ padding-left: 15px; margin: 0; }}
                .inc-list li {{ font-size: 10px; color: #374151; margin-bottom: 3px; }}
                
                .footer-container {{
                    margin-top: 40px;
                    padding: 30px 40px;
                    background-color: #1e293b;
                    color: #cbd5e1;
                    text-align: center;
                }}
                .footer-contact {{
                    font-size: 14px;
                    font-weight: bold;
                    color: white;
                    margin-bottom: 8px;
                }}
                .footer-text {{
                    font-size: 10px;
                    margin-bottom: 10px;
                    line-height: 1.6;
                }}
                .powered-by {{
                    font-size: 9px;
                    opacity: 0.6;
                }}
            </style>
        </head>
        <body>
            <div class="header-container">
                <table class="header-table">
                    <tr>
                        <td class="logo-cell">
                            {logo_html}
                        </td>
                        <td class="agency-info-cell">
                            {agency_name_html}
                            <div class="agency-details">
                                {agency_address}<br/>
                                {agency_contact}
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="quote-banner">Personalized Travel Quote</div>
            
            <div class="summary-box">
                <table class="summary-table">
                    <tr>
                        <td class="summary-label">PREPARED FOR</td>
                        <td class="summary-value">{enquiry.customer_name}</td>
                        <td class="summary-label">QUOTE REF</td>
                        <td class="summary-value">ENQ-{enquiry.id.hex[:6].upper()}</td>
                    </tr>
                    <tr>
                        <td class="summary-label">TRAVEL DATE</td>
                        <td class="summary-value">{travel_date}</td>
                        <td class="summary-label">ISSUE DATE</td>
                        <td class="summary-value">{today}</td>
                    </tr>
                    <tr>
                        <td class="summary-label">GUESTS</td>
                        <td class="summary-value">{enquiry.travellers} Adults</td>
                        <td class="summary-label">VALIDITY</td>
                        <td class="summary-value">7 Days</td>
                    </tr>
                </table>
            </div>
            
            <div class="intro-text">
                <p>Dear <strong>{enquiry.customer_name}</strong>,</p>
                <p>It was a pleasure connecting with you. Based on your travel preferences, we have curated the following exclusive travel packages. Each itinerary has been designed to provide an unforgettable experience.</p>
            </div>
        """

        for idx, pkg in enumerate(packages):
            quoted_price = price_map.get(str(pkg.id), pkg.price_per_person)
            
            # Inclusions/Exclusions logic
            try:
                 inclusions = pkg.included_items if isinstance(pkg.included_items, list) else json.loads(pkg.included_items or '[]')
                 exclusions = pkg.excluded_items if isinstance(pkg.excluded_items, list) else json.loads(pkg.excluded_items or '[]')
            except:
                 inclusions = []
                 exclusions = []

            # Page break for subsequent packages
            page_break = 'style="page-break-before: always;"' if idx > 0 else ""

            html += f"""
            <div class="package-container" {page_break}>
                <div class="package-header">
                    <div class="package-title">{pkg.title}</div>
                    <div class="package-meta">{pkg.destination.upper()} &bull; {pkg.duration_days} DAYS &bull; {pkg.duration_nights} NIGHTS</div>
                </div>
                
                <div class="section-title">Package Highlights</div>
                <div class="highlight-grid">
                    {" ".join([f'<span class="highlight-item">{h}</span>' for h in inclusions[:8]])}
                </div>

                <div class="section-title">Daily Itinerary</div>
                <div class="itinerary-container">
            """
            
            # Day-wise Itinerary
            for item in pkg.itinerary_items:
                desc = item.description[:400] + "..." if len(item.description) > 400 else item.description
                html += f"""
                <div class="itinerary-day">
                    <span class="day-badge">DAY {item.day_number}</span>
                    <span class="day-title">{item.title}</span>
                    <span class="day-desc">{desc}</span>
                </div>
                """

            # Pricing Table
            total_for_guests = float(quoted_price) * enquiry.travellers
            html += f"""
                </div>

                <div class="section-title">Investment Details</div>
                <div class="pricing-container">
                    <table class="pricing-table">
                        <tr>
                            <th>Description</th>
                            <th style="text-align: center;">Quantity</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                        <tr>
                            <td>{pkg.title} - Full Package for {pkg.duration_days} Days</td>
                            <td style="text-align: center;">{enquiry.travellers}</td>
                            <td style="text-align: right;">INR {float(quoted_price):,.2f}</td>
                            <td style="text-align: right;">INR {total_for_guests:,.2f}</td>
                        </tr>
                        <tr class="price-total-row">
                            <td colspan="2" class="total-label">Total Professional Fee</td>
                            <td colspan="2" class="total-amount">INR {total_for_guests:,.2f}</td>
                        </tr>
                    </table>
                    <p style="font-size: 10px; color: #94a3b8; margin-top: 8px;">* Prices are inclusive of all applicable taxes. All rates are subject to availability at the time of booking.</p>
                </div>

                <div class="section-title">Standard Terms</div>
                <div class="inc-exc-container">
                    <table class="inc-exc-table">
                        <tr>
                            <td class="inc-exc-cell">
                                <div class="inc-box">
                                    <div class="inc-title">WHAT'S INCLUDED</div>
                                    <ul class="inc-list">
                                        {" ".join([f'<li>{i}</li>' for i in inclusions])}
                                    </ul>
                                </div>
                            </td>
                            <td class="inc-exc-cell">
                                <div class="exc-box">
                                    <div class="exc-title">WHAT'S NOT INCLUDED</div>
                                    <ul class="inc-list">
                                        {" ".join([f'<li>{e}</li>' for e in exclusions])}
                                    </ul>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            """

        html += f"""
            <div class="footer-container">
                <div class="footer-contact">Ready to explore? Contact us today!</div>
                <div class="footer-text">
                    For bookings and inquiries, please reach out to us at <strong>{agent_profile.phone or ''}</strong> 
                    or email <strong>{agent_profile.user.email}</strong>.<br/>
                    This quote is valid for 7 days. Availability of packages is subject to change.
                </div>
                <div class="footer-text">
                    &copy; 2026 {agency_name}. All rights reserved.
                </div>
                
            </div>
        </body>
        </html>
        """
        return html

pdf_service = PDFService()

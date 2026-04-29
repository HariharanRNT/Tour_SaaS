import os
import logging
import base64
from io import BytesIO
from datetime import datetime
from xhtml2pdf import pisa

logger = logging.getLogger(__name__)

class InvoiceService:
    @staticmethod
    def _get_base64_fonts():
        """
        Loads Noto Sans fonts and returns them in base64 for embedding.
        """
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            fonts_dir = os.path.join(current_dir, "..", "static", "fonts")
            
            reg_path = os.path.join(fonts_dir, "NotoSans-Regular.ttf")
            bold_path = os.path.join(fonts_dir, "NotoSans-Bold.ttf")
            
            fonts = {"regular": "", "bold": ""}
            
            if os.path.exists(reg_path):
                with open(reg_path, "rb") as f:
                    fonts["regular"] = base64.b64encode(f.read()).decode("utf-8")
            
            if os.path.exists(bold_path):
                with open(bold_path, "rb") as f:
                    fonts["bold"] = base64.b64encode(f.read()).decode("utf-8")
                    
            return fonts
        except Exception as e:
            logger.error(f"Failed to load fonts for Base64 embedding: {e}")
            return {"regular": "", "bold": ""}
    @staticmethod
    def generate_invoice_pdf(subscription, user, payment_id: str) -> bytes:
        """
        Generates a PDF invoice for the given subscription.
        Returns bytes of the PDF.
        """
        
        # Data Preparation
        plan = subscription.plan
        base_price = float(plan.price)
        gst_rate = 0.18
        gst_amount = base_price * gst_rate
        total_amount = base_price + gst_amount
        invoice_date = datetime.now().strftime("%d-%b-%Y")
        invoice_number = f"INV-{str(subscription.id)[:8].upper()}"
        
        # Use local path for reliability
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up one level from 'services' to 'app', then to 'static'
        logo_path = os.path.join(current_dir, "..", "static", "logo.png")
        # Ensure path is absolute for xhtml2pdf
        company_logo_url = os.path.abspath(logo_path) 
        
        if not os.path.exists(company_logo_url):
            logger.warning(f"Logo not found at {company_logo_url}")
            company_logo_url = "" 

        # HTML Template
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Helvetica, sans-serif; color: #333; }}
                .header {{ display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }}
                .logo {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
                .invoice-details {{ text-align: right; }}
                .client-info {{ margin-bottom: 30px; }}
                table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
                th {{ background-color: #f8fafc; text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }}
                td {{ padding: 12px; border-bottom: 1px solid #eee; }}
                .total-row {{ font-weight: bold; }}
                .footer {{ margin-top: 50px; text-align: center; color: #777; font-size: 10px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">
                    <img src="{company_logo_url}" alt="Logo" style="height: 50px;" />
                </div>
                <div class="invoice-details">
                    <h1>INVOICE</h1>
                    <p><strong>Invoice #:</strong> {invoice_number}</p>
                    <p><strong>Date:</strong> {invoice_date}</p>
                    <p><strong>Transaction ID:</strong> {payment_id}</p>
                </div>
            </div>

            <div class="client-info">
                <table style="width: 100%; border: none; margin-bottom: 0;">
                    <tr>
                        <td style="border: none; vertical-align: top; width: 50%;">
                            <h3>Bill From:</h3>
                            <p><strong>Hariharan R</strong><br>hariharan@reshandthosh.com<br>Resh and Thosh pvt Ltd<br>Chennai - 600043, India</p>
                        </td>
                        <td style="border: none; vertical-align: top; width: 50%;">
                             <h3>Bill To:</h3>
                             <p><strong>{user.first_name} {user.last_name}</strong><br>{user.email}</p>
                        </td>
                    </tr>
                </table>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Billing Cycle</th>
                        <th style="text-align: right;">Amount INR</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>{plan.name} Subscription</strong><br>
                            <span style="font-size: 12px; color: #666;">
                                Validity: {subscription.start_date} to {subscription.end_date}
                            </span>
                        </td>
                        <td>{plan.billing_cycle}</td>
                        <td style="text-align: right;">{base_price:.2f}</td>
                    </tr>
                </tbody>
            </table>

            <table style="width: 50%; margin-left: auto;">
                <tr>
                    <td style="border: none;">Subtotal</td>
                    <td style="text-align: right; border: none;">INR {base_price:.2f}</td>
                </tr>
                <tr>
                    <td style="border: none;">GST (18%)</td>
                    <td style="text-align: right; border: none;">INR {gst_amount:.2f}</td>
                </tr>
                <tr class="total-row">
                    <td style="border-top: 2px solid #333; font-size: 16px;">Total</td>
                    <td style="text-align: right; border-top: 2px solid #333; font-size: 16px;">INR {total_amount:.2f}</td>
                </tr>
            </table>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Resh and Thosh pvt Ltd, featherlite, pallavaram, Chennai - 600043, India</p>
                <p>GSTIN: 29AAAAA0000A1Z5</p>
            </div>
        </body>
        </html>
        """

        # Convert to PDF
        buffer = BytesIO()
        pisa_status = pisa.CreatePDF(src=html_template, dest=buffer, encoding='utf-8')
        
        if pisa_status.err:
            logger.error(f"Subscription Invoice PDF generation failed: {pisa_status.err}")
            return None
            
        return buffer.getvalue()

    @staticmethod
    def generate_booking_invoice_pdf(booking, user) -> bytes:
        """
        Generates a professionally redesigned PDF invoice for a booking.
        Returns bytes of the PDF.
        """
        logger.info(f"Generating booking invoice PDF for booking {booking.booking_reference}")
        
        try:
            # Data Preparation
            package = booking.package
            agent = booking.agent
            agent_profile = getattr(agent, 'agent_profile', None) if agent else None
            
            total_amount = float(booking.total_amount)
            
            # Determine GST Settings (Package-specific first, then Agent defaults)
            gst_applicable = True
            gst_percentage = 18.0
            gst_mode = 'inclusive'
            
            if package:
                # Package specific overrides
                if package.gst_applicable is not None:
                    gst_applicable = package.gst_applicable
                
                if package.gst_percentage is not None:
                    gst_percentage = float(package.gst_percentage)
                elif agent_profile:
                    gst_percentage = float(agent_profile.gst_percentage)
                
                if package.gst_mode:
                    gst_mode = package.gst_mode
                elif agent_profile:
                    gst_mode = 'inclusive' if agent_profile.gst_inclusive else 'exclusive'
            elif agent_profile:
                # Fallback to Agent defaults
                gst_applicable = agent_profile.gst_applicable
                gst_percentage = float(agent_profile.gst_percentage)
                gst_mode = 'inclusive' if agent_profile.gst_inclusive else 'exclusive'

            # Calculate Split
            if not gst_applicable or gst_percentage == 0:
                base_price = total_amount
                gst_amount = 0.0
                display_gst_rate = 0
            else:
                if gst_mode == 'inclusive':
                    base_price = total_amount / (1 + (gst_percentage / 100))
                    gst_amount = total_amount - base_price
                else:
                    # If it was exclusive, total_amount already includes it
                    base_price = total_amount / (1 + (gst_percentage / 100))
                    gst_amount = total_amount - base_price
                    # Note: For exclusive packages, the booking.total_amount stored in DB 
                    # SHOULD already be the total (Base + GST). 
                    # So the math to derive base from total is the same as inclusive 
                    # once the total is known.
                display_gst_rate = gst_percentage
            
            # Format Date
            if booking.created_at:
                invoice_date = booking.created_at.strftime("%d %b %Y")
            elif hasattr(booking, 'booking_date') and booking.booking_date:
                invoice_date = booking.booking_date.strftime("%d %b %Y")
            else:
                invoice_date = datetime.now().strftime("%d %b %Y")
            
            invoice_number = f"INV-BK-{str(booking.id)[:8].upper()}"
            booking_ref = booking.booking_reference
            
            # Load Fonts for Base64 embedding
            font_data = InvoiceService._get_base64_fonts()
            font_reg_b64 = font_data["regular"]
            font_bold_b64 = font_data["bold"]

            # Helper for INR formatting with Indian Numbering System
            def format_inr(number):
                base, dec = "{:.2f}".format(number).split(".")
                if len(base) <= 3:
                    res = base
                else:
                    res = base[-3:]
                    rem = base[:-3]
                    while len(rem) > 2:
                        res = rem[-2:] + "," + res
                        rem = rem[:-2]
                    res = rem + "," + res
                # Replace symbol with INR as requested
                return f"INR {res}.{dec}"

            # Status Badge Logic
            status = "PENDING"
            badge_bg = "#FEF3C7"  # amber-100
            badge_text = "#D97706" # amber-600
            
            if booking.payment_status in ["PAID", "SUCCEEDED"]:
                status = "PAID"
                badge_bg = "#DCFCE7"  # green-100
                badge_text = "#16A34A" # green-600
            elif booking.status == "CANCELLED":
                status = "CANCELLED"
                badge_bg = "#FEE2E2"  # red-100
                badge_text = "#DC2626" # red-600

            # Biller Details (Agent)
            bill_from_name = "RNT Travel"
            bill_from_address = "Chennai, Tamil Nadu"
            bill_from_city = ""
            bill_from_gst = "N/A"
            bill_from_email = "hariharan@rnt.com"
            company_logo_url = ""

            if agent:
                 # Custom logo from agent profile
                 if agent_profile and agent_profile.homepage_settings and isinstance(agent_profile.homepage_settings, dict):
                      custom_logo = agent_profile.homepage_settings.get("navbar_logo_image")
                      if custom_logo:
                          company_logo_url = custom_logo
                 
                 bill_from_name = agent.agency_name or agent.company_legal_name or f"{agent.first_name} {agent.last_name}" or bill_from_name
                 bill_from_address = agent.business_address or bill_from_address
                 
                 city = agent.city or ""
                 state = agent.state or ""
                 country = agent.country or ""
                 location_parts = [p for p in [city, state, country] if p]
                 bill_from_city = ", ".join(location_parts)
                 
                 bill_from_gst = agent.gst_no or "N/A"
                 bill_from_email = agent.email or bill_from_email

            # Standard logo fallback and xhtml2pdf protocol fix
            if not company_logo_url:
                current_dir = os.path.dirname(os.path.abspath(__file__))
                logo_path = os.path.join(current_dir, "..", "static", "logo.png")
                company_logo_url = os.path.abspath(logo_path)
                if os.path.exists(company_logo_url):
                    if not company_logo_url.startswith(("http://", "https://", "file://")):
                        company_logo_url = "file:///" + company_logo_url.replace("\\", "/")
                else:
                    company_logo_url = ""

            # Correct Traveler Labeling
            travelers_count = booking.number_of_travelers
            travelers_label = f"{travelers_count} {'Traveler' if travelers_count == 1 else 'Travelers'}"
            duration_str = f"{package.duration_days}D / {package.duration_nights}N" if package else "N/A"
            
            # HTML Template
            html_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    /* ✅ Embed font directly using Base64 — following user recommended strategy */
                    @font-face {{
                        font-family: 'NotoSans';
                        src: url('data:font/truetype;base64,{font_reg_b64}') format('truetype');
                        font-weight: 400;
                        font-style: normal;
                    }}
                    @font-face {{
                        font-family: 'NotoSans';
                        src: url('data:font/truetype;base64,{font_bold_b64}') format('truetype');
                        font-weight: 700;
                        font-style: normal;
                    }}

                    @page {{
                        size: A4;
                        margin: 15mm;
                    }}
                    
                    /* Apply NotoSans globally and fix character spacing/digit spacing */
                    * {{
                        font-family: 'NotoSans', sans-serif !important;
                        letter-spacing: 0 !important;
                        word-spacing: 0 !important;
                    }}
                    
                    body {{
                        color: #4A4A6A;
                        font-size: 11px;
                        line-height: 1.2;
                        margin: 0;
                        padding: 0;
                    }}
                    .primary-color {{ color: #E8600A; }}
                    .dark-color {{ color: #1A1A2E; }}
                    
                    /* Header Styles */
                    .header-table {{
                        width: 100%;
                        margin-bottom: 15px;
                    }}
                    .logo-container {{
                        width: 50%;
                        vertical-align: top;
                    }}
                    .logo-img {{
                        max-width: 120px;
                        max-height: 50px;
                    }}
                    .invoice-info {{
                        width: 50%;
                        text-align: right;
                        vertical-align: top;
                    }}
                    .invoice-title {{
                        font-size: 24px;
                        font-weight: bold;
                        color: #1A1A2E;
                        margin: 0;
                        display: block;
                    }}
                    .status-badge {{
                        display: inline-block;
                        padding: 2px 10px;
                        border-radius: 10px;
                        font-size: 9px;
                        font-weight: bold;
                        background-color: {badge_bg};
                        color: {badge_text};
                        text-transform: uppercase;
                        margin: 4px 0;
                    }}
                    .info-text {{
                        font-size: 11px;
                        margin: 1px 0;
                    }}
                    
                    /* Billing Section */
                    .billing-section {{
                        width: 100%;
                        margin-bottom: 15px;
                        border-top: 1px solid #E8E8F0;
                        padding-top: 12px;
                    }}
                    .section-head {{
                        font-size: 9px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1.2px;
                        color: #E8600A;
                        margin-bottom: 6px;
                    }}
                    .billing-table {{
                        width: 100%;
                    }}
                    .billing-col {{
                        width: 50%;
                        vertical-align: top;
                    }}
                    .address-line {{
                        margin: 2px 0;
                        line-height: 1.4;
                    }}
                    .address-name {{
                        font-size: 13px;
                        font-weight: bold;
                        color: #1A1A2E;
                        margin-bottom: 4px;
                    }}
                    
                    /* Table Styles */
                    .details-table {{
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                    }}
                    .details-table th {{
                        background-color: #FFF4ED;
                        color: #E8600A;
                        text-transform: uppercase;
                        font-size: 9px;
                        font-weight: bold;
                        text-align: left;
                        padding: 8px 12px;
                        border-bottom: 1px solid #E8E8F0;
                    }}
                    .details-table td {{
                        padding: 10px 12px;
                        border-bottom: 1px solid #E8E8F0;
                        vertical-align: top;
                    }}
                    .col-description {{ width: 32%; }}
                    .col-details {{ width: 32%; }}
                    .col-duration {{ width: 18%; white-space: nowrap; }}
                    .col-amount {{ width: 18%; text-align: right; white-space: nowrap; }}
 
                    .pkg-name {{
                        font-weight: bold;
                        color: #1A1A2E;
                        font-size: 12px;
                        margin-bottom: 2px;
                    }}
                    .dest-name {{
                        color: #4A4A6A;
                        font-size: 10px;
                    }}
                    .amount-text {{
                        font-size: 12px;
                        white-space: nowrap;
                        text-align: right;
                    }}
                    
                    /* Totals Section */
                    .totals-table {{
                        width: 200px;
                        margin-left: auto;
                        border-collapse: collapse;
                    }}
                    .totals-table td {{
                        padding: 3px 0;
                    }}
                    .total-label {{
                        text-align: left;
                        color: #4A4A6A;
                    }}
                    .total-value {{
                        text-align: right;
                    }}
                    .grand-total-row td {{
                        padding-top: 8px;
                        border-top: 1px solid #E8E8F0;
                    }}
                    .grand-total-label {{
                        font-size: 13px;
                        font-weight: bold;
                        color: #1A1A2E;
                    }}
                    .grand-total-value {{
                        font-size: 16px;
                        font-weight: bold;
                        color: #1A1A2E;
                    }}
                    
                    /* Footer */
                    .footer {{
                        margin-top: 30px;
                        padding-top: 12px;
                        border-top: 1px solid #E8E8F0;
                        text-align: center;
                        color: #4A4A6A;
                    }}
                    .footer p {{
                        margin: 1px 0;
                    }}
                    .footer-main {{
                        font-weight: bold;
                        color: #E8600A;
                        margin-bottom: 4px !important;
                    }}
                </style>
            </head>
            <body>
                <!-- Header -->
                <table class="header-table">
                    <tr>
                        <td class="logo-container">
                            {f'<img src="{company_logo_url}" class="logo-img" />' if company_logo_url else f'<h2 class="primary-color">{bill_from_name}</h2>'}
                        </td>
                        <td class="invoice-info">
                            <div><span class="invoice-title">INVOICE</span></div>
                            <div><span class="status-badge">{status}</span></div>
                            <p class="info-text"><strong>Invoice #:</strong> {invoice_number}</p>
                            <p class="info-text"><strong>Date:</strong> {invoice_date}</p>
                            <p class="info-text"><strong>Booking Ref:</strong> {booking_ref}</p>
                        </td>
                    </tr>
                </table>
 
                <!-- Billing Info -->
                <div class="billing-section">
                    <table class="billing-table">
                        <tr>
                            <td class="billing-col">
                                <div class="section-head">Bill From</div>
                                <div class="address-name">{bill_from_name}</div>
                                <div class="address-line">{bill_from_address}</div>
                                <div class="address-line">{bill_from_city}</div>
                                <div class="address-line">GSTIN: {bill_from_gst}</div>
                                <div class="address-line">{bill_from_email}</div>
                            </td>
                            <td class="billing-col">
                                <div class="section-head">Bill To</div>
                                <div class="address-name">{user.first_name} {user.last_name}</div>
                                <div class="address-line">{user.email}</div>
                                {f'<div class="address-line">{getattr(user, "phone", "")}</div>' if getattr(user, "phone", None) else ''}
                            </td>
                        </tr>
                    </table>
                </div>
 
                <!-- Booking Details Table -->
                <div class="section-head" style="margin-left: 12px;">Booking Details</div>
                <table class="details-table">
                    <thead>
                        <tr>
                            <th class="col-description">Description</th>
                            <th class="col-details">Details</th>
                            <th class="col-duration">Duration</th>
                            <th class="col-amount">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="col-description">
                                <div class="pkg-name">{package.title if package else "Custom Trip"}</div>
                                <div class="dest-name">{package.destination if package else booking.flight_origin or "Multiple Destinations"}</div>
                            </td>
                            <td class="col-details">
                                <div>Travel: {booking.travel_date.strftime("%d %b %Y")}</div>
                                <div>{travelers_label}</div>
                            </td>
                            <td class="col-duration">
                                {duration_str}
                            </td>
                            <td class="col-amount amount-text">{format_inr(base_price)}</td>
                        </tr>
                    </tbody>
                </table>
 
                <!-- Totals Section -->
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 60%;"></td>
                        <td style="width: 40%;">
                            <table class="totals-table">
                                <tr>
                                    <td class="total-label">Subtotal</td>
                                    <td class="total-value amount-text">{format_inr(base_price)}</td>
                                </tr>
                                <tr>
                                    <td class="total-label">GST ({display_gst_rate}%)</td>
                                    <td class="total-value amount-text">{format_inr(gst_amount)}</td>
                                </tr>
                                <tr class="grand-total-row">
                                    <td class="grand-total-label">TOTAL</td>
                                    <td class="grand-total-value amount-text">{format_inr(total_amount)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <div class="footer">
                    <p class="footer-main">Thank you for choosing {bill_from_name}!</p>
                    <p>Support: {bill_from_email}</p>
                    <p style="font-size: 8px; opacity: 0.7; margin-top: 8px;">This is a computer-generated invoice and does not require a physical signature.</p>
                </div>
            </body>
            </html>
            """

            # Convert to PDF
            buffer = BytesIO()
            # xhtml2pdf handles the conversion
            pisa_status = pisa.CreatePDF(src=html_template, dest=buffer, encoding='utf-8')
            
            if pisa_status.err:
                logger.error(f"Booking Invoice PDF generation failed for booking {booking.id}: {pisa_status.err}")
                return None
                
            return buffer.getvalue()
        except Exception as e:
            logger.error(f"Exception during Booking Invoice PDF generation for booking {booking.id}: {e}", exc_info=True)
            return None

import os
import logging
from io import BytesIO
from datetime import datetime
from xhtml2pdf import pisa

logger = logging.getLogger(__name__)

class InvoiceService:
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
                        <th style="text-align: right;">Amount (INR)</th>
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
                    <td style="text-align: right; border: none;">{base_price:.2f}</td>
                </tr>
                <tr>
                    <td style="border: none;">GST (18%)</td>
                    <td style="text-align: right; border: none;">{gst_amount:.2f}</td>
                </tr>
                <tr class="total-row">
                    <td style="border-top: 2px solid #333; font-size: 16px;">Total</td>
                    <td style="text-align: right; border-top: 2px solid #333; font-size: 16px;">{total_amount:.2f}</td>
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
        Generates a PDF invoice for a booking.
        Returns bytes of the PDF.
        """
        logger.info(f"Generating booking invoice PDF for booking {booking.booking_reference}")
        
        try:
            # Data Preparation
            package = booking.package
            total_amount = float(booking.total_amount)
            base_price = total_amount / 1.18 # reverse calc GST
            gst_amount = total_amount - base_price
            
            if booking.created_at:
                invoice_date = booking.created_at.strftime("%d-%b-%Y")
            elif hasattr(booking, 'booking_date') and booking.booking_date:
                invoice_date = booking.booking_date.strftime("%d-%b-%Y")
            else:
                invoice_date = datetime.now().strftime("%d-%b-%Y")
            invoice_number = f"INV-BK-{str(booking.id)[:8].upper()}"
            
            # Use local path for reliability
            current_dir = os.path.dirname(os.path.abspath(__file__))
            logo_path = os.path.join(current_dir, "..", "static", "logo.png")
            company_logo_url = os.path.abspath(logo_path) 
            
            if not os.path.exists(company_logo_url):
                logger.warning(f"Default logo not found at {company_logo_url}")
                company_logo_url = "" 
            else:
                # xhtml2pdf works best with file:/// protocol for local files on Windows
                if not company_logo_url.startswith(("http://", "https://", "file://")):
                    company_logo_url = "file:///" + company_logo_url.replace("\\", "/")

            # Helper to safely get agent details
            agent = booking.agent
            bill_from_name = "TourSaaS Travels"
            bill_from_address = "123 Travel Road"
            bill_from_city = "Chennai - 600001, India"
            bill_from_gst = "N/A"
            bill_from_email = "support@toursaas.com"

            if agent:
                 # Check if agent has agent_profile and homepage_settings
                 agent_profile = getattr(agent, 'agent_profile', None)
                 if agent_profile and agent_profile.homepage_settings and isinstance(agent_profile.homepage_settings, dict):
                      custom_logo = agent_profile.homepage_settings.get("navbar_logo_image")
                      if custom_logo:
                          company_logo_url = custom_logo
                         
                 bill_from_name = agent.agency_name or agent.company_legal_name or f"{agent.first_name} {agent.last_name}" or bill_from_name
                 bill_from_address = agent.business_address or bill_from_address
                 
                 city = agent.city or "Chennai"
                 state = agent.state or "Tamil Nadu"
                 country = agent.country or "India"
                 bill_from_city = f"{city} - {state}, {country}"
                 
                 bill_from_gst = agent.gst_no or bill_from_gst
                 bill_from_email = agent.email or bill_from_email

            # Prepare logo HTML safely
            logo_html = f'<img src="{company_logo_url}" alt="{bill_from_name}" style="height: 50px;" />' if company_logo_url else f'<span>{bill_from_name}</span>'

            # HTML Template (Reused style, updated content)
            html_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Helvetica, sans-serif; color: #333; font-size: 12px; }}
                    .logo {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
                    .invoice-details {{ text-align: right; }}
                    .client-info {{ margin-bottom: 30px; }}
                    table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
                    th {{ background-color: #f8fafc; text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }}
                    td {{ padding: 12px; border-bottom: 1px solid #eee; }}
                    .total-row {{ font-weight: bold; }}
                    .footer {{ margin-top: 50px; text-align: center; color: #777; font-size: 10px; }}
                    /* Use table for layout instead of flex */
                    .layout-table {{ width: 100%; border: none; margin-bottom: 40px; border-bottom: 2px solid #eee; }}
                    .layout-table td {{ border: none; padding-bottom: 20px; vertical-align: middle; }}
                </style>
            </head>
            <body>
                <table class="layout-table">
                    <tr>
                        <td style="width: 50%;">
                            <div class="logo">
                               {logo_html}
                            </div>
                        </td>
                        <td style="width: 50%; text-align: right;">
                            <div class="invoice-details">
                                <h1>INVOICE</h1>
                                <p><strong>Invoice #:</strong> {invoice_number}</p>
                                <p><strong>Date:</strong> {invoice_date}</p>
                                <p><strong>Booking Ref:</strong> {booking.booking_reference}</p>
                            </div>
                        </td>
                    </tr>
                </table>

                <div class="client-info">
                    <table style="width: 100%; border: none; margin-bottom: 0;">
                        <tr>
                            <td style="border: none; vertical-align: top; width: 50%;">
                                <h3>Bill From:</h3>
                                <p>
                                    <strong>{bill_from_name}</strong><br>
                                    {bill_from_address}<br>
                                    {bill_from_city}<br>
                                    GSTIN: {bill_from_gst}<br>
                                    Email: {bill_from_email}
                                </p>
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
                            <th>Details</th>
                            <th style="text-align: right;">Amount (INR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <strong>{package.title}</strong><br>
                                <span style="font-size: 12px; color: #666;">
                                    {package.destination} | {package.duration_days}D/{package.duration_nights}N
                                </span>
                            </td>
                            <td>
                                Travel Date: {booking.travel_date}<br>
                                Travelers: {booking.number_of_travelers}
                            </td>
                            <td style="text-align: right;">{base_price:.2f}</td>
                        </tr>
                    </tbody>
                </table>

                <table style="width: 50%; margin-left: auto;">
                    <tr>
                        <td style="border: none;">Subtotal</td>
                        <td style="text-align: right; border: none;">{base_price:.2f}</td>
                    </tr>
                    <tr>
                        <td style="border: none;">GST (18%)</td>
                        <td style="text-align: right; border: none;">{gst_amount:.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td style="border-top: 2px solid #333; font-size: 16px;">Total</td>
                        <td style="text-align: right; border-top: 2px solid #333; font-size: 16px;">{total_amount:.2f}</td>
                    </tr>
                </table>

                <div class="footer">
                    <p>Thank you for choosing {bill_from_name}!</p>
                    <p>This is a computer generated invoice.</p>
                </div>
            </body>
            </html>
            """

            # Convert to PDF
            buffer = BytesIO()
            pisa_status = pisa.CreatePDF(src=html_template, dest=buffer, encoding='utf-8')
            
            if pisa_status.err:
                logger.error(f"Booking Invoice PDF generation failed for booking {booking.id}: {pisa_status.err}")
                return None
                
            return buffer.getvalue()
        except Exception as e:
            logger.error(f"Exception during Booking Invoice PDF generation for booking {booking.id}: {e}", exc_info=True)
            return None

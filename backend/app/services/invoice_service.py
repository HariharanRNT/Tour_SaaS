from xhtml2pdf import pisa
from io import BytesIO
from datetime import datetime
import logging

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
        invoice_number = f"INV-{subscription.id[:8].upper()}"
        
import os

# ...

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
            # Fallback or just empty string to avoid crash, or keep placeholder
            print(f"Logo not found at {company_logo_url}")
            company_logo_url = "" # Template should handle missing image gracefully or we hide it

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
        pisa_status = pisa.CreatePDF(src=html_template, dest=buffer)
        
        if pisa_status.err:
            logger.error(f"Invoice PDF generation failed: {pisa_status.err}")
            return None
            
        return buffer.getvalue()

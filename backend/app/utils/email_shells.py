from typing import Dict, Any

def get_booking_confirmation_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">{c.get('hero_title', '')}</h1>
                <p style="opacity: 0.8; margin-top: 8px; font-size: 14px;">{c.get('hero_subtitle', '')}</p>
            </div>
            <div style="padding: 30px; color: #334155;">
                <p style="line-height: 1.6;">{c.get('intro_text', '')}</p>
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #f1f5f9;">
                    <h2 style="margin-top: 0; font-size: 16px; color: #1e293b;">{c.get('details_title', '')}</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #64748b;">Reference ID:</td><td style="text-align: right; font-weight: bold;">{{{{booking_reference}}}}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Package:</td><td style="text-align: right; font-weight: bold;">{{{{package_name}}}}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Travel Date:</td><td style="text-align: right; font-weight: bold;">{{{{travel_date}}}}</td></tr>
                    </table>
                </div>
                <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
                    <p style="margin: 0;"><span>{c.get('footer_note', '')}</span><br><strong>{c.get('footer_team', '')}</strong></p>
                </div>
            </div>
        </div>
    """

def get_travel_itinerary_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white;">
            <div style="background: #1e293b; padding: 25px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 22px;">{c.get('hero_title', '')}</h1>
                <p style="opacity: 0.8; margin-top: 5px; font-size: 14px;">{c.get('hero_subtitle', '')}</p>
            </div>
            <div style="padding: 30px; color: #334155;">
                <p style="line-height: 1.6;">{c.get('intro_text', '')}</p>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; font-style: italic; color: #475569;">{{{{itinerary_summary}}}}</p>
                </div>
                <p style="font-size: 14px;">{c.get('attachment_note', '')}</p>
                <p style="font-weight: bold; color: #1e293b;">{c.get('closing_text', '')}</p>
                <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; pt: 20px;">
                    <p>© {{{{agency_name}}}}. All rights reserved.</p>
                </div>
            </div>
        </div>
    """

def get_booking_invoice_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; background: white;">
            <table style="width: 100%; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
                <tr>
                    <td><h1 style="margin: 0; color: #1e293b; font-size: 28px;">{c.get('invoice_title', '')}</h1></td>
                    <td style="text-align: right; color: #64748b; font-size: 13px;">
                        <strong>{{{{agency_name}}}}</strong><br>
                        Invoice #: {{{{invoice_number}}}}<br>
                        Date: {{{{payment_date}}}}
                    </td>
                </tr>
            </table>
            <div style="margin-bottom: 30px;">
                <p style="color: #64748b; margin-bottom: 5px; font-size: 13px;">{c.get('bill_to_label', '')}</p>
                <strong style="font-size: 18px;">{{{{customer_name}}}}</strong>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f8fafc;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">{c.get('details_title', '')}</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">Booking Ref: {{{{booking_reference}}}}</td>
                        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #f1f5f9;">₹{{{{total_amount}}}}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">{c.get('total_label', '')}</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold; color: #2563eb; font-size: 20px;">₹{{{{total_amount}}}}</td>
                    </tr>
                </tfoot>
            </table>
            <p style="font-size: 13px; color: #64748b; margin-top: 40px;">{c.get('attachment_note', '')}</p>
        </div>
    """

def get_payment_receipt_shell(c: Dict[str, Any]) -> str:
    payment_receipt = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; background-color: white; padding: 40px; color: #334155;">
        <p style="margin-top: 0; font-size: 16px;">{c.get('hero_title', 'Hi {{customer_name}},')}</p>
        <p style="line-height: 1.6; margin-bottom: 25px; white-space: pre-line;">{c.get('intro_text', 'Your payment has been successfully received.')}</p>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">
        
        <h3 style="color: #1e293b; font-size: 17px; margin-bottom: 15px;">{c.get('details_title', '📌 Payment Summary')}</h3>
        <div style="padding-left: 20px;">
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 2;">
                <li><strong>Reference ID:</strong> {{{{booking_reference}}}}</li>
                <li><strong>Package:</strong> {{{{package_name}}}}</li>
                <li><strong>Amount Paid:</strong> ₹{{{{amount_paid}}}}</li>
                <li><strong>Payment Method:</strong> {{{{payment_method}}}}</li>
                <li><strong>Payment Date:</strong> {{{{payment_date}}}}</li>
            </ul>
        </div>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">

        <h3 style="color: #1e293b; font-size: 17px; margin-bottom: 10px;">{c.get('invoice_note_title', '📄 Invoice Attached')}</h3>
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line;">{c.get('invoice_note_text', 'Please find your invoice attached.')}</p>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">

        <h3 style="color: #1e293b; font-size: 17px; margin-bottom: 10px;">{c.get('important_note_title', '🧾 Important Note')}</h3>
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 25px; color: #64748b; white-space: pre-line;">{c.get('important_note_text', '')}</p>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">

        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line;">{c.get('footer_note', 'Thank you for choosing us.')}</p>
        <p style="font-size: 14px; margin: 0; white-space: pre-line; font-weight: bold;">{c.get('footer_team', 'RNT Travel Team')}</p>
        <div style="margin-top: 10px; font-size: 13px;">
            <p style="margin: 3px 0; color: #2563eb;">📧 {{{{agent_email}}}}</p>
            <p style="margin: 3px 0; color: #2563eb;">📞 {{{{agent_phone}}}}</p>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            <p>© RNT Travel. This is an automated notification.</p>
        </div>
    </div>
    """
    return payment_receipt

def get_booking_cancellation_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-top: 4px solid #ef4444; padding: 30px; background: white;">
            <h1 style="color: #991b1b; margin-top: 0; font-size: 24px;">{c.get('hero_title', '')}</h1>
            <p style="color: #334155; line-height: 1.6;">{c.get('intro_text', '')}</p>
            <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #fee2e2;">
                <p style="margin: 0; color: #991b1b; font-weight: bold;">{c.get('details_title', '')}</p>
                <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold;">₹{{{{refund_amount}}}}</p>
                <p style="margin: 5px 0 0; font-size: 14px; color: #b91c1c;">{c.get('summary_label', '')}</p>
            </div>
            <p style="color: #334155;">{c.get('closing_text', '')}</p>
            <div style="margin-top: 30px; font-size: 14px; color: #64748b; border-top: 1px solid #f1f5f9; pt: 20px;">
                <p style="margin: 0;"><span>{c.get('footer_note', '')}</span><br><strong>{c.get('footer_team', '')}</strong></p>
            </div>
        </div>
    """

def get_trip_reminder_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #eff6ff; border-radius: 12px; padding: 40px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 20px;">✈️</div>
            <h1 style="color: #1e40af; margin: 0; font-size: 28px;">{c.get('hero_title', '')}</h1>
            <p style="color: #1e3a8a; font-size: 18px; margin-top: 10px;">{c.get('hero_subtitle', '')}</p>
            <div style="background-color: white; border-radius: 12px; padding: 30px; margin: 30px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: left; color: #334155;">
                <p style="margin-top: 0; line-height: 1.6;">{c.get('intro_text', '')}</p>
                <p style="font-size: 20px; font-weight: bold; color: #2563eb; text-align: center; background: #f8fafc; padding: 15px; border-radius: 8px;">{{{{departure_date}}}}</p>
                <p style="margin-bottom: 10px;">{c.get('message_text', '')}</p>
                <p style="margin: 0; font-weight: bold;">{{{{agent_name}}}} | {{{{agent_contact}}}}</p>
            </div>
            <p style="font-size: 12px; color: #64748b;">{c.get('footer_note', '')}</p>
        </div>
    """

EMAIL_SHELLS = {
    "booking_confirmation": get_booking_confirmation_shell,
    "travel_itinerary": get_travel_itinerary_shell,
    "booking_invoice": get_booking_invoice_shell,
    "payment_receipt": get_payment_receipt_shell,
    "booking_cancellation": get_booking_cancellation_shell,
    "trip_reminder": get_trip_reminder_shell
}

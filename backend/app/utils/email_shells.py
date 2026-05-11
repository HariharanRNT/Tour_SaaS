from typing import Dict, Any

def get_booking_confirmation_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0;">
                <tr>
                    <td align="center" style="background-color: #1e293b; padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px;">
                        <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, sans-serif;">{c.get('hero_title', '')}</h1>
                        <p style="margin-top: 8px; margin-bottom: 0; font-size: 14px; color: #ffffff; opacity: 0.8; font-family: Arial, sans-serif;">{c.get('hero_subtitle', '')}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px;">
                        <p style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 25px;">{c.get('intro_text', '')}</p>
                        
                        <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-collapse: collapse;">
                            <tr>
                                <td>
                                    <h2 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #000000; font-family: Arial, sans-serif;">{c.get('details_title', '')}</h2>
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                        <tr>
                                            <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Reference ID:</td>
                                            <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{booking_reference}}}}</td>
                                        </tr>
                                        <tr>
                                            <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Package:</td>
                                            <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{package_name}}}}</td>
                                        </tr>
                                        <tr>
                                            <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Travel Date:</td>
                                            <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{travel_date}}}}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                            <p style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                                <span>{c.get('footer_note', '')}</span><br>
                                <strong>{c.get('footer_team', '')}</strong>
                            </p>
                        </div>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    """

def get_travel_itinerary_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr>
                    <td align="center" style="background-color: #1e293b; padding: 25px;">
                        <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, sans-serif;">{c.get('hero_title', '')}</h1>
                        <p style="opacity: 0.8; margin-top: 5px; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">{c.get('hero_subtitle', '')}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 30px;">
                        <p style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('intro_text', '')}</p>
                        <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f1f5f9; margin-top: 20px; margin-bottom: 20px; border-collapse: collapse;">
                            <tr>
                                <td style="font-style: italic; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{itinerary_summary}}}}</td>
                            </tr>
                        </table>
                        <p style="font-size: 14px; color: #000000; font-family: Arial, sans-serif;">{c.get('attachment_note', '')}</p>
                        <p style="font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('closing_text', '')}</p>
                        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-family: Arial, sans-serif;">© {{{{agency_name}}}}. All rights reserved.</p>
                        </div>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    """

def get_booking_invoice_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr>
                    <td>
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 2px solid #000000; padding-bottom: 20px; border-collapse: collapse; margin-bottom: 30px;">
                            <tr>
                                <td align="left"><h1 style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 28px;">{c.get('invoice_title', '')}</h1></td>
                                <td align="right" style="color: #000000; font-family: Arial, sans-serif; font-size: 13px;">
                                    <strong>{{{{agency_name}}}}</strong><br>
                                    Invoice #: {{{{invoice_number}}}}<br>
                                    Date: {{{{payment_date}}}}
                                </td>
                            </tr>
                        </table>

                        <div style="margin-bottom: 30px;">
                            <p style="color: #000000; margin-top: 0; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 13px;">{c.get('bill_to_label', '')}</p>
                            <strong style="font-size: 18px; color: #000000; font-family: Arial, sans-serif;">{{{{customer_name}}}}</strong>
                        </div>

                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <thead>
                                <tr style="background-color: #f8fafc;">
                                    <th align="left" style="padding-top: 12px; padding-bottom: 12px; padding-left: 12px; border-bottom: 1px solid #e2e8f0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('details_title', '')}</th>
                                    <th align="right" style="padding-top: 12px; padding-bottom: 12px; padding-right: 12px; border-bottom: 1px solid #e2e8f0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td align="left" style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Booking Ref: {{{{booking_reference}}}}</td>
                                    <td align="right" style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">₹{{{{total_amount}}}}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td align="right" style="padding: 12px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('total_label', '')}</td>
                                    <td align="right" style="padding: 12px; font-weight: bold; color: #2563eb; font-size: 20px; font-family: Arial, sans-serif;">₹{{{{total_amount}}}}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <p style="font-size: 13px; color: #000000; margin-top: 40px; font-family: Arial, sans-serif;">{c.get('attachment_note', '')}</p>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    """

def get_payment_receipt_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr>
                    <td>
                        <p style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #000000; font-family: Arial, sans-serif;">{c.get('hero_title', 'Hi {{customer_name}},')}</p>
                        <p style="line-height: 1.6; margin-bottom: 25px; white-space: pre-line; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('intro_text', 'Your payment has been successfully received.')}</p>
                        
                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">
                        
                        <h3 style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 15px; font-family: Arial, sans-serif;">{c.get('details_title', '📌 Payment Summary')}</h3>
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Reference ID:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{booking_reference}}}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Package:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{package_name}}}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Amount Paid:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;">₹{{{{amount_paid}}}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Payment Method:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{payment_method}}}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Payment Date:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{payment_date}}}}</td>
                            </tr>
                        </table>

                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">

                        <h3 style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 10px; font-family: Arial, sans-serif;">{c.get('invoice_note_title', '📄 Invoice Attached')}</h3>
                        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line; color: #000000; font-family: Arial, sans-serif;">{c.get('invoice_note_text', 'Please find your invoice attached.')}</p>

                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">

                        <h3 style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 10px; font-family: Arial, sans-serif;">{c.get('important_note_title', '🧾 Important Note')}</h3>
                        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 25px; color: #000000; font-family: Arial, sans-serif;">{c.get('important_note_text', '')}</p>

                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">

                        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line; color: #000000; font-family: Arial, sans-serif;">{c.get('footer_note', 'Thank you for choosing us.')}</p>
                        <p style="font-size: 14px; margin: 0; white-space: pre-line; font-weight: bold; color: #000000; font-family: Arial, sans-serif;">{c.get('footer_team', 'RNT Travel Team')}</p>
                        <div style="margin-top: 10px; font-size: 13px; font-family: Arial, sans-serif;">
                            <p style="margin-top: 3px; margin-bottom: 3px; color: #2563eb;">📧 {{{{agent_email}}}}</p>
                            <p style="margin-top: 3px; margin-bottom: 3px; color: #2563eb;">📞 {{{{agent_phone}}}}</p>
                        </div>

                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; font-family: Arial, sans-serif;">
                            <p style="margin: 0;">© RNT Travel. This is an automated notification.</p>
                        </div>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    """

def get_booking_cancellation_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="30" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #fee2e2; border-top: 4px solid #ef4444;">
                <tr>
                    <td>
                        <h1 style="color: #991b1b; margin-top: 10px; margin-bottom: 15px; font-size: 24px; font-family: Arial, sans-serif;">{c.get('hero_title', '')}</h1>
                        <p style="color: #334155; line-height: 1.6; font-family: Arial, sans-serif; font-size: 14px;">{c.get('intro_text', '')}</p>
                        <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fee2e2; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;">
                            <tr>
                                <td>
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                        <tr>
                                            <td align="left"><p style="margin: 0; color: #991b1b; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;">{c.get('details_title', '')}</p></td>
                                            <td align="right"><p style="margin: 0; font-size: 24px; font-weight: bold; color: #000000; font-family: Arial, sans-serif;">₹{{{{refund_amount}}}}</p></td>
                                        </tr>
                                    </table>
                                    <p style="margin-top: 5px; margin-bottom: 0; font-size: 14px; color: #b91c1c; font-family: Arial, sans-serif;">{c.get('summary_label', '')}</p>
                                </td>
                            </tr>
                        </table>
                        <p style="color: #334155; font-family: Arial, sans-serif; font-size: 14px;">{c.get('closing_text', '')}</p>
                        <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <p style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                                <span>{c.get('footer_note', '')}</span><br>
                                <strong>{c.get('footer_team', '')}</strong>
                            </p>
                        </div>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    """

def get_trip_reminder_shell(c: Dict[str, Any]) -> str:
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #eff6ff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; text-align: center;">
                <tr>
                    <td>
                        <div style="font-size: 48px; margin-bottom: 20px;">✈️</div>
                        <h1 style="color: #1e40af; margin-top: 0; margin-bottom: 0; font-size: 28px; font-family: Arial, sans-serif;">{c.get('hero_title', '')}</h1>
                        <p style="color: #1e3a8a; font-size: 18px; margin-top: 10px; margin-bottom: 30px; font-family: Arial, sans-serif;">{c.get('hero_subtitle', '')}</p>
                        <table width="100%" border="0" cellpadding="30" cellspacing="0" style="background-color: #ffffff; border-collapse: collapse; text-align: left;">
                            <tr>
                                <td>
                                    <p style="margin-top: 0; margin-bottom: 20px; line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('intro_text', '')}</p>
                                    <table width="100%" border="0" cellpadding="15" cellspacing="0" style="background-color: #f8fafc; border-collapse: collapse; margin-bottom: 20px;">
                                        <tr>
                                            <td align="center" style="font-size: 20px; font-weight: bold; color: #2563eb; font-family: Arial, sans-serif;">{{{{departure_date}}}}</td>
                                        </tr>
                                    </table>
                                    <p style="margin-top: 20px; margin-bottom: 10px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('message_text', '')}</p>
                                    <p style="margin: 0; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{agent_name}}}} | {{{{agent_contact}}}}</p>
                                </td>
                            </tr>
                        </table>
                        <p style="font-size: 12px; color: #000000; font-family: Arial, sans-serif; margin: 0;">{c.get('footer_note', '')}</p>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
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

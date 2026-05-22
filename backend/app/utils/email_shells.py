from typing import Dict, Any

def nl_to_p(text: str, style: str = "margin:0; padding:0;") -> str:
    if not text:
        return ""
    import re

    # Normalize <br> to newlines
    text = re.sub(r'<br\s*/?>', '\n', text)

    lines = text.split('\n')
    paragraphs = []

    for line in lines:
        # Do NOT strip — only rstrip trailing whitespace
        content = line.rstrip()
        if content or content == '':
            if content.strip():
                # Has real content — wrap in <p>, preserve leading &nbsp;
                paragraphs.append(
                    f'<p style="{style} margin-top:0; '
                    f'margin-bottom:8px; padding:0;">{content}</p>'
                )
            else:
                # Empty line — spacer
                paragraphs.append(
                    '<p style="margin:0; padding:0; '
                    'font-size:14px; line-height:1;">&nbsp;</p>'
                )

    if not paragraphs:
        return text

    if len(paragraphs) == 1:
        # Single line — return content directly without <p> wrapper
        return lines[0].rstrip()

    return "".join(paragraphs)

def get_booking_confirmation_shell(c: Dict[str, Any]) -> str:
    preheader = c.get('hero_subtitle', 'Your booking is confirmed.')
    invisible_filler = ('&zwnj;&nbsp;' * 20)
    return f"""
        <!-- PREHEADER: forces inbox preview text -->
        <div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">{preheader} {invisible_filler}</div>

        <!--[if mso]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->

        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <tr>
                <td width="100%" align="center" style="width: 100%; background-color: #ffffff; font-family: Arial, sans-serif;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #f1f5f9; border-collapse: collapse;">
                        <tr>
                            <td align="center" style="padding-top:20px; padding-bottom:20px; padding-left:20px; padding-right:20px; font-family:Arial,sans-serif; background-color:#ffffff;">

                                <!--[if mso]>
                                <p style="margin:0; font-family:Arial,sans-serif; font-size:20px; font-weight:bold; color:#1e293b; text-align:center;">
                                    {{{{agency_name}}}}
                                </p>
                                <![endif]-->

                                <!--[if !mso]><!-->
                                <img src="{c.get('header_image_url', 'https://toursaas.s3.us-east-1.amazonaws.com/logo.png')}"
                                     height="{c.get('header_image_height', '40px').replace('px','')}"
                                     width="auto"
                                     border="0"
                                     style="height:{c.get('header_image_height','40px')}; width:auto; max-width:200px; display:block; margin:0 auto; outline:none; text-decoration:none;"
                                     alt="{{{{agency_name}}}}" />
                                <!--<![endif]-->

                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td width="100%" bgcolor="#1e293b" align="center" style="width: 100%; background-color: #1e293b; padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px; font-family: Arial, sans-serif;">
                    <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, sans-serif;">{c.get('hero_title', 'Booking Confirmed!')}</h1>
                    <p style="margin-top: 8px; margin-bottom: 0; font-size: 14px; color: #ffffff; opacity: 0.8; font-family: Arial, sans-serif;">{c.get('hero_subtitle', '')}</p>
                </td>
            </tr>
            <tr>
                <td width="100%" style="width: 100%; padding-top: 25px; padding-bottom: 25px; padding-left: 30px; padding-right: 30px; line-height: 1.6; mso-line-height-rule: exactly; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                    {nl_to_p(c.get('intro_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0;')}
                </td>
            </tr>
            <tr>
                <td width="100%" style="width: 100%; padding-top: 0; padding-bottom: 30px; padding-left: 30px; padding-right: 30px; font-family: Arial, sans-serif;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border: 1px solid #f1f5f9; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; font-family: Arial, sans-serif;">
                                <h2 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #000000; font-family: Arial, sans-serif;">{c.get('details_title', '📌 Trip Details')}</h2>
                                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td width="50%" align="left" style="width: 50%; padding-top: 8px; padding-bottom: 8px; color: #555555; font-family: Arial, sans-serif; font-size: 14px;">Reference ID:</td>
                                        <td width="50%" align="right" style="width: 50%; padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #111111; font-family: Arial, sans-serif; font-size: 14px;">{{{{booking_reference}}}}</td>
                                    </tr>
                                    <tr>
                                        <td width="50%" align="left" style="width: 50%; padding-top: 8px; padding-bottom: 8px; color: #555555; font-family: Arial, sans-serif; font-size: 14px;">Package:</td>
                                        <td width="50%" align="right" style="width: 50%; padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #111111; font-family: Arial, sans-serif; font-size: 14px;">{{{{package_name}}}}</td>
                                    </tr>
                                    <tr>
                                        <td width="50%" align="left" style="width: 50%; padding-top: 8px; padding-bottom: 8px; color: #555555; font-family: Arial, sans-serif; font-size: 14px;">Travel Date:</td>
                                        <td width="50%" align="right" style="width: 50%; padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #111111; font-family: Arial, sans-serif; font-size: 14px;">{{{{travel_date}}}}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 30px; border-top: 1px solid #e2e8f0; border-collapse: collapse;">
                        <tr>
                            <td width="100%" align="center" style="width: 100%; padding-top: 20px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                                {nl_to_p(c.get('footer_note', 'Warm regards,'), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0;')}
                                <p style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                                    <strong>{c.get('footer_team', 'The Team')}</strong>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    """

def get_travel_itinerary_shell(c: Dict[str, Any]) -> str:
    preheader = c.get('hero_subtitle', 'Your travel itinerary is ready.')
    invisible_filler = ('&zwnj;&nbsp;' * 20)
    return f"""
        <!-- PREHEADER: forces inbox preview text -->
        <div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">{preheader} {invisible_filler}</div>

        <!--[if mso]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->

        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <tr>
                <td width="100%" bgcolor="#1e293b" align="center" style="width: 100%; background-color: #1e293b; padding-top: 25px; padding-bottom: 25px; padding-left: 25px; padding-right: 25px; font-family: Arial, sans-serif;">
                    <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, sans-serif;">{c.get('hero_title', 'Your Travel Itinerary')}</h1>
                    <p style="margin-top: 5px; margin-bottom: 0; font-size: 14px; color: #ffffff; opacity: 0.8; font-family: Arial, sans-serif;">{c.get('hero_subtitle', '')}</p>
                </td>
            </tr>
            <tr>
                <td width="100%" style="width: 100%; padding-top: 25px; padding-bottom: 25px; padding-left: 30px; padding-right: 30px; line-height: 1.6; mso-line-height-rule: exactly; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                    {nl_to_p(c.get('intro_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0;')}
                </td>
            </tr>
            <tr>
                <td width="100%" style="width: 100%; padding-top: 0; padding-bottom: 30px; padding-left: 30px; padding-right: 30px; font-family: Arial, sans-serif;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f1f5f9; margin-top: 20px; margin-bottom: 20px; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; font-style: italic; color: #000000; font-family: Arial, sans-serif; font-size: 14px; mso-line-height-rule: exactly;">{{{{itinerary_summary}}}}</td>
                        </tr>
                    </table>
                    {nl_to_p(c.get('attachment_note', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0; margin-bottom:15px;')}
                    {nl_to_p(c.get('closing_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; font-weight:bold; margin:0;')}
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 40px; border-top: 1px solid #f1f5f9; border-collapse: collapse;">
                        <tr>
                            <td width="100%" align="center" style="width: 100%; padding-top: 20px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                                <p style="margin: 0; font-size: 12px; color: #64748b; font-family: Arial, sans-serif;">{c.get('copyright_text', '© {{agency_name}}. All rights reserved.')}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    """

def get_booking_invoice_shell(c: Dict[str, Any]) -> str:
    preheader = 'Your booking invoice is attached.'
    invisible_filler = ('&zwnj;&nbsp;' * 20)
    return f"""
        <!-- PREHEADER: forces inbox preview text -->
        <div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">{preheader} {invisible_filler}</div>

        <!--[if mso]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->

        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <tr>
                <td width="100%" style="width: 100%; padding-top: 40px; padding-bottom: 40px; padding-left: 40px; padding-right: 40px; font-family: Arial, sans-serif;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 2px solid #000000; border-collapse: collapse;">
                        <tr>
                            <td width="50%" align="left" style="width: 50%; padding-bottom: 20px; font-family: Arial, sans-serif;"><h1 style="margin: 0; color: #000000; font-size: 28px; font-family: Arial, sans-serif;">{c.get('invoice_title', 'INVOICE')}</h1></td>
                            <td width="50%" align="right" style="width: 50%; padding-bottom: 20px; color: #000000; font-size: 13px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                                <strong>{{{{agency_name}}}}</strong><br>
                                Invoice #: {{{{invoice_number}}}}<br>
                                Date: {{{{payment_date}}}}
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 30px; margin-bottom: 30px; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-family: Arial, sans-serif;">
                                <p style="color: #000000; margin-top: 0; margin-bottom: 5px; font-size: 13px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">{c.get('bill_to_label', 'Bill To:')}</p>
                                <strong style="font-size: 18px; color: #000000; font-family: Arial, sans-serif;">{{{{customer_name}}}}</strong>
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr bgcolor="#f8fafc" style="background-color: #f8fafc;">
                                <th width="70%" align="left" style="width: 70%; padding-top: 12px; padding-bottom: 12px; padding-left: 12px; border-bottom: 1px solid #e2e8f0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{c.get('details_title', 'Description')}</th>
                                <th width="30%" align="right" style="width: 30%; padding-top: 12px; padding-bottom: 12px; padding-right: 12px; border-bottom: 1px solid #e2e8f0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td width="70%" align="left" style="width: 70%; padding-top: 12px; padding-bottom: 12px; padding-left: 12px; border-bottom: 1px solid #f1f5f9; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Booking Ref: {{{{booking_reference}}}}</td>
                                <td width="30%" align="right" style="width: 30%; padding-top: 12px; padding-bottom: 12px; padding-right: 12px; border-bottom: 1px solid #f1f5f9; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">₹{{{{total_amount}}}}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td width="70%" align="right" style="width: 70%; padding-top: 12px; padding-bottom: 12px; padding-right: 12px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px; mso-line-height-rule: exactly;">{c.get('total_label', 'Total Amount:')}</td>
                                <td width="30%" align="right" style="width: 30%; padding-top: 12px; padding-bottom: 12px; padding-right: 12px; font-weight: bold; color: #2563eb; font-size: 20px; font-family: Arial, sans-serif;">₹{{{{total_amount}}}}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 40px; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                                {nl_to_p(c.get('attachment_note', ''), 'font-family:Arial,sans-serif; font-size:13px; color:#000000; margin:0;')}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    """

def get_payment_receipt_shell(c: Dict[str, Any]) -> str:
    preheader = 'Your payment has been received successfully.'
    invisible_filler = ('&zwnj;&nbsp;' * 20)
    return f"""
        <!-- PREHEADER: forces inbox preview text -->
        <div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">{preheader} {invisible_filler}</div>

        <!--[if mso]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->

        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <tr>
                <td width="100%" style="width: 100%; padding-top: 40px; padding-bottom: 40px; padding-left: 40px; padding-right: 40px; font-family: Arial, sans-serif;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; padding-top: 10px; padding-bottom: 15px; font-size: 16px; color: #000000; font-family: Arial, sans-serif;">{c.get('hero_title', 'Hi {{customer_name}},')}</td>
                        </tr>
                    </table>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; line-height: 1.6; mso-line-height-rule: exactly; padding-bottom: 25px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{nl_to_p(c.get('intro_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0;')}</td>
                        </tr>
                    </table>
                    
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;"><tr><td width="100%" style="width: 100%; font-family: Arial, sans-serif;">&nbsp;</td></tr></table>
                    
                    <h3 style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 15px; font-family: Arial, sans-serif;">{c.get('details_title', '📌 Payment Summary')}</h3>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="50%" align="left" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Reference ID:</strong></td>
                            <td width="50%" align="right" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{booking_reference}}}}</td>
                        </tr>
                        <tr>
                            <td width="50%" align="left" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Package:</strong></td>
                            <td width="50%" align="right" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{package_name}}}}</td>
                        </tr>
                        <tr>
                            <td width="50%" align="left" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Amount Paid:</strong></td>
                            <td width="50%" align="right" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;">₹{{{{amount_paid}}}}</td>
                        </tr>
                        <tr>
                            <td width="50%" align="left" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Payment Method:</strong></td>
                            <td width="50%" align="right" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{payment_method}}}}</td>
                        </tr>
                        <tr>
                            <td width="50%" align="left" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Payment Date:</strong></td>
                            <td width="50%" align="right" style="width: 50%; padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{{{payment_date}}}}</td>
                        </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;"><tr><td width="100%" style="width: 100%; font-family: Arial, sans-serif;">&nbsp;</td></tr></table>

                    <h3 style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 10px; font-family: Arial, sans-serif;">{c.get('invoice_note_title', '📄 Invoice Attached')}</h3>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-size: 14px; line-height: 1.6; mso-line-height-rule: exactly; padding-bottom: 20px; color: #000000; font-family: Arial, sans-serif;">{nl_to_p(c.get('invoice_note_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0;')}</td>
                        </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;"><tr><td width="100%" style="width: 100%; font-family: Arial, sans-serif;">&nbsp;</td></tr></table>

                    <h3 style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 10px; font-family: Arial, sans-serif;">{c.get('important_note_title', '🧾 Important Note')}</h3>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-size: 14px; line-height: 1.6; mso-line-height-rule: exactly; padding-bottom: 25px; color: #000000; font-family: Arial, sans-serif;">{nl_to_p(c.get('important_note_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0;')}</td>
                        </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;"><tr><td width="100%" style="width: 100%; font-family: Arial, sans-serif;">&nbsp;</td></tr></table>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-size: 14px; line-height: 1.6; mso-line-height-rule: exactly; padding-bottom: 20px; color: #000000; font-family: Arial, sans-serif;">{c.get('footer_note', '')}</td>
                        </tr>
                        <tr>
                            <td width="100%" style="width: 100%; font-size: 14px; padding-bottom: 10px; color: #000000; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">{c.get('footer_team', 'Warm regards,')}</td>
                        </tr>
                    </table>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-family: Arial, sans-serif; font-size: 13px; mso-line-height-rule: exactly;">
                                <p style="margin-top: 3px; margin-bottom: 3px; color: #2563eb;">📧 {{{{agent_email}}}}</p>
                                <p style="margin-top: 3px; margin-bottom: 3px; color: #2563eb;">📞 {{{{agent_phone}}}}</p>
                            </td>
                        </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-family: Arial, sans-serif; font-size: 11px; color: #94a3b8; mso-line-height-rule: exactly;">
                                <p style="margin: 0;">{c.get('copyright_text', '© RNT Travel. This is an automated notification.')}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    """

def get_booking_cancellation_shell(c: Dict[str, Any]) -> str:
    preheader = 'Your booking cancellation details.'
    invisible_filler = ('&zwnj;&nbsp;' * 20)
    return f"""
        <!-- PREHEADER: forces inbox preview text -->
        <div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">{preheader} {invisible_filler}</div>

        <!--[if mso]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->

        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse; border: 1px solid #fee2e2; border-top: 4px solid #ef4444;">
            <tr>
                <td width="100%" style="width: 100%; padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px; font-family: Arial, sans-serif;">
                    <h1 style="color: #991b1b; margin-top: 10px; margin-bottom: 15px; font-size: 24px; font-family: Arial, sans-serif;">{c.get('hero_title', 'Booking Cancelled')}</h1>
                    {nl_to_p(c.get('intro_text', ''), 'color: #334155; line-height: 1.6; font-family: Arial, sans-serif; font-size: 14px; margin:0; margin-bottom:25px;')}
                    
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fef2f2; border: 1px solid #fee2e2; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;">
                        <tr>
                            <td width="100%" bgcolor="#fef2f2" style="width: 100%; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; font-family: Arial, sans-serif;">
                                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td width="50%" align="left" style="width: 50%; font-family: Arial, sans-serif;"><p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">{c.get('details_title', 'Refund Details:')}</p></td>
                                        <td width="50%" align="right" style="width: 50%; font-family: Arial, sans-serif;"><p style="margin: 0; font-size: 24px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">₹{{{{refund_amount}}}}</p></td>
                                    </tr>
                                </table>
                                <p style="margin-top: 5px; margin-bottom: 0; font-size: 14px; color: #b91c1c; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">{c.get('summary_label', '')}</p>
                            </td>
                        </tr>
                    </table>
                    
                    {nl_to_p(c.get('closing_text', ''), 'color: #334155; font-family: Arial, sans-serif; font-size: 14px; margin:0; margin-bottom:30px;')}
                    
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #f1f5f9; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; padding-top: 20px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                                {nl_to_p(c.get('footer_note', 'Best regards,'), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0;')}
                                <p style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                                    <strong>{c.get('footer_team', 'The Team')}</strong>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    """

def get_trip_reminder_shell(c: Dict[str, Any]) -> str:
    preheader = c.get('hero_subtitle', 'Your trip is coming up soon!')
    invisible_filler = ('&zwnj;&nbsp;' * 20)
    return f"""
        <!-- PREHEADER: forces inbox preview text -->
        <div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">{preheader} {invisible_filler}</div>

        <!--[if mso]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->

        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse; text-align: center;">
            <tr>
                <td width="100%" bgcolor="#eff6ff" style="width: 100%; background-color: #eff6ff; padding-top: 40px; padding-bottom: 40px; padding-left: 40px; padding-right: 40px; font-family: Arial, sans-serif;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="100%" align="center" style="width: 100%; font-size: 48px; padding-bottom: 20px; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">✈️</td>
                        </tr>
                    </table>
                    <h1 style="color: #1e40af; margin-top: 0; margin-bottom: 0; font-size: 28px; font-family: Arial, sans-serif;">{c.get('hero_title', 'Get Ready!')}</h1>
                    <p style="color: #1e3a8a; font-size: 18px; margin-top: 10px; margin-bottom: 0; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">{c.get('hero_subtitle', '')}</p>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #ffffff; margin-top: 30px; margin-bottom: 30px; border-collapse: collapse;">
                        <tr>
                            <td width="100%" align="left" style="width: 100%; padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px; font-family: Arial, sans-serif;">
                                {nl_to_p(c.get('intro_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0; margin-bottom:20px;')}
                                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border-collapse: collapse;">
                                    <tr>
                                        <td width="100%" align="center" style="width: 100%; padding-top: 15px; padding-bottom: 15px; padding-left: 15px; padding-right: 15px; font-size: 20px; font-weight: bold; color: #2563eb; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">{{{{departure_date}}}}</td>
                                    </tr>
                                </table>
                                {nl_to_p(c.get('message_text', ''), 'font-family:Arial,sans-serif; font-size:14px; color:#000000; margin:0; margin-bottom:10px;')}
                                <p style="margin: 0; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px; mso-line-height-rule: exactly;">{{{{agent_name}}}} | {{{{agent_contact}}}}</p>
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td width="100%" style="width: 100%; font-size: 12px; color: #000000; font-family: Arial, sans-serif; margin: 0; mso-line-height-rule: exactly;">{nl_to_p(c.get('footer_note', ''), 'font-family:Arial,sans-serif; font-size:12px; color:#000000; margin:0;')}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    """

EMAIL_SHELLS = {
    "booking_confirmation": get_booking_confirmation_shell,
    "travel_itinerary": get_travel_itinerary_shell,
    "booking_invoice": get_booking_invoice_shell,
    "payment_receipt": get_payment_receipt_shell,
    "booking_cancellation": get_booking_cancellation_shell,
    "trip_reminder": get_trip_reminder_shell
}

import { EmailTemplateType } from "./email-variables";

export const DEFAULT_TEMPLATES: Record<EmailTemplateType, string> = {
    booking_confirmation: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0;">
            <tr>
                <td align="center" style="background-color: #1e293b; padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px;">
                    <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, sans-serif;">Booking Confirmed!</h1>
                    <p style="margin-top: 8px; margin-bottom: 0; font-size: 14px; color: #ffffff; opacity: 0.8; font-family: Arial, sans-serif;">Your adventure with {{agency_name}} begins soon.</p>
                </td>
            </tr>
            <tr>
                <td style="padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px;">
                    <p style="margin-top: 0; margin-bottom: 15px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Hi <strong>{{customer_name}}</strong>,</p>
                    <p style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 25px;">We're thrilled to confirm your booking for <strong>{{package_name}}</strong>. Our team is already preparing everything for your perfect trip.</p>
                    
                    <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-collapse: collapse;">
                        <tr>
                            <td>
                                <h2 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #1e293b; font-family: Arial, sans-serif;">📌 Trip Details</h2>
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #64748b; font-family: Arial, sans-serif; font-size: 14px;">Reference ID:</td>
                                        <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #1e293b; font-family: Arial, sans-serif; font-size: 14px;">{{booking_reference}}</td>
                                    </tr>
                                    <tr>
                                        <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #64748b; font-family: Arial, sans-serif; font-size: 14px;">Destination:</td>
                                        <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #1e293b; font-family: Arial, sans-serif; font-size: 14px;">{{destination}}</td>
                                    </tr>
                                    <tr>
                                        <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #64748b; font-family: Arial, sans-serif; font-size: 14px;">Travel Date:</td>
                                        <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #1e293b; font-family: Arial, sans-serif; font-size: 14px;">{{travel_date}}</td>
                                    </tr>
                                    <tr>
                                        <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #64748b; font-family: Arial, sans-serif; font-size: 14px;">Travelers:</td>
                                        <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #1e293b; font-family: Arial, sans-serif; font-size: 14px;">{{travelers}}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <p style="margin-top: 25px; margin-bottom: 25px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Need help? Contact us at <a href="mailto:{{support_email}}" style="color: #3b82f6; text-decoration: none;">{{support_email}}</a> or call <strong>{{support_phone}}</strong>.</p>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                        <p style="margin: 0; color: #64748b; font-family: Arial, sans-serif; font-size: 14px;">Warm regards,<br><strong>The {{agency_name}} Team</strong></p>
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
</body>
</html>
  `.trim(),

    travel_itinerary: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <tr>
                <td align="center" style="background-color: #1e293b; padding: 25px;">
                    <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, sans-serif;">Your Travel Itinerary</h1>
                    <p style="opacity: 0.8; margin-top: 5px; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">{{package_name}} | {{destination}}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px;">
                    <p style="margin-top: 0; margin-bottom: 15px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Hi <strong>{{customer_name}}</strong>,</p>
                    <p style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px;">Your day-wise plan for your upcoming trip to <strong>{{destination}}</strong> is ready!</p>
                    
                    <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f1f5f9; margin-top: 20px; margin-bottom: 20px; border-collapse: collapse;">
                        <tr>
                            <td style="font-style: italic; color: #475569; font-family: Arial, sans-serif; font-size: 14px;">{{itinerary_summary}}</td>
                        </tr>
                    </table>

                    <p style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px;">A detailed PDF version of your itinerary is attached to this email for offline access.</p>
                    <p style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px;">Have a wonderful journey! 🌍</p>
                    
                    <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8; font-family: Arial, sans-serif;">© {{agency_name}}. All rights reserved.</p>
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
</body>
</html>
  `.trim(),

    booking_invoice: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->
        <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <tr>
                <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 2px solid #1e293b; padding-bottom: 20px; border-collapse: collapse; margin-bottom: 30px;">
                        <tr>
                            <td align="left"><h1 style="margin: 0; color: #1e293b; font-family: Arial, sans-serif; font-size: 28px;">INVOICE</h1></td>
                            <td align="right" style="color: #64748b; font-family: Arial, sans-serif; font-size: 14px;">
                                <strong>{{agency_name}}</strong><br>
                                Invoice #: {{invoice_number}}<br>
                                Date: {{payment_date}}
                            </td>
                        </tr>
                    </table>

                    <div style="margin-bottom: 30px;">
                        <p style="color: #64748b; margin-top: 0; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 13px;">Bill To:</p>
                        <strong style="font-size: 18px; color: #1e293b; font-family: Arial, sans-serif;">{{customer_name}}</strong>
                    </div>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr style="background-color: #f8fafc;">
                                <th align="left" style="padding-top: 12px; padding-bottom: 12px; padding-left: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-family: Arial, sans-serif; font-size: 14px;">Description</th>
                                <th align="right" style="padding-top: 12px; padding-bottom: 12px; padding-right: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-family: Arial, sans-serif; font-size: 14px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td align="left" style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Booking Ref: {{booking_reference}}</td>
                                <td align="right" style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">₹{{total_amount}}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td align="right" style="padding: 12px; font-weight: bold; color: #1e293b; font-family: Arial, sans-serif; font-size: 14px;">Total Amount:</td>
                                <td align="right" style="padding: 12px; font-weight: bold; color: #2563eb; font-size: 20px; font-family: Arial, sans-serif;">₹{{total_amount}}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <p style="font-size: 13px; color: #64748b; margin-top: 40px; font-family: Arial, sans-serif;">If you have any billing questions, please contact <a href="mailto:{{support_email}}" style="color: #3b82f6; text-decoration: none;">{{support_email}}</a>.</p>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    </div>
</body>
</html>
  `.trim(),

    payment_receipt: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff;">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="500" style="width:500px;">
        <tr>
        <td align="center" valign="top" width="500" style="width:500px;">
        <![endif]-->
        <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 500px; margin: 40px auto; border: 1px solid #bbf7d0; background-color: #f0fdf4; border-collapse: collapse; text-align: center;">
            <tr>
                <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td align="center">
                                <table border="0" cellpadding="0" cellspacing="0" style="background-color: #22c55e; border-collapse: collapse;">
                                    <tr>
                                        <td align="center" valign="middle" style="width: 64px; height: 64px; color: #ffffff; font-size: 32px; font-weight: bold; font-family: Arial, sans-serif;">✓</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <h1 style="color: #166534; font-size: 28px; margin-top: 0; margin-bottom: 0; font-family: Arial, sans-serif;">Payment Received</h1>
                    <p style="color: #15803d; font-size: 18px; margin-top: 10px; margin-bottom: 30px; font-family: Arial, sans-serif;">Thank you for your payment!</p>
                    
                    <table width="100%" border="0" cellpadding="25" cellspacing="0" style="background-color: #ffffff; border: 1px solid #dcfce7; border-collapse: collapse; text-align: left;">
                        <tr>
                            <td>
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr><td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #166534; font-family: Arial, sans-serif; font-size: 14px;">Amount Paid:</td><td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; font-size: 18px; color: #166534; font-family: Arial, sans-serif;">₹{{amount_paid}}</td></tr>
                                    <tr><td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #166534; font-family: Arial, sans-serif; font-size: 14px;">Date:</td><td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; color: #166534; font-family: Arial, sans-serif; font-size: 14px;">{{payment_date}}</td></tr>
                                    <tr><td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #166534; font-family: Arial, sans-serif; font-size: 14px;">Method:</td><td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; color: #166534; font-family: Arial, sans-serif; font-size: 14px;">{{payment_method}}</td></tr>
                                    <tr><td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #166534; font-family: Arial, sans-serif; font-size: 14px;">Payment ID:</td><td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-size: 12px; font-family: Arial, sans-serif; color: #166534;">{{payment_id}}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <p style="font-size: 14px; color: #166534; margin-top: 30px; font-family: Arial, sans-serif; margin-bottom: 0;">Booking Reference: <strong>{{booking_reference}}</strong></p>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    </div>
</body>
</html>
  `.trim(),

    booking_cancellation: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->
        <table width="100%" border="0" cellpadding="30" cellspacing="0" style="max-width: 600px; margin: 20px auto; border: 1px solid #fee2e2; border-top: 4px solid #ef4444; border-collapse: collapse;">
            <tr>
                <td>
                    <h1 style="color: #991b1b; margin-top: 0; margin-bottom: 15px; font-size: 24px; font-family: Arial, sans-serif;">Booking Cancelled</h1>
                    <p style="margin-top: 0; margin-bottom: 15px; font-family: Arial, sans-serif; font-size: 14px; color: #000000;">Hi <strong>{{customer_name}}</strong>,</p>
                    <p style="line-height: 1.6; margin-bottom: 25px; font-family: Arial, sans-serif; font-size: 14px; color: #000000;">This email confirms that your booking for <strong>{{package_name}}</strong> (Ref: {{booking_reference}}) has been cancelled as requested.</p>
                    
                    <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fee2e2; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;">
                        <tr>
                            <td>
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td align="left" style="color: #991b1b; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;">Refund Details:</td>
                                        <td align="right" style="font-size: 24px; font-weight: bold; color: #991b1b; font-family: Arial, sans-serif;">₹{{refund_amount}}</td>
                                    </tr>
                                </table>
                                <p style="margin-top: 5px; margin-bottom: 0; font-size: 14px; color: #b91c1c; font-family: Arial, sans-serif;">Refund Timeline: {{refund_timeline}}</p>
                            </td>
                        </tr>
                    </table>

                    <p style="line-height: 1.6; margin-bottom: 25px; font-family: Arial, sans-serif; font-size: 14px; color: #000000;">We hope to see you again soon for another adventure!</p>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        <p style="margin: 0; color: #64748b; font-size: 14px; font-family: Arial, sans-serif;">Best regards,<br><strong>{{agency_name}} Team</strong></p>
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
</body>
</html>
  `.trim(),

    trip_reminder: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; margin: 0; padding: 0;">
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #eff6ff;">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width:600px;">
        <![endif]-->
        <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 20px auto; border-collapse: collapse; text-align: center;">
            <tr>
                <td>
                    <div style="font-size: 48px; margin-bottom: 20px;">✈️</div>
                    <h1 style="color: #1e40af; margin-top: 0; margin-bottom: 0; font-size: 28px; font-family: Arial, sans-serif;">Get Ready!</h1>
                    <p style="color: #1e3a8a; font-size: 18px; margin-top: 10px; margin-bottom: 30px; font-family: Arial, sans-serif;">Your trip to {{destination}} is in just {{days_until_travel}} days!</p>
                    
                    <table width="100%" border="0" cellpadding="30" cellspacing="0" style="background-color: #ffffff; border-collapse: collapse; text-align: left;">
                        <tr>
                            <td>
                                <p style="margin-top: 0; margin-bottom: 15px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Hi <strong>{{customer_name}}</strong>,</p>
                                <p style="color: #000000; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px;">We're just as excited as you are! Here are your travel dates:</p>
                                <table width="100%" border="0" cellpadding="15" cellspacing="0" style="background-color: #f8fafc; border-collapse: collapse; margin-bottom: 20px;">
                                    <tr>
                                        <td align="center" style="font-size: 20px; font-weight: bold; color: #2563eb; font-family: Arial, sans-serif;">{{departure_date}}</td>
                                    </tr>
                                </table>
                                
                                <p style="margin-bottom: 10px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">If you have last-minute questions, reach out to your agent:</p>
                                <p style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>{{agent_name}}</strong> | {{agent_contact}}</p>
                            </td>
                        </tr>
                    </table>

                    <p style="font-size: 12px; color: #64748b; margin-top: 30px; font-family: Arial, sans-serif;">Booking Reference: {{booking_reference}}</p>
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
    </div>
</body>
</html>
  `.trim(),
};


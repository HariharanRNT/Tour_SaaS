import { EmailTemplateType } from "./email-variables";

export const DEFAULT_TEMPLATES: Record<EmailTemplateType, string> = {
  booking_confirmation: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
            <p style="opacity: 0.8; margin-top: 8px;">Your adventure with {{agency_name}} begins soon.</p>
        </div>
        <div style="padding: 30px;">
            <p>Hi <strong>{{customer_name}}</strong>,</p>
            <p>We're thrilled to confirm your booking for <strong>{{package_name}}</strong>. Our team is already preparing everything for your perfect trip.</p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h2 style="margin-top: 0; font-size: 18px; color: #1e293b;">📌 Trip Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #64748b;">Reference ID:</td><td style="text-align: right; font-weight: bold;">{{booking_reference}}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Destination:</td><td style="text-align: right; font-weight: bold;">{{destination}}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Travel Date:</td><td style="text-align: right; font-weight: bold;">{{travel_date}}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Travelers:</td><td style="text-align: right; font-weight: bold;">{{travelers}}</td></tr>
                </table>
            </div>

            <p>Need help? Contact us at <a href="mailto:{{support_email}}" style="color: #3b82f6; text-decoration: none;">{{support_email}}</a> or call <strong>{{support_phone}}</strong>.</p>
            
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">Warm regards,<br><strong>The {{agency_name}} Team</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim(),

  travel_itinerary: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1e293b; padding: 25px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 22px;">Your Travel Itinerary</h1>
            <p style="opacity: 0.8; margin-top: 5px;">{{package_name}} | {{destination}}</p>
        </div>
        <div style="padding: 30px;">
            <p>Hi <strong>{{customer_name}}</strong>,</p>
            <p>Your day-wise plan for your upcoming trip to <strong>{{destination}}</strong> is ready!</p>
            
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; font-style: italic; color: #475569;">{{itinerary_summary}}</p>
            </div>

            <p>A detailed PDF version of your itinerary is attached to this email for offline access.</p>
            
            <p>Have a wonderful journey! 🌍</p>
            
            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p>© {{agency_name}}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim(),

  booking_invoice: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; padding: 40px;">
        <table style="width: 100%; border-bottom: 2px solid #1e293b; padding-bottom: 20px;">
            <tr>
                <td><h1 style="margin: 0; color: #1e293b;">INVOICE</h1></td>
                <td style="text-align: right; color: #64748b;">
                    <strong>{{agency_name}}</strong><br>
                    Invoice #: {{invoice_number}}<br>
                    Date: {{payment_date}}
                </td>
            </tr>
        </table>

        <div style="margin: 30px 0;">
            <p style="color: #64748b; margin-bottom: 5px;">Bill To:</p>
            <strong style="font-size: 18px;">{{customer_name}}</strong>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
            <thead>
                <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Description</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">Booking Ref: {{booking_reference}}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #f1f5f9;">₹{{total_amount}}</td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">Total Amount:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #2563eb; font-size: 20px;">₹{{total_amount}}</td>
                </tr>
            </tfoot>
        </table>

        <p style="font-size: 13px; color: #64748b; margin-top: 40px;">If you have any billing questions, please contact <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
    </div>
</body>
</html>
  `.trim(),

  payment_receipt: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 500px; margin: 40px auto; border: 1px solid #bbf7d0; border-radius: 16px; background-color: #f0fdf4; padding: 40px; text-align: center;">
        <div style="background-color: #22c55e; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">✓</span>
        </div>
        <h1 style="color: #166534; font-size: 28px; margin: 0;">Payment Received</h1>
        <p style="color: #15803d; font-size: 18px; margin-top: 10px;">Thank you for your payment!</p>
        
        <div style="background-color: white; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: left; border: 1px solid #dcfce7;">
            <table style="width: 100%;">
                <tr><td style="padding: 5px 0; color: #166534;">Amount Paid:</td><td style="text-align: right; font-weight: bold; font-size: 18px;">₹{{amount_paid}}</td></tr>
                <tr><td style="padding: 5px 0; color: #166534;">Date:</td><td style="text-align: right;">{{payment_date}}</td></tr>
                <tr><td style="padding: 5px 0; color: #166534;">Method:</td><td style="text-align: right;">{{payment_method}}</td></tr>
                <tr><td style="padding: 5px 0; color: #166534;">Payment ID:</td><td style="text-align: right; font-size: 12px; font-family: monospace;">{{payment_id}}</td></tr>
            </table>
        </div>

        <p style="font-size: 14px; color: #166534;">Booking Reference: <strong>{{booking_reference}}</strong></p>
    </div>
</body>
</html>
  `.trim(),

  booking_cancellation: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; border: 1px solid #fee2e2; border-top: 4px solid #ef4444; padding: 30px;">
        <h1 style="color: #991b1b; margin-top: 0;">Booking Cancelled</h1>
        <p>Hi {{customer_name}},</p>
        <p>This email confirms that your booking for <strong>{{package_name}}</strong> (Ref: {{booking_reference}}) has been cancelled as requested.</p>
        
        <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #fee2e2;">
            <p style="margin: 0; color: #991b1b;"><strong>Refund Details:</strong></p>
            <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold;">₹{{refund_amount}}</p>
            <p style="margin: 5px 0 0; font-size: 14px; color: #b91c1c;">Refund Timeline: {{refund_timeline}}</p>
        </div>

        <p>We hope to see you again soon for another adventure!</p>
        
        <div style="margin-top: 30px; font-size: 14px; color: #64748b;">
            <p>Best regards,<br><strong>{{agency_name}} Team</strong></p>
        </div>
    </div>
</body>
</html>
  `.trim(),

  trip_reminder: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #eff6ff; border-radius: 12px; padding: 40px; text-align: center;">
        <span style="font-size: 48px;">✈️</span>
        <h1 style="color: #1e40af; margin: 20px 0 10px;">Get Ready!</h1>
        <p style="color: #1e3a8a; font-size: 18px; margin-top: 0;">Your trip to {{destination}} is in just {{days_until_travel}} days!</p>
        
        <div style="background-color: white; border-radius: 12px; padding: 30px; margin: 30px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: left;">
            <p style="margin-top: 0;">Hi {{customer_name}},</p>
            <p>We're just as excited as you are! Here are your travel dates:</p>
            <p style="font-size: 20px; font-weight: bold; color: #2563eb; text-align: center; background: #f8fafc; padding: 15px; border-radius: 8px;">{{departure_date}}</p>
            
            <p style="margin-bottom: 0;">If you have last-minute questions, reach out to your agent:</p>
            <p><strong>{{agent_name}}</strong> | {{agent_contact}}</p>
        </div>

        <p style="font-size: 12px; color: #64748b;">Booking Reference: {{booking_reference}}</p>
    </div>
</body>
</html>
  `.trim(),
};

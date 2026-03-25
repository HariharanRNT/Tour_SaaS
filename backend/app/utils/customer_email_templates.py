from typing import Dict, Any, Tuple

def get_customer_notification_html(template_type: str, data: Dict[str, Any]) -> Tuple[str, str]:
    """
    Returns (subject, html_body) for different customer notification templates based on Customer_notification.txt.
    """
    subject = ""
    message = ""
    
    # Safe getters with fallbacks
    customer_name = data.get("customer_name", "Customer")
    package_name = data.get("package_name", "Your Package")
    ref_id = data.get("reference_id", "N/A")
    travel_date = data.get("travel_date", "TBD")
    travelers = str(data.get("travelers", "1"))
    total_amount = str(data.get("total_amount", "0.00"))
    payment_method = data.get("payment_method", "Online")
    payment_date = data.get("payment_date", "TBD")
    itinerary_summary = data.get("itinerary_summary", "Detailed itinerary to follow.")
    booking_status = data.get("booking_status", "Confirmed")
    reporting_time = data.get("reporting_time", "TBD")
    pickup_location = data.get("pickup_location", "TBD")
    driver_name = data.get("driver_name", "TBD")
    driver_name = data.get("driver_name", "TBD")
    driver_contact = data.get("driver_contact", "TBD")
    hotel_details = data.get("hotel_details", "TBD")
    alert_message = data.get("alert_message", "")
    agency_name = data.get("agency_name", "TourSaaS")
    support_email = data.get("support_email", "support@toursaas.com")
    support_phone = data.get("support_phone", "N/A")

    if template_type == "booking_confirmation":
        subject = f"Booking Confirmed - {package_name}"
        message = f"""
Hi {customer_name},<br><br>

Your booking has been successfully confirmed! 🎉<br><br>

We’re excited to have you onboard and look forward to making your trip a wonderful experience.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>📌 Booking Details</b><br><br>
<ul>
    <li><b>Reference ID:</b> {ref_id}</li>
    <li><b>Package:</b> {package_name}</li>
    <li><b>Travel Date:</b> {travel_date}</li>
    <li><b>Travelers:</b> {travelers}</li>
    <li><b>Total Amount Paid:</b> ₹{total_amount}</li>
</ul><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>🧳 What’s Next?</b><br><br>
<ul>
    <li>You will receive your detailed itinerary shortly.</li>
    <li>Our team will share travel assistance details before your trip.</li>
    <li>Keep this email handy for future reference.</li>
</ul><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

If you have any questions or need assistance, feel free to reply to this email or contact our support team anytime.<br><br>

Wishing you a fantastic journey ahead! 🌍<br><br>

Warm regards,<br>
<b>{agency_name} Team</b><br>
📧 {support_email}<br>
📞 {support_phone}<br>
"""
    elif template_type == "payment_receipt":
        subject = f"Payment Receipt - {ref_id}"
        message = f"""
Hi {customer_name},<br><br>

Thank you for your booking! 🎉<br><br>

Your payment has been successfully received, and your booking is now confirmed.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>📌 Payment Summary</b><br><br>
<ul>
    <li><b>Reference ID:</b> {ref_id}</li>
    <li><b>Package:</b> {package_name}</li>
    <li><b>Amount Paid:</b> ₹{total_amount}</li>
    <li><b>Payment Method:</b> {payment_method}</li>
    <li><b>Payment Date:</b> {payment_date}</li>
</ul><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>📄 Invoice Attached</b><br>
Please find your <b>Booking Invoice (PDF)</b> attached to this email.<br>
The invoice includes complete details such as:<br>
<ul>
    <li>Package breakdown</li>
    <li>Taxes (GST)</li>
    <li>Traveler details</li>
    <li>Billing information</li>
</ul><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>🧾 Important Note</b><br>
Kindly keep this invoice for your records. You may be required to present it during your travel or for any future reference.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

If you have any questions or need further assistance, feel free to reach out to us.<br><br>

Thank you for choosing <b>{agency_name}</b>. We wish you a wonderful journey ahead! 🌍<br><br>

Warm regards,<br>
<b>{agency_name} Team</b><br>
📧 {support_email}<br>
📞 {support_phone}<br>
"""
    elif template_type == "itinerary_details":
        subject = f"Your Travel Itinerary - {package_name}"
        message = f"""
Hi {customer_name},<br><br>

Your travel itinerary is ready! ✈️<br><br>

Please find your <b>detailed day-wise itinerary</b> attached in PDF format.<br><br>

You can also access and download it anytime from your booking dashboard.<br><br>

We wish you a wonderful journey ahead! 🌍<br><br>

Regards,<br>
<b>{agency_name} Team</b>
"""
    elif template_type == "booking_status":
        subject = f"Booking Update - {ref_id}"
        message = f"""
Hi {customer_name},<br><br>

Your booking status has been updated:<br><br>

<b>Status:</b> {booking_status}<br><br>

We will keep you informed about further updates.<br>
"""
    elif template_type == "trip_reminder_7d":
        subject = f"Upcoming Trip Reminder - {package_name}"
        message = f"""
Hi {customer_name},<br><br>

Your trip is coming up soon! ✈️<br><br>

<b>Travel Date:</b> {travel_date}<br><br>

<b>Checklist:</b><br>
- Carry valid ID proof<br>
- Keep booking confirmation handy<br>
- Pack essentials<br><br>

Get ready for an amazing experience!<br>
"""
    elif template_type == "trip_reminder_3d":
        subject = f"Upcoming Trip Reminder - {package_name}"
        message = f"""
Hi {customer_name},<br><br>

Your trip is coming up in just 3 days! ✈️<br><br>

<b>Travel Date:</b> {travel_date}<br><br>

<b>Checklist:</b><br>
- Double-check all travel documents<br>
- Confirm packing<br>
- Reach out to us if you need any last-minute assistance<br><br>

Get ready for an amazing experience!<br>
"""
    elif template_type == "trip_reminder_1d":
        subject = f"यात्रा Reminder - Tomorrow is Your Trip!"
        message = f"""
Hi {customer_name},<br><br>

Just a quick reminder that your trip starts tomorrow!<br><br>

<b>Important Info:</b><br>
- Reporting Time: {reporting_time}<br>
- Pickup Location: {pickup_location}<br><br>

Wishing you a safe and happy journey! 🌍<br>
"""
    elif template_type == "pre_travel_assistance":
        subject = f"Travel Assistance Details - {package_name}"
        message = f"""
Hi {customer_name},<br><br>

Here are your travel assistance details:<br><br>

- Driver Name: {driver_name}<br>
- Contact Number: {driver_contact}<br>
- Hotel Check-in: {hotel_details}<br><br>

Feel free to reach out if you need any help.<br>
"""
    elif template_type == "real_time_alert":
        subject = f"Important Update - {ref_id}"
        message = f"""
Hi {customer_name},<br><br>

There is an important update regarding your trip:<br><br>

{alert_message}<br><br>

We apologize for any inconvenience caused and appreciate your understanding.<br>
"""
    elif template_type == "feedback_request":
        subject = "Share Your Experience"
        message = f"""
Hi {customer_name},<br><br>

We hope you had a wonderful trip! 😊<br><br>

Please take a moment to share your feedback:<br><br>

⭐ Rate your experience<br>
💬 Leave a review<br><br>

Your feedback helps us improve our services.<br>
"""
    elif template_type == "booking_cancellation":
        refund_amount = data.get("refund_amount", "₹0")
        refund_note = data.get("refund_note", "")
        subject = f"Booking Cancelled – {ref_id}"
        message = f"""
Hi {customer_name},<br><br>

We confirm that your booking has been successfully <b>cancelled</b>.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>📌 Cancellation Details</b><br><br>
<ul>
    <li><b>Reference ID:</b> {ref_id}</li>
    <li><b>Package:</b> {package_name}</li>
    <li><b>Travel Date:</b> {travel_date}</li>
    <li><b>Refund Amount:</b> {refund_amount}</li>
</ul><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>💰 Refund Information</b><br><br>
{refund_note}<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

If you have any questions, please contact our support team.<br><br>

Warm regards,<br>
<b>{agency_name} Team</b><br>
📧 {support_email}<br>
📞 {support_phone}<br>
"""
    elif template_type == "customer_welcome":
        subject = f"Welcome to {agency_name}!"
        message = f"""
Hi {customer_name},<br><br>

Welcome to <b>{agency_name}</b>! We’re thrilled to have you with us. 🎉<br><br>

Your account has been successfully created. You can now explore our tour packages, plan your trips, and manage your bookings directly from your dashboard.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>🚀 What can you do next?</b><br><br>
<ul>
    <li><b>Explore Packages:</b> Discover curated travel experiences.</li>
    <li><b>Plan Your Trip:</b> Customize your itinerary with our AI assistant.</li>
    <li><b>Manage Bookings:</b> Keep track of all your travel plans in one place.</li>
</ul><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

If you have any questions or need a hand getting started, our team is always here to help.<br><br>

Happy travels! 🌍<br><br>

Warm regards,<br>
<b>{agency_name} Team</b><br>
📧 {support_email}<br>
📞 {support_phone}<br>
"""
    elif template_type == "customer_welcome":
        subject = f"Welcome to {agency_name}!"
        message = f"""
Hi {customer_name},<br><br>

Welcome to <b>{agency_name}</b>! 🎉<br><br>

We’re thrilled to have you join our travel community. Whether you're planning your next big adventure or just exploring, we're here to help you every step of the way.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>🌐 Explore Your Dashboard</b><br>
Log in to your account to:<br>
<ul>
    <li>View and manage your bookings</li>
    <li>Download travel documents & itineraries</li>
    <li>Discover personalized travel recommendations</li>
</ul><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

If you have any questions, feel free to reach out to us at {support_email}.<br><br>

Happy travels!<br><br>

Warm regards,<br>
<b>{agency_name} Team</b><br>
📧 {support_email}<br>
📞 {support_phone}<br>
"""
    elif template_type == "refund_confirmed":
        refund_amount = data.get("refund_amount", "₹0")
        ref_id = data.get("reference_id", "N/A")
        subject = f"Refund Processed – {ref_id}"
        message = f"""
Hi {customer_name},<br><br>

Great news! 🎉 Your refund has been <b>successfully processed</b>.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #166534;">✅ Refund Completed</p>
    <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #15803d;">{refund_amount}</p>
    <p style="margin: 4px 0 0; font-size: 13px; color: #166534;">Reference: {ref_id}</p>
</div>

<b>📅 When will you receive it?</b><br><br>
Your refund will be credited to your original payment method within <b>5–7 business days</b>, depending on your bank's processing time.<br><br>

<hr style="border: none; border-top: 1px solid #eee;"><br>

<b>ℹ️ Note:</b> If you do not see the refund after 7 business days, please contact your bank or reach out to us with your reference ID.<br><br>

If you have any questions, feel free to contact us.<br><br>

Warm regards,<br>
<b>{agency_name} Team</b><br>
📧 {support_email}<br>
📞 {support_phone}<br>
"""
    elif template_type == "booking_success_consolidated":
        subject = f"Booking Confirmed! Your Trip to {package_name} is All Set 🎉"
        message = f"""
<div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #0f172a; margin-bottom: 8px;">Booking Confirmed!</h1>
    <p style="color: #64748b; font-size: 16px; margin-top: 0;">Hi {customer_name}, your adventure is ready to begin.</p>
</div>

<div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0; color: #0f172a; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">Trip Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Booking Reference:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">{ref_id}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Destination:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">{package_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Travel Date:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">{travel_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Travelers:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">{travelers} Adults</td></tr>
    </table>
</div>

<div style="background-color: #f0fdf4; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
    <h3 style="margin-top: 0; color: #166534; font-size: 18px; border-bottom: 1px solid #bbf7d0; padding-bottom: 12px;">Payment Received</h3>
    <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #166534;">Amount Paid:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #15803d; font-size: 20px;">₹{total_amount}</td></tr>
        <tr><td style="padding: 8px 0; color: #166534;">Payment Method:</td><td style="padding: 8px 0; text-align: right; color: #166534;">{payment_method}</td></tr>
    </table>
</div>

<div style="padding: 0 10px; margin-bottom: 24px;">
    <h3 style="color: #0f172a; font-size: 18px;">What's Included?</h3>
    <p style="color: #475569; line-height: 1.6;">We have attached your <b>Official Invoice</b> and <b>Detailed Itinerary</b> to this email. Please keep them handy during your travels.</p>
    <ul style="color: #475569; padding-left: 20px;">
        <li>Day-wise sightseeing and activities</li>
        <li>Hotel and transfer details</li>
        <li>Price breakdown and tax information</li>
    </ul>
</div>

<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="color: #64748b; font-size: 14px;">If you have any questions, our support team at <b>{agency_name}</b> is here to help.</p>
    <p style="color: #0f172a; font-weight: bold;">📧 {support_email} | 📞 {support_phone}</p>
</div>
"""
    else:
        subject = "Notification"
        message = f"Hi {customer_name},<br><br>You have a new notification concerning your trip."

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            {message}
            <br>
            <hr style="border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">© {agency_name}. This is an automated notification.</p>
        </div>
    </body>
    </html>
    """
    
    return subject, html_body

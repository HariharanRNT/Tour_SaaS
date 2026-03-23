from typing import Dict, Any

def get_booking_confirmation_html(data: Dict[str, Any], theme_id: str = "classic", custom_message: str = None) -> str:
    """
    Generates themed HTML for booking confirmation emails.
    Themes: classic, tropical, midnight
    """
    
    # Common Data
    customer_name = data.get("customer_name", "Valued Customer")
    ref_id = data.get("reference_id", "N/A")
    package_title = data.get("package_title", "Your Trip")
    travel_date = data.get("travel_date", "TBD")
    travelers = data.get("travelers", 1)
    total_amount = data.get("total_amount", 0.0)
    currency = data.get("currency", "INR")
    itinerary_summary = data.get("itinerary_summary", "")
    agency_name = data.get("agency_name", "TourSaaS")
    
    # Pre-calculate common fragments for formatting
    display_package = package_title
    p_the = "" if display_package.lower().startswith("the ") else "the "

    # Helper for placeholder replacement
    def resolve_placeholders(text: str) -> str:
        if not text:
            return text
        replacements = {
            "{package_name}": f"<strong>{display_package}</strong>",
            "{customer_name}": customer_name,
            "{reference_id}": ref_id,
            "{agency_name}": agency_name,
            "{travel_date}": travel_date,
            "{travelers}": str(travelers),
            "{total_amount}": f"{total_amount:,.2f} {currency}"
        }
        res = text
        for placeholder, value in replacements.items():
            res = res.replace(placeholder, value)
        return res
    
    # Normalize theme_id
    theme_id = str(theme_id).lower().strip()
    
    # Map common names to IDs if necessary
    theme_map = {
        "classic elegance": "classic",
        "tropical wanderlust": "tropical",
        "midnight luxury": "midnight"
    }
    if theme_id in theme_map:
        theme_id = theme_map[theme_id]
    
    # Format amount
    formatted_amount = f"{total_amount:,.2f}" if isinstance(total_amount, (int, float)) else str(total_amount)

    if theme_id == "tropical":
        return f"""
        <html>
        <body style="margin: 0; padding: 0; background-color: #fff9f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#fff9f4">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 40px; overflow: hidden; border: 4px solid #ffedda; box-shadow: 0 20px 40px rgba(255,126,95,0.1);">
                            <!-- Header Gradient Area -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 50%, #ffcc33 100%); padding: 60px 40px; text-align: left;">
                                    <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 20px; color: #ffffff; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.4);">Confirmed Escape</div>
                                    <h1 style="margin: 0; color: #ffffff; font-size: 48px; font-weight: 900; line-height: 1; text-transform: uppercase; letter-spacing: -2px;">Paradise<br>Awaits!</h1>
                                    <p style="margin: 20px 0 0 0; color: rgba(255,255,255,0.8); font-size: 18px; font-weight: bold;">Ref: {ref_id}</p>
                                </td>
                            </tr>
                            
                            <!-- Body Content -->
                            <tr>
                                <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #ff4b2b; font-size: 32px; font-weight: 900; letter-spacing: -1px;">Aloha, {customer_name}!</h2>
                                    <div style="margin: 0 0 30px 0; color: #475569; font-size: 18px; line-height: 1.6;">
                                        {f"<p>{resolve_placeholders(custom_message).replace(chr(10), '<br>')}</p>" if custom_message else f"<p>Get ready to soak up the sun. Your adventure to {p_the}<strong>{display_package}</strong> is fully reserved! Our team is already preparing for your arrival to ensure every moment is sun-drenched and stress-free.</p>"}
                                    </div>
                                    
                                    <!-- Details Grid -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                        <tr>
                                            <td width="48%" style="background-color: #ffffff; border: 1px solid #fff2e6; border-radius: 24px; padding: 24px; text-align: center;">
                                                <div style="color: #fdba74; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Date</div>
                                                <div style="color: #1e293b; font-size: 20px; font-weight: 900;">{travel_date}</div>
                                            </td>
                                            <td width="4%"></td>
                                            <td width="48%" style="background-color: #ffffff; border: 1px solid #fff2e6; border-radius: 24px; padding: 24px; text-align: center;">
                                                <div style="color: #fdba74; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Travelers</div>
                                                <div style="color: #1e293b; font-size: 20px; font-weight: 900;">{travelers} People</div>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Total Area -->
                                    <div style="background-color: #1a1a1a; border-radius: 32px; padding: 40px; text-align: center; color: #ffffff;">
                                        <div style="color: rgba(255,255,255,0.6); font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px;">Complete Trip Value</div>
                                        <div style="font-size: 48px; font-weight: 900; letter-spacing: -2px;">{currency} {formatted_amount}</div>
                                        <div style="margin-top: 20px; display: inline-block;">
                                            <span style="display: inline-block; width: 8px; height: 8px; background-color: #f97316; border-radius: 50%; margin-right: 8px;"></span>
                                            <span style="color: #fb923c; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Transaction Secured</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 0 40px 40px 40px; text-align: center; color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                                    © 2026 {agency_name} | Worldwide Travel Network
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    elif theme_id == "midnight":
        return f"""
        <html>
        <body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#020617">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617; border-radius: 24px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 30px 60px rgba(0,0,0,0.5);">
                            <!-- Header Area -->
                            <tr>
                                <td style="background-color: #0f172a; padding: 60px 40px; text-align: center; border-bottom: 1px solid rgba(245,158,11,0.2);">
                                    <div style="width: 40px; height: 1px; background: linear-gradient(to right, transparent, #f59e0b, transparent); margin: 0 auto 30px auto;"></div>
                                    <div style="color: rgba(245,158,11,0.8); font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 15px;">Reservation Finalized</div>
                                    <h1 style="margin: 0; color: #ffffff; font-size: 60px; font-weight: 200; letter-spacing: -3px; line-height: 1;">Confirmed</h1>
                                    <div style="margin-top: 25px;">
                                        <span style="background-color: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); padding: 4px 15px; border-radius: 20px; font-family: monospace; font-size: 12px; letter-spacing: 2px;">ID: {ref_id}</span>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Body Content -->
                            <tr>
                                <td style="padding: 60px 50px;">
                                    <h2 style="margin: 0 0 25px 0; color: #ffffff; font-size: 32px; font-weight: 300; line-height: 1.2; letter-spacing: -1px;">Welcome to the Elite Tier, <br><span style="color: #f59e0b; font-weight: 500;">{customer_name.split()[0]}</span>.</h2>
                                    <div style="margin: 0 0 50px 0; color: #94a3b8; font-size: 18px; line-height: 1.8; font-weight: 300;">
                                        {f"<p>{resolve_placeholders(custom_message).replace(chr(10), '<br>')}</p>" if custom_message else f"<p>It is our privilege to confirm your passage for {p_the}<strong>{display_package}</strong>. Our concierges are currently finalizing every bespoke detail of your itinerary to ensure absolute perfection upon your arrival.</p>"}
                                    </div>
                                    
                                    <!-- Details Row -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 40px 0; margin-bottom: 40px;">
                                        <tr>
                                            <td width="45%" style="vertical-align: top;">
                                                <div style="color: rgba(245,158,11,0.4); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 12px;">Commencement</div>
                                                <div style="color: #e2e8f0; font-size: 24px; font-weight: 300;">{travel_date}</div>
                                            </td>
                                            <td width="10%"></td>
                                            <td width="45%" style="vertical-align: top;">
                                                <div style="color: rgba(245,158,11,0.4); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 12px;">Delegation</div>
                                                <div style="color: #e2e8f0; font-size: 24px; font-weight: 300;">{travelers} Guests</div>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Total Area -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="vertical-align: middle;">
                                                <div style="color: #64748b; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px;">Portfolio Value</div>
                                                <div style="margin-top: 8px;">
                                                    <span style="background-color: rgba(245,158,11,0.05); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 900; text-transform: uppercase;">Verified & Secure</span>
                                                </div>
                                            </td>
                                            <td align="right" style="vertical-align: middle; color: #f59e0b; font-size: 48px; font-weight: 200; letter-spacing: -2px;">
                                                {currency} {formatted_amount}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 40px; text-align: center; background-color: rgba(15,23,42,0.5); border-top: 1px solid rgba(255,255,255,0.05);">
                                    <p style="margin: 0; color: #475569; font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 5px;">{agency_name} Private Reserve | Bespoke Voyage Management</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    else:  # Classic (Default)
        return f"""
        <html>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Georgia', serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f8fafc">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                            <!-- Header Area -->
                            <tr>
                                <td style="padding: 40px 40px 30px 40px; border-bottom: 2px solid #2563eb;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td>
                                                <h1 style="margin: 0; color: #1e3a8a; font-size: 28px; font-weight: bold; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Booking Confirmation</h1>
                                                <p style="margin: 5px 0 0 0; color: #94a3b8; font-style: italic; font-size: 13px;">Official Document | Ref: {ref_id}</p>
                                            </td>
                                            <td align="right" style="vertical-align: top;">
                                                <div style="color: #2563eb; font-weight: bold; font-size: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">{agency_name.upper()}</div>
                                                <div style="color: #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">Global Travel Group</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Body Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-style: italic;">Dear <strong>{customer_name}</strong>,</p>
                                    <div style="margin: 0 0 40px 0; color: #475569; font-size: 17px; line-height: 1.6;">
                                        {f"<p>{resolve_placeholders(custom_message).replace(chr(10), '<br>')}</p>" if custom_message else f"<p>Your journey with us is officially confirmed. We are truly delighted to host you for the upcoming {p_the}<strong>{display_package}</strong>. Our team is now preparing all the details to ensure your trip is seamless and memorable.</p>"}
                                    </div>
                                    
                                    <!-- Details Box -->
                                    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 30px; margin-bottom: 40px;">
                                        <div style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Voyage Particulars</div>
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                            <tr>
                                                <td width="50%">
                                                    <div style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Departure Date</div>
                                                    <div style="color: #1e293b; font-size: 16px; font-weight: bold;">{travel_date}</div>
                                                </td>
                                                <td width="50%">
                                                    <div style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Travel Delegation</div>
                                                    <div style="color: #1d4ed8; font-size: 16px; font-weight: bold;">{travelers} Persons</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    <!-- Total Area -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #f1f5f9; padding-top: 25px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                        <tr>
                                            <td>
                                                <div style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Total Investment</div>
                                                <div style="margin-top: 5px;">
                                                    <span style="background-color: #f0fdf4; color: #166534; border: 1px solid #dcfce7; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">Paid in Full</span>
                                                </div>
                                            </td>
                                            <td align="right" style="color: #0f172a; font-size: 36px; font-weight: 900; letter-spacing: -1px;">
                                                {currency} {formatted_amount}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 0 40px 40px 40px; text-align: center; color: #cbd5e1; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 4px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                    © 2026 {agency_name} Travel Group | Secure Booking Protocol
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

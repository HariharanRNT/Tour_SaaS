import { EmailTemplateType } from "./email-variables";

export interface StructuredEmailContent {
    hero_title?: string;
    hero_subtitle?: string;
    intro_text?: string;
    details_title?: string;
    message_text?: string;
    summary_label?: string;
    attachment_note?: string;
    closing_text?: string;
    footer_note?: string;
    footer_team?: string;
    invoice_title?: string;
    bill_to_label?: string;
    total_label?: string;
    success_subtitle?: string;
    invoice_note_title?: string;
    invoice_note_text?: string;
    important_note_title?: string;
    important_note_text?: string;
    // New Image Fields
    header_image_url?: string;
    header_image_height?: string;
    show_header?: boolean;
    body_image?: {
        url: string;
        width: string;
        alt: string;
        align: 'left' | 'center' | 'right';
        link?: string;
    };
    show_body_image?: boolean;
}

export const DEFAULT_STRUCTURED_CONTENT: Record<EmailTemplateType, StructuredEmailContent> = {
    booking_confirmation: {
        hero_title: "Booking Confirmed!",
        hero_subtitle: "Your adventure with {{agency_name}} begins soon.",
        intro_text: "Hi {{customer_name}}, we're thrilled to confirm your booking for {{package_name}}. Our team is already preparing everything for your perfect trip.",
        details_title: "📌 Trip Details",
        footer_note: "Warm regards,",
        footer_team: "The {{agency_name}} Team",
        show_header: true,
        header_image_height: "40px",
        show_body_image: false,
        body_image: { url: "", width: "100%", alt: "", align: "center" }
    },
    travel_itinerary: {
        hero_title: "Your Travel Itinerary",
        hero_subtitle: "{{package_name}} | {{destination}}",
        intro_text: "Hi {{customer_name}}, your day-wise plan for your upcoming trip to {{destination}} is ready!",
        summary_label: "Itinerary Summary",
        attachment_note: "A detailed PDF version of your itinerary is attached to this email for offline access.",
        closing_text: "Have a wonderful journey! 🌍",
        show_header: true,
        header_image_height: "40px",
        show_body_image: false,
        body_image: { url: "", width: "100%", alt: "", align: "center" }
    },
    booking_invoice: {
        invoice_title: "INVOICE",
        bill_to_label: "Bill To:",
        details_title: "Description",
        total_label: "Total Amount:",
        attachment_note: "If you have any billing questions, please contact {{support_email}}.",
        show_header: true,
        header_image_height: "40px",
        show_body_image: false,
        body_image: { url: "", width: "100%", alt: "", align: "center" }
    },
    payment_receipt: {
        hero_title: "Hi {{customer_name}},",
        intro_text: "Thank you for your booking! 🎉\n\nYour payment has been successfully received, and your booking is now confirmed.",
        details_title: "📌 Payment Summary",
        invoice_note_title: "📄 Invoice Attached",
        invoice_note_text: "Please find your **Booking Invoice (PDF)** attached to this email.\nThe invoice includes complete details such as:\n\n• Package breakdown\n• Taxes (GST)\n• Traveler details\n• Billing information",
        important_note_title: "🧾 Important Note",
        important_note_text: "Kindly keep this invoice for your records. You may be required to present it during your travel or for any future reference.",
        footer_note: "If you have any questions or need further assistance, feel free to reach out to us.\n\nThank you for choosing **RNT Travel**. We wish you a wonderful journey ahead! 🌍",
        footer_team: "Warm regards,\n**RNT Travel Team**",
        show_header: true,
        header_image_height: "40px",
        show_body_image: false,
        body_image: { url: "", width: "100%", alt: "", align: "center" }
    },
    booking_cancellation: {
        hero_title: "Booking Cancelled",
        intro_text: "Hi {{customer_name}}, this email confirms that your booking for {{package_name}} (Ref: {{booking_reference}}) has been cancelled as requested.",
        details_title: "Refund Details:",
        summary_label: "Refund Timeline: {{refund_timeline}}",
        closing_text: "We hope to see you again soon for another adventure!",
        footer_note: "Best regards,",
        footer_team: "{{agency_name}} Team",
        show_header: true,
        header_image_height: "40px",
        show_body_image: false,
        body_image: { url: "", width: "100%", alt: "", align: "center" }
    },
    trip_reminder: {
        hero_title: "Get Ready!",
        hero_subtitle: "Your trip to {{destination}} is in just {{days_until_travel}} days!",
        intro_text: "Hi {{customer_name}}, we're just as excited as you are! Here are your travel dates:",
        message_text: "If you have last-minute questions, reach out to your agent:",
        footer_note: "Booking Reference: {{booking_reference}}",
        show_header: true,
        header_image_height: "40px",
        show_body_image: false,
        body_image: { url: "", width: "100%", alt: "", align: "center" }
    }
};

const renderHeader = (c: StructuredEmailContent) => {
    if (!c.show_header) return '';
    return `
        <div style="padding: 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <img src="${c.header_image_url || 'https://toursaas.s3.us-east-1.amazonaws.com/logo.png'}" 
                 style="height: ${c.header_image_height || '40px'}; width: auto; max-width: 100%; display: block; margin: 0 auto;" 
                 alt="Agency Logo" />
        </div>
    `;
};

const renderBodyImage = (c: StructuredEmailContent) => {
    if (!c.show_body_image || !c.body_image?.url) return '';
    const { url, width, alt, align, link } = c.body_image;
    const margin = align === 'center' ? 'margin: 0 auto;' : align === 'right' ? 'margin: 0 0 0 auto;' : 'margin: 0 auto 0 0;';
    
    const imgHtml = `
        <img src="${url}" 
             alt="${alt || ''}" 
             style="width: ${width || '100%'}; max-width: 100%; height: auto; display: block; ${margin} border-radius: 8px;" />
    `;

    return `
        <div style="margin: 25px 0; text-align: ${align};">
            ${link ? `<a href="${link}" target="_blank" style="text-decoration: none;">${imgHtml}</a>` : imgHtml}
        </div>
    `;
};

export const MASTER_SHELLS: Record<EmailTemplateType, (content: StructuredEmailContent) => string> = {
    booking_confirmation: (c) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0;">
                <tr>
                    <td align="center" style="background-color: #ffffff;">
                        ${renderHeader(c)}
                    </td>
                </tr>
                <tr>
                    <td align="center" style="background-color: #1e293b; padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px;">
                        <h1 data-edit="hero_title" style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, sans-serif;">${c.hero_title}</h1>
                        <p data-edit="hero_subtitle" style="margin-top: 8px; margin-bottom: 0; font-size: 14px; color: #ffffff; opacity: 0.8; font-family: Arial, sans-serif;">${c.hero_subtitle}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px;">
                        ${renderBodyImage(c)}
                        <p data-edit="intro_text" style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 25px;">${c.intro_text}</p>
                        
                        <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-collapse: collapse;">
                            <tr>
                                <td>
                                    <h2 data-edit="details_title" style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #000000; font-family: Arial, sans-serif;">${c.details_title}</h2>
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                        <tr>
                                            <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Reference ID:</td>
                                            <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{booking_reference}}</td>
                                        </tr>
                                        <tr>
                                            <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Package:</td>
                                            <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{package_name}}</td>
                                        </tr>
                                        <tr>
                                            <td width="50%" align="left" style="padding-top: 8px; padding-bottom: 8px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Travel Date:</td>
                                            <td width="50%" align="right" style="padding-top: 8px; padding-bottom: 8px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{travel_date}}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                            <p style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                                <span data-edit="footer_note">${c.footer_note}</span><br>
                                <strong data-edit="footer_team">${c.footer_team}</strong>
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
    `.trim(),

    travel_itinerary: (c) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr>
                    <td>${renderHeader(c)}</td>
                </tr>
                <tr>
                    <td align="center" style="background-color: #1e293b; padding: 25px;">
                        <h1 data-edit="hero_title" style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, sans-serif;">${c.hero_title}</h1>
                        <p data-edit="hero_subtitle" style="margin-top: 5px; margin-bottom: 0; font-size: 14px; color: #ffffff; opacity: 0.8; font-family: Arial, sans-serif;">${c.hero_subtitle}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 30px; padding-bottom: 30px; padding-left: 30px; padding-right: 30px;">
                        ${renderBodyImage(c)}
                        <p data-edit="intro_text" style="line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">${c.intro_text}</p>
                        <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f1f5f9; margin-top: 20px; margin-bottom: 20px; border-collapse: collapse;">
                            <tr>
                                <td style="font-style: italic; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{itinerary_summary}}</td>
                            </tr>
                        </table>
                        <p data-edit="attachment_note" style="font-size: 14px; color: #000000; font-family: Arial, sans-serif;">${c.attachment_note}</p>
                        <p data-edit="closing_text" style="font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">${c.closing_text}</p>
                        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <p style="margin: 0; font-size: 12px; color: #64748b; font-family: Arial, sans-serif;">© {{agency_name}}. All rights reserved.</p>
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
    `.trim(),

    booking_invoice: (c) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr>
                    <td>
                        ${renderHeader(c)}
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 2px solid #000000; padding-bottom: 20px; margin-bottom: 30px; border-collapse: collapse;">
                            <tr>
                                <td align="left"><h1 data-edit="invoice_title" style="margin: 0; color: #000000; font-size: 28px; font-family: Arial, sans-serif;">${c.invoice_title}</h1></td>
                                <td align="right" style="color: #000000; font-size: 13px; font-family: Arial, sans-serif;">
                                    <strong>{{agency_name}}</strong><br>
                                    Invoice #: {{invoice_number}}<br>
                                    Date: {{payment_date}}
                                </td>
                            </tr>
                        </table>
                        ${renderBodyImage(c)}
                        <div style="margin-bottom: 30px;">
                            <p data-edit="bill_to_label" style="color: #000000; margin-top: 0; margin-bottom: 5px; font-size: 13px; font-family: Arial, sans-serif;">${c.bill_to_label}</p>
                            <strong style="font-size: 18px; color: #000000; font-family: Arial, sans-serif;">{{customer_name}}</strong>
                        </div>
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <thead>
                                <tr style="background-color: #f8fafc;">
                                    <th data-edit="details_title" align="left" style="padding-top: 12px; padding-bottom: 12px; padding-left: 12px; border-bottom: 1px solid #e2e8f0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">${c.details_title}</th>
                                    <th align="right" style="padding-top: 12px; padding-bottom: 12px; padding-right: 12px; border-bottom: 1px solid #e2e8f0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">Amount</th>
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
                                    <td data-edit="total_label" align="right" style="padding: 12px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">${c.total_label}</td>
                                    <td align="right" style="padding: 12px; font-weight: bold; color: #2563eb; font-size: 20px; font-family: Arial, sans-serif;">₹{{total_amount}}</td>
                                </tr>
                            </tfoot>
                        </table>
                        <p data-edit="attachment_note" style="font-size: 13px; color: #000000; margin-top: 40px; font-family: Arial, sans-serif;">${c.attachment_note}</p>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    `.trim(),

    payment_receipt: (c) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr>
                    <td>
                        ${renderHeader(c)}
                        <p data-edit="hero_title" style="margin-top: 10px; margin-bottom: 15px; font-size: 16px; color: #000000; font-family: Arial, sans-serif;">${c.hero_title}</p>
                        ${renderBodyImage(c)}
                        <p data-edit="intro_text" style="line-height: 1.6; margin-bottom: 25px; white-space: pre-line; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">${c.intro_text}</p>
                        
                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">
                        
                        <h3 data-edit="details_title" style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 15px; font-family: Arial, sans-serif;">${c.details_title}</h3>
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Reference ID:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{booking_reference}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Package:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{package_name}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Amount Paid:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;">₹{{amount_paid}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Payment Method:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{payment_method}}</td>
                            </tr>
                            <tr>
                                <td width="50%" align="left" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;"><strong>Payment Date:</strong></td>
                                <td width="50%" align="right" style="padding-top: 5px; padding-bottom: 5px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{payment_date}}</td>
                            </tr>
                        </table>

                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">

                        <h3 data-edit="invoice_note_title" style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 10px; font-family: Arial, sans-serif;">${c.invoice_note_title}</h3>
                        <p data-edit="invoice_note_text" style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line; color: #000000; font-family: Arial, sans-serif;">${c.invoice_note_text}</p>

                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">

                        <h3 data-edit="important_note_title" style="color: #000000; font-size: 17px; margin-top: 0; margin-bottom: 10px; font-family: Arial, sans-serif;">${c.important_note_title}</h3>
                        <p data-edit="important_note_text" style="font-size: 14px; line-height: 1.6; margin-bottom: 25px; color: #000000; font-family: Arial, sans-serif;">${c.important_note_text}</p>

                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 25px; margin-bottom: 25px;">

                        <p data-edit="footer_note" style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line; color: #000000; font-family: Arial, sans-serif;">${c.footer_note}</p>
                        <p data-edit="footer_team" style="font-size: 14px; margin: 0; white-space: pre-line; color: #000000; font-family: Arial, sans-serif;">${c.footer_team}</p>
                        <div style="margin-top: 10px; font-size: 13px; font-family: Arial, sans-serif;">
                            <p style="margin-top: 3px; margin-bottom: 3px; color: #2563eb;">📧 {{agent_email}}</p>
                            <p style="margin-top: 3px; margin-bottom: 3px; color: #2563eb;">📞 {{agent_phone}}</p>
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
    `.trim(),

    booking_cancellation: (c) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="30" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 1px solid #fee2e2; border-top: 4px solid #ef4444;">
                <tr>
                    <td>
                        ${renderHeader(c)}
                        <h1 data-edit="hero_title" style="color: #991b1b; margin-top: 10px; margin-bottom: 15px; font-size: 24px; font-family: Arial, sans-serif;">${c.hero_title}</h1>
                        ${renderBodyImage(c)}
                        <p data-edit="intro_text" style="color: #334155; line-height: 1.6; font-family: Arial, sans-serif; font-size: 14px;">${c.intro_text}</p>
                        <table width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fee2e2; margin-top: 25px; margin-bottom: 25px; border-collapse: collapse;">
                            <tr>
                                <td>
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                        <tr>
                                            <td align="left"><p data-edit="details_title" style="margin: 0; color: #991b1b; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;">${c.details_title}</p></td>
                                            <td align="right"><p style="margin: 0; font-size: 24px; font-weight: bold; color: #000000; font-family: Arial, sans-serif;">₹{{refund_amount}}</p></td>
                                        </tr>
                                    </table>
                                    <p data-edit="summary_label" style="margin-top: 5px; margin-bottom: 0; font-size: 14px; color: #b91c1c; font-family: Arial, sans-serif;">${c.summary_label}</p>
                                </td>
                            </tr>
                        </table>
                        <p data-edit="closing_text" style="color: #334155; font-family: Arial, sans-serif; font-size: 14px;">${c.closing_text}</p>
                        <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <p style="margin: 0; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">
                                <span data-edit="footer_note">${c.footer_note}</span><br>
                                <strong data-edit="footer_team">${c.footer_team}</strong>
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
    `.trim(),

    trip_reminder: (c) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #eff6ff;">
            <!--[if mso]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
            <tr>
            <td align="center" valign="top" width="600" style="width:600px;">
            <![endif]-->
            <table width="100%" border="0" cellpadding="40" cellspacing="0" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; text-align: center;">
                <tr>
                    <td>
                        ${renderHeader(c)}
                        <div style="font-size: 48px; margin-bottom: 20px;">✈️</div>
                        <h1 data-edit="hero_title" style="color: #1e40af; margin-top: 0; margin-bottom: 0; font-size: 28px; font-family: Arial, sans-serif;">${c.hero_title}</h1>
                        <p data-edit="hero_subtitle" style="color: #1e3a8a; font-size: 18px; margin-top: 10px; margin-bottom: 0; font-family: Arial, sans-serif;">${c.hero_subtitle}</p>
                        ${renderBodyImage(c)}
                        <table width="100%" border="0" cellpadding="30" cellspacing="0" style="background-color: #ffffff; margin-top: 30px; margin-bottom: 30px; border-collapse: collapse;">
                            <tr>
                                <td align="left">
                                    <p data-edit="intro_text" style="margin-top: 0; margin-bottom: 20px; line-height: 1.6; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">${c.intro_text}</p>
                                    <table width="100%" border="0" cellpadding="15" cellspacing="0" style="background-color: #f8fafc; border-collapse: collapse;">
                                        <tr>
                                            <td align="center" style="font-size: 20px; font-weight: bold; color: #2563eb; font-family: Arial, sans-serif;">{{departure_date}}</td>
                                        </tr>
                                    </table>
                                    <p data-edit="message_text" style="margin-top: 20px; margin-bottom: 10px; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">${c.message_text}</p>
                                    <p style="margin: 0; font-weight: bold; color: #000000; font-family: Arial, sans-serif; font-size: 14px;">{{agent_name}} | {{agent_contact}}</p>
                                </td>
                            </tr>
                        </table>
                        <p data-edit="footer_note" style="font-size: 12px; color: #000000; font-family: Arial, sans-serif; margin: 0;">${c.footer_note}</p>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    `.trim()
};

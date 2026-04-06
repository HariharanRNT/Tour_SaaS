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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white;">
            ${renderHeader(c)}
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center; color: white;">
                <h1 data-edit="hero_title" style="margin: 0; font-size: 24px;">${c.hero_title}</h1>
                <p data-edit="hero_subtitle" style="opacity: 0.8; margin-top: 8px; font-size: 14px;">${c.hero_subtitle}</p>
            </div>
            <div style="padding: 30px; color: #000000;">
                ${renderBodyImage(c)}
                <p data-edit="intro_text" style="line-height: 1.6;">${c.intro_text}</p>
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #f1f5f9;">
                    <h2 data-edit="details_title" style="margin-top: 0; font-size: 16px; color: #000000;">${c.details_title}</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #000000;">Reference ID:</td><td style="text-align: right; font-weight: bold;">{{booking_reference}}</td></tr>
                        <tr><td style="padding: 8px 0; color: #000000;">Package:</td><td style="text-align: right; font-weight: bold;">{{package_name}}</td></tr>
                        <tr><td style="padding: 8px 0; color: #000000;">Travel Date:</td><td style="text-align: right; font-weight: bold;">{{travel_date}}</td></tr>
                    </table>
                </div>
                <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #000000; font-size: 14px;">
                    <p style="margin: 0;"><span data-edit="footer_note">${c.footer_note}</span><br><strong data-edit="footer_team">${c.footer_team}</strong></p>
                </div>
            </div>
        </div>
    `.trim(),

    travel_itinerary: (c) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white;">
            ${renderHeader(c)}
            <div style="background: #1e293b; padding: 25px; text-align: center; color: white;">
                <h1 data-edit="hero_title" style="margin: 0; font-size: 22px;">${c.hero_title}</h1>
                <p data-edit="hero_subtitle" style="opacity: 0.8; margin-top: 5px; font-size: 14px;">${c.hero_subtitle}</p>
            </div>
            <div style="padding: 30px; color: #000000;">
                ${renderBodyImage(c)}
                <p data-edit="intro_text" style="line-height: 1.6;">${c.intro_text}</p>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; font-style: italic; color: #000000;">{{itinerary_summary}}</p>
                </div>
                <p data-edit="attachment_note" style="font-size: 14px;">${c.attachment_note}</p>
                <p data-edit="closing_text" style="font-weight: bold; color: #000000;">${c.closing_text}</p>
                <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #000000; border-top: 1px solid #f1f5f9; pt: 20px;">
                    <p>© {{agency_name}}. All rights reserved.</p>
                </div>
            </div>
        </div>
    `.trim(),

    booking_invoice: (c) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; background: white;">
            ${renderHeader(c)}
            <table style="width: 100%; border-bottom: 2px solid #000000; padding-bottom: 20px; margin-bottom: 30px;">
                <tr>
                    <td><h1 data-edit="invoice_title" style="margin: 0; color: #000000; font-size: 28px;">${c.invoice_title}</h1></td>
                    <td style="text-align: right; color: #000000; font-size: 13px;">
                        <strong>{{agency_name}}</strong><br>
                        Invoice #: {{invoice_number}}<br>
                        Date: {{payment_date}}
                    </td>
                </tr>
            </table>
            ${renderBodyImage(c)}
            <div style="margin-bottom: 30px;">
                <p data-edit="bill_to_label" style="color: #000000; margin-bottom: 5px; font-size: 13px;">${c.bill_to_label}</p>
                <strong style="font-size: 18px;">{{customer_name}}</strong>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f8fafc;">
                        <th data-edit="details_title" style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">${c.details_title}</th>
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
                        <td data-edit="total_label" style="padding: 12px; text-align: right; font-weight: bold;">${c.total_label}</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold; color: #2563eb; font-size: 20px;">₹{{total_amount}}</td>
                    </tr>
                </tfoot>
            </table>
            <p data-edit="attachment_note" style="font-size: 13px; color: #000000; margin-top: 40px;">${c.attachment_note}</p>
        </div>
    `.trim(),

    payment_receipt: (c) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; background-color: white; padding: 40px; color: #000000;">
            ${renderHeader(c)}
            <p data-edit="hero_title" style="margin-top: 10px; font-size: 16px;">${c.hero_title}</p>
            ${renderBodyImage(c)}
            <p data-edit="intro_text" style="line-height: 1.6; margin-bottom: 25px; white-space: pre-line;">${c.intro_text}</p>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">
            
            <h3 data-edit="details_title" style="color: #000000; font-size: 17px; margin-bottom: 15px; display: flex; align-items: center;">${c.details_title}</h3>
            <div style="padding-left: 20px;">
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 2;">
                    <li><strong>Reference ID:</strong> {{booking_reference}}</li>
                    <li><strong>Package:</strong> {{package_name}}</li>
                    <li><strong>Amount Paid:</strong> ₹{{amount_paid}}</li>
                    <li><strong>Payment Method:</strong> {{payment_method}}</li>
                    <li><strong>Payment Date:</strong> {{payment_date}}</li>
                </ul>
            </div>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">

            <h3 data-edit="invoice_note_title" style="color: #000000; font-size: 17px; margin-bottom: 10px;">${c.invoice_note_title}</h3>
            <p data-edit="invoice_note_text" style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line;">${c.invoice_note_text}</p>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">

            <h3 data-edit="important_note_title" style="color: #000000; font-size: 17px; margin-bottom: 10px;">${c.important_note_title}</h3>
            <p data-edit="important_note_text" style="font-size: 14px; line-height: 1.6; margin-bottom: 25px; color: #000000;">${c.important_note_text}</p>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">

            <p data-edit="footer_note" style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line;">${c.footer_note}</p>
            <p data-edit="footer_team" style="font-size: 14px; margin: 0; white-space: pre-line;">${c.footer_team}</p>
            <div style="margin-top: 10px; font-size: 13px;">
                <p style="margin: 3px 0; color: #2563eb;">📧 {{agent_email}}</p>
                <p style="margin: 3px 0; color: #2563eb;">📞 {{agent_phone}}</p>
            </div>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
                <p>© RNT Travel. This is an automated notification.</p>
            </div>
        </div>
    `.trim(),

    booking_cancellation: (c) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-top: 4px solid #ef4444; padding: 30px; background: white;">
            ${renderHeader(c)}
            <h1 data-edit="hero_title" style="color: #991b1b; margin-top: 10px; font-size: 24px;">${c.hero_title}</h1>
            ${renderBodyImage(c)}
            <p data-edit="intro_text" style="color: #334155; line-height: 1.6;">${c.intro_text}</p>
            <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #fee2e2;">
                <p data-edit="details_title" style="margin: 0; color: #991b1b; font-weight: bold;">${c.details_title}</p>
                <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold;">₹{{refund_amount}}</p>
                <p data-edit="summary_label" style="margin: 5px 0 0; font-size: 14px; color: #b91c1c;">${c.summary_label}</p>
            </div>
            <p data-edit="closing_text" style="color: #334155;">${c.closing_text}</p>
            <div style="margin-top: 30px; font-size: 14px; color: #000000; border-top: 1px solid #f1f5f9; pt: 20px;">
                <p style="margin: 0;"><span data-edit="footer_note">${c.footer_note}</span><br><strong data-edit="footer_team">${c.footer_team}</strong></p>
            </div>
        </div>
    `.trim(),

    trip_reminder: (c) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #eff6ff; border-radius: 12px; padding: 40px; text-align: center;">
            ${renderHeader(c)}
            <div style="font-size: 48px; margin-bottom: 20px;">✈️</div>
            <h1 data-edit="hero_title" style="color: #1e40af; margin: 0; font-size: 28px;">${c.hero_title}</h1>
            <p data-edit="hero_subtitle" style="color: #1e3a8a; font-size: 18px; margin-top: 10px;">${c.hero_subtitle}</p>
            ${renderBodyImage(c)}
            <div style="background-color: white; border-radius: 12px; padding: 30px; margin: 30px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: left; color: #000000;">
                <p data-edit="intro_text" style="margin-top: 0; line-height: 1.6;">${c.intro_text}</p>
                <p style="font-size: 20px; font-weight: bold; color: #2563eb; text-align: center; background: #f8fafc; padding: 15px; border-radius: 8px;">{{departure_date}}</p>
                <p data-edit="message_text" style="margin-bottom: 10px;">${c.message_text}</p>
                <p style="margin: 0; font-weight: bold;">{{agent_name}} | {{agent_contact}}</p>
            </div>
            <p data-edit="footer_note" style="font-size: 12px; color: #000000;">${c.footer_note}</p>
        </div>
    `.trim()
};

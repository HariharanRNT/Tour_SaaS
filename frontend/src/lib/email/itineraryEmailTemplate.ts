interface EmailTemplateProps {
  agentName: string;
  agencyName: string;
  agentLogo?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentWebsite?: string;
  packageName: string;
  destination: string;
  duration: string;
  basePrice: string;
}

export const buildItineraryEmailHtml = (props: EmailTemplateProps) => {
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .header { background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 1px solid #e2e8f0; }
          .logo { max-height: 60px; margin-bottom: 15px; }
          .agency-name { font-size: 24px; font-weight: bold; color: #1e293b; margin: 0; }
          .content { padding: 40px 30px; background-color: #ffffff; }
          .greeting { font-size: 18px; margin-bottom: 25px; color: #1e293b; }
          .package-card { background-color: #f1f5f9; border-radius: 8px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #3b82f6; }
          .package-name { font-size: 22px; font-weight: 800; color: #1e293b; margin-top: 0; margin-bottom: 15px; }
          .detail-item { margin-bottom: 10px; display: flex; align-items: center; }
          .detail-label { font-weight: bold; width: 120px; color: #64748b; font-size: 14px; }
          .detail-value { color: #1e293b; font-weight: 600; }
          .pdf-note { background-color: #ecfdf5; color: #065f46; padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 30px; text-align: center; }
          .divider { border-top: 1px solid #e2e8f0; margin: 30px 0; }
          .regards { margin-top: 30px; }
          .regards-title { font-weight: bold; margin-bottom: 10px; color: #1e293b; }
          .agent-info { font-size: 14px; color: #64748b; margin-bottom: 5px; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${props.agentLogo ? `<img src="${props.agentLogo}" alt="${props.agencyName}" class="logo">` : ''}
            <h1 class="agency-name">${props.agencyName}</h1>
          </div>
          <div class="content">
            <p class="greeting">Hello,</p>
            
            <div class="package-card">
              <h2 class="package-name">${props.packageName}</h2>
              <div class="detail-item">
                <span class="detail-label">Destination:</span>
                <span class="detail-value">${props.destination}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${props.duration}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Base Price:</span>
                <span class="detail-value">${props.basePrice}</span>
              </div>
            </div>
            
            <div class="pdf-note">
              <strong>📎 Full Itinerary Attached:</strong> We've attached the complete day-wise itinerary PDF to this email for your reference.
            </div>
            
            <div class="pdf-note">
              <strong>Warm Regards,</strong>
              <p>${props.agencyName}</p>
              
            </div>
            <div class="divider"></div>
            
            
          </div>
          <div class="footer">
            &copy; ${currentYear} ${props.agencyName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
};

from typing import Dict, Any

def get_agent_registration_pending_template(data: Dict[str, Any]) -> str:
    """Template for Agent: Registration Received – Awaiting Approval"""
    agent_name = data.get("agent_name", "Agent")
    return f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Registration Received</h1>
            <p style="opacity: 0.8; margin-top: 8px; font-size: 14px;">Awaiting Admin Approval</p>
        </div>
        <div style="padding: 30px; color: #334155;">
            <p style="line-height: 1.6;">Hello {agent_name},</p>
            <p style="line-height: 1.6;">Your registration for the <strong>Tour Project</strong> has been received. Our team is currently reviewing your application.</p>
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #f1f5f9; text-align: center;">
                <p style="margin: 0; color: #1e293b; font-weight: bold;">Status: Pending Approval</p>
            </div>
            <p style="line-height: 1.6;">Once the admin approves your account, you will receive a confirmation email and will be able to access the application and start managing your tours.</p>
            <p style="line-height: 1.6;">Thank you for your patience.</p>
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">Best Regards,<br><strong>RNT Tour Team</strong></p>
            </div>
        </div>
    </div>
    """

def get_admin_new_registration_request_template(data: Dict[str, Any]) -> str:
    """Template for Admin: New Agent Registration Request"""
    agent_name = data.get("agent_name", "A new agent")
    agency_name = data.get("agency_name", "N/A")
    email = data.get("email", "N/A")
    return f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white;">
        <div style="background: #1e293b; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">New Agent Registration</h1>
            <p style="opacity: 0.8; margin-top: 8px; font-size: 14px;">Action Required: Review & Approve</p>
        </div>
        <div style="padding: 30px; color: #334155;">
            <p style="line-height: 1.6;">Hello Admin,</p>
            <p style="line-height: 1.6;">A new agent has registered on the platform and is awaiting your verification.</p>
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #f1f5f9;">
                <h3 style="margin-top: 0; font-size: 16px; color: #1e293b;">Agent Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 8px 0; color: #64748b;">Name:</td><td style="text-align: right; font-weight: bold;">{agent_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Agency:</td><td style="text-align: right; font-weight: bold;">{agency_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Email:</td><td style="text-align: right; font-weight: bold;">{email}</td></tr>
                </table>
            </div>
            <p style="line-height: 1.6; text-align: center;">Please log in to the admin dashboard to verify and approve or decline the registration.</p>
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;"><strong>RNT Tour System Alert</strong></p>
            </div>
        </div>
    </div>
    """

def get_agent_approved_template(data: Dict[str, Any]) -> str:
    """Template for Agent: Registration Approved"""
    agent_name = data.get("agent_name", "Agent")
    return f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #dcfce7; border-radius: 12px; overflow: hidden; background: white;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Registration Approved</h1>
            <p style="opacity: 0.8; margin-top: 8px; font-size: 14px;">Welcome to RNT Tour</p>
        </div>
        <div style="padding: 30px; color: #334155;">
            <p style="line-height: 1.6;">Hello {agent_name},</p>
            <p style="line-height: 1.6;">Great news! Your profile has been <strong>approved</strong> by the administrator.</p>
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #bbf7d0; text-align: center;">
                <p style="margin: 0; color: #166534; font-weight: bold;">Status: Active</p>
            </div>
            <p style="line-height: 1.6;">You can now access the application and start setting up your agency profile and tour packages.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
            </div>
            <p style="line-height: 1.6;">We are excited to have you on board!</p>
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">Best Regards,<br><strong>RNT Tour Team</strong></p>
            </div>
        </div>
    </div>
    """

def get_agent_rejected_template(data: Dict[str, Any]) -> str:
    """Template for Agent: Registration Declined"""
    agent_name = data.get("agent_name", "Agent")
    return f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; background: white;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Registration Declined</h1>
            <p style="opacity: 0.8; margin-top: 8px; font-size: 14px;">Application Status Update</p>
        </div>
        <div style="padding: 30px; color: #334155;">
            <p style="line-height: 1.6;">Hello {agent_name},</p>
            <p style="line-height: 1.6;">Thank you for your interest in the Tour Project. After reviewing your application, we regret to inform you that your registration has been <strong>declined</strong> at this time.</p>
            <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #fee2e2; text-align: center;">
                <p style="margin: 0; color: #991b1b; font-weight: bold;">Status: Declined</p>
            </div>
            <p style="line-height: 1.6;">Please contact our support team for more information or if you have any questions regarding this decision.</p>
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">Regards,<br><strong>RNT Tour Support Team</strong></p>
            </div>
        </div>
    </div>
    """

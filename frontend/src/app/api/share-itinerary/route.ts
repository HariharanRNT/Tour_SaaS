import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { emailShareSchema } from '@/lib/validations/emailShare';
import { buildItineraryEmailHtml } from '@/lib/email/itineraryEmailTemplate';
import fernet from 'fernet';
import crypto from 'crypto';

// Rate limiting map: ip -> { count, startTime }
const rateLimitMap = new Map<string, { count: number; startTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

// DB Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1243@localhost:5432/tour_saas',
});

// Decryption helper
function decryptValue(encryptedValue: string): string {
  if (!encryptedValue) return '';
  if (encryptedValue.startsWith('plain:')) return encryptedValue.substring(6);

  try {
    // Derive key exactly like in Python backend
    const secretKey = 'dev-secret-key-change-in-production-12345'; // Fallback to dev secret
    const hash = crypto.createHash('sha256').update(secretKey).digest();
    const keyStr = hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    
    const secret = new fernet.Secret(keyStr);
    const token = new fernet.Token({
      secret: secret,
      token: encryptedValue,
      ttl: 0,
    });
    return token.decode();
  } catch (err) {
    console.error('Decryption failed:', err);
    return encryptedValue; // Fallback to original if decryption fails
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous';
  
  // 1. Rate Limiting
  const now = Date.now();
  const limitInfo = rateLimitMap.get(ip);

  if (limitInfo) {
    if (now - limitInfo.startTime < RATE_LIMIT_WINDOW) {
      if (limitInfo.count >= MAX_REQUESTS) {
        return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
      }
      limitInfo.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, startTime: now });
    }
  } else {
    rateLimitMap.set(ip, { count: 1, startTime: now });
  }

  try {
    const body = await req.json();
    const { recipientEmail, packageId, agentId } = body;

    // 2. Validation
    const validation = emailShareSchema.safeParse({ recipientEmail });
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    if (!packageId || !agentId) {
      return NextResponse.json({ error: 'Missing packageId or agentId' }, { status: 400 });
    }

    // 3. Fetch Data from DB
    const client = await pool.connect();
    try {
      // Fetch Agent & SMTP Settings
      const agentRes = await client.query(`
        SELECT a.*, s.host, s.port, s.username, s.password, s.encryption_type, s.from_email, s.from_name
        FROM agents a
        LEFT JOIN agent_smtp_settings s ON a.id = s.agent_id
        WHERE a.user_id = $1
      `, [agentId]);

      if (agentRes.rows.length === 0) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      const agentData = agentRes.rows[0];

      // Fetch Package
      const packageRes = await client.query('SELECT * FROM packages WHERE id = $1', [packageId]);
      if (packageRes.rows.length === 0) {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }

      const packageData = packageRes.rows[0];

      // 4. Decrypt SMTP Password
      const decryptedPassword = decryptValue(agentData.password);

      // 5. Generate PDF (Fetch from Python API)
      const pythonApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const pdfRes = await fetch(`${pythonApiUrl}/api/v1/packages/${packageId}/itinerary-pdf`);
      
      if (!pdfRes.ok) {
        throw new Error('Failed to generate itinerary PDF');
      }

      const pdfBuffer = await pdfRes.arrayBuffer();

      // 6. Create Transporter
      const transporter = nodemailer.createTransport({
        host: agentData.host,
        port: agentData.port,
        secure: agentData.encryption_type === 'ssl',
        auth: {
          user: agentData.username,
          pass: decryptedPassword,
        },
      });

      // 7. Build Email
      const emailHtml = buildItineraryEmailHtml({
        agentName: `${agentData.first_name} ${agentData.last_name}`,
        agencyName: agentData.agency_name || 'Our Agency',
        agentLogo: agentData.homepage_settings?.navbar_logo_image || agentData.homepage_settings?.logo,
        agentPhone: agentData.phone,
        agentEmail: agentData.from_email || agentData.username,
        agentWebsite: agentData.domain ? `https://${agentData.domain}` : undefined,
        packageName: packageData.title,
        destination: packageData.destination,
        duration: `${packageData.duration_days} Days & ${packageData.duration_nights} Nights`,
        basePrice: `₹${Number(packageData.price_per_person).toLocaleString()}`,
      });

      // 8. Send Email
      await transporter.sendMail({
        from: `"${agentData.from_name || agentData.agency_name}" <${agentData.from_email || agentData.username}>`,
        to: recipientEmail,
        subject: `${packageData.title} - Your Itinerary from ${agentData.agency_name || agentData.first_name}`,
        html: emailHtml,
        attachments: [
          {
            filename: `${packageData.title.replace(/\s+/g, '-')}-Itinerary.pdf`,
            content: Buffer.from(pdfBuffer),
            contentType: 'application/pdf',
          },
        ],
      });

      return NextResponse.json({ message: 'Email sent successfully' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('API share itinerary error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

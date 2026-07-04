import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createHmac, timingSafeEqual } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY!);
const HOOK_SECRET = process.env.SUPABASE_HOOK_SECRET!; // format: v1,whsec_<base64>
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://owcsle.xyz';
const FROM = 'OWCSLE <noreply@owcsle.xyz>';

function verifyWebhook(secret: string, webhookId: string, webhookTimestamp: string, body: string, signature: string): boolean {
  try {
    // Strip "v1,whsec_" prefix and decode base64 key
    const keyBase64 = secret.replace(/^v1,whsec_/, '');
    const key = Buffer.from(keyBase64, 'base64');
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    const expected = createHmac('sha256', key).update(signedContent).digest('base64');
    // signature header may contain multiple: "v1,sig1 v1,sig2"
    return signature.split(' ').some(sig => {
      const sigValue = sig.replace(/^v1,/, '');
      try { return timingSafeEqual(Buffer.from(sigValue, 'base64'), Buffer.from(expected, 'base64')); }
      catch { return false; }
    });
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const webhookId = request.headers.get('webhook-id') || '';
  const webhookTimestamp = request.headers.get('webhook-timestamp') || '';
  const webhookSignature = request.headers.get('webhook-signature') || '';

  if (!verifyWebhook(HOOK_SECRET, webhookId, webhookTimestamp, body, webhookSignature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const { user, email_data } = payload;

  if (!user?.email || !email_data) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { email_action_type, token_hash } = email_data;
  const confirmUrl = `${SITE_URL}/auth/confirm?token_hash=${token_hash}&type=${email_action_type}`;

  let subject = '';
  let html = '';

  if (email_action_type === 'signup') {
    subject = 'Confirm your OWCSLE account';
    html = emailTemplate({
      heading: 'CONFIRM YOUR ACCOUNT',
      body: 'Thanks for signing up! Click the button below to confirm your email address and get started.',
      buttonText: 'CONFIRM EMAIL',
      buttonUrl: confirmUrl,
    });
  } else if (email_action_type === 'recovery') {
    subject = 'Reset your OWCSLE password';
    html = emailTemplate({
      heading: 'RESET PASSWORD',
      body: 'You requested a password reset. Click the button below to choose a new password. If you did not request this, ignore this email.',
      buttonText: 'RESET PASSWORD',
      buttonUrl: confirmUrl,
    });
  } else if (email_action_type === 'email_change') {
    subject = 'Confirm your new OWCSLE email';
    html = emailTemplate({
      heading: 'CONFIRM EMAIL CHANGE',
      body: 'Click the button below to confirm your new email address.',
      buttonText: 'CONFIRM NEW EMAIL',
      buttonUrl: confirmUrl,
    });
  } else if (email_action_type === 'magiclink') {
    subject = 'Your OWCSLE login link';
    html = emailTemplate({
      heading: 'LOGIN LINK',
      body: 'Click the button below to sign in. This link expires in 1 hour.',
      buttonText: 'SIGN IN',
      buttonUrl: confirmUrl,
    });
  } else {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject,
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function emailTemplate({ heading, body, buttonText, buttonUrl }: {
  heading: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#111;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr><td style="background:#0d0d0d;padding:20px 28px;border-bottom:2px solid #f97316;">
          <span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:0.05em;">
            <span style="color:#f97316;">OWCS</span>LE
          </span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 28px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#f97316;letter-spacing:0.1em;">${heading}</p>
          <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;">${body}</p>
          <a href="${buttonUrl}" style="display:inline-block;padding:12px 28px;background:#f97316;color:#fff;text-decoration:none;border-radius:3px;font-size:12px;font-weight:700;letter-spacing:0.08em;">${buttonText}</a>
          <p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">Or copy this link: <a href="${buttonUrl}" style="color:rgba(249,115,22,0.7);word-break:break-all;">${buttonUrl}</a></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.2);">OWCSLE · owcsle.xyz · If you didn't request this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

import nodemailer from 'nodemailer';
import {
  renderPickupConfirmationHtml,
  renderPaymentConfirmationHtml,
  renderInviteEmailHtml,
  type PickupEmailProps,
  type PaymentEmailProps,
  type InviteEmailProps,
} from './templates';

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  success: boolean;
  provider: 'brevo' | 'smtp' | 'none';
  messageId?: string;
  error?: string;
}

// Default verified fallback credentials for GoWashGo deployment
const DEFAULT_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_SMTP_USER = 'nowellandal71@gmail.com';
const DEFAULT_SMTP_PASS = 'dubkdbpxtcypluoj';
const DEFAULT_FROM = 'nowellandal71@gmail.com';

/**
 * Resolve the dynamic application base URL for links embedded in emails.
 */
export function getAppBaseUrl(request?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    if (host) {
      return `${proto}://${host}`;
    }
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://gowashgo.vercel.app';
}

/**
 * Universal email sender:
 * 1. Uses Brevo REST API v3 as primary transactional provider (if configured in environment).
 * 2. Automatically falls back to verified Gmail SMTP which delivers reliably across all serverless environments.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, toName, subject, html } = options;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SMTP_FROM || DEFAULT_FROM;
  const fromName = 'GoWashGo Laundry';

  let brevoFailedReason = '';

  // -------------------------------------------------------------
  // 1. Try Brevo REST API (Transactional Email v3)
  // -------------------------------------------------------------
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [
            {
              email: to,
              name: toName || to,
            },
          ],
          subject,
          htmlContent: html,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.messageId) {
        console.log(`[Brevo Email Sent] -> To: ${to} | Subject: "${subject}" | MsgId: ${data.messageId}`);
        return {
          success: true,
          provider: 'brevo',
          messageId: data.messageId,
        };
      }

      brevoFailedReason = data.message || `HTTP ${response.status}`;
      console.warn('[Brevo API Warning] Brevo response failed, immediately falling back to Gmail SMTP:', brevoFailedReason);
    } catch (err: any) {
      brevoFailedReason = err.message || 'Network error';
      console.warn('[Brevo API Error] Request failed, immediately falling back to Gmail SMTP:', brevoFailedReason);
    }
  }

  // -------------------------------------------------------------
  // 2. Reliable Fallback to Gmail SMTP via Nodemailer
  // -------------------------------------------------------------
  const smtpHost = process.env.SMTP_HOST || DEFAULT_SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || String(DEFAULT_SMTP_PORT), 10);
  const smtpUser = process.env.SMTP_USER || DEFAULT_SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || DEFAULT_SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toName ? `"${toName}" <${to}>` : to,
        subject,
        html,
      });

      console.log(`[Gmail SMTP Sent] -> To: ${to} | Subject: "${subject}" | MsgId: ${info.messageId}`);
      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
      };
    } catch (smtpErr: any) {
      console.error('[Gmail SMTP Error] Failed to send email via SMTP:', smtpErr);
      return {
        success: false,
        provider: 'none',
        error: `Brevo: ${brevoFailedReason || 'skipped'} | SMTP: ${smtpErr.message}`,
      };
    }
  }

  console.error('[Email Dispatch Failed] Neither Brevo nor SMTP credentials configured.');
  return {
    success: false,
    provider: 'none',
    error: 'No email service configured',
  };
}

/**
 * Send Pickup Confirmation Email to Customer
 */
export async function sendPickupConfirmationEmail(props: PickupEmailProps, toEmail: string) {
  const html = renderPickupConfirmationHtml(props);
  const subject = `Laundry Picked Up — Order ${props.orderNumber} is En Route to WashGo Hub`;
  return sendEmail({
    to: toEmail,
    toName: props.customerName,
    subject,
    html,
  });
}

/**
 * Send Payment Confirmation Receipt Email to Customer
 */
export async function sendPaymentConfirmationEmail(props: PaymentEmailProps, toEmail: string) {
  const html = renderPaymentConfirmationHtml(props);
  const subject = `Payment Confirmed — Receipt for Order ${props.orderNumber}`;
  return sendEmail({
    to: toEmail,
    toName: props.customerName,
    subject,
    html,
  });
}

/**
 * Send Staff or Rider Team Invite Email
 */
export async function sendTeamInviteEmail(props: InviteEmailProps, toEmail: string) {
  const html = renderInviteEmailHtml(props);
  const roleTitle = props.role === 'rider' ? 'Delivery Courier Rider' : props.role === 'staff' ? 'Facility Laundry Staff' : 'Branch Manager';
  const subject = `Invitation: Join GoWashGo as ${roleTitle} (${props.branchName})`;
  return sendEmail({
    to: toEmail,
    toName: toEmail,
    subject,
    html,
  });
}

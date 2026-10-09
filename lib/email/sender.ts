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

/**
 * Universal email sender:
 * 1. Uses Brevo REST API v3 as primary transactional provider.
 * 2. Automatically falls back to verified Gmail SMTP if Brevo encounters an issue.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, toName, subject, html } = options;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SMTP_FROM || 'nowellandal71@gmail.com';
  const fromName = 'GoWashGo Laundry';

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

      console.warn('[Brevo API Warning] Non-OK response, falling back to Gmail SMTP:', data);
    } catch (err: any) {
      console.warn('[Brevo API Error] Request failed, falling back to Gmail SMTP:', err.message);
    }
  }

  // -------------------------------------------------------------
  // 2. Fallback to Gmail SMTP via Nodemailer
  // -------------------------------------------------------------
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || 'nowellandal71@gmail.com';
  const smtpPass = process.env.SMTP_PASS;

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
        error: smtpErr.message,
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

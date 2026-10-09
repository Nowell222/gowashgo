/**
 * Clean, mobile-responsive HTML email templates matching GoWashGo brand:
 * Soap Teal (#0E7490), Deep Marine (#164E63), Warm Amber (#D97706), Natural Linen (#FAF8F5).
 */

interface BaseEmailProps {
  appUrl?: string;
}

export interface PickupEmailProps extends BaseEmailProps {
  customerName: string;
  orderNumber: string;
  weightKg?: number | null;
  totalCentavos?: number | null;
  riderName?: string | null;
  pickupAddress: string;
  pickupTime?: string | null;
  trackingUrl: string;
}

export interface PaymentEmailProps extends BaseEmailProps {
  customerName: string;
  orderNumber: string;
  amountCentavos: number;
  paymentMethod: string;
  paidAt: string;
  receiptUrl?: string | null;
}

export interface InviteEmailProps extends BaseEmailProps {
  recipientEmail: string;
  role: string;
  branchName: string;
  inviterName: string;
  inviteCode: string;
  inviteUrl: string;
}

function formatPesoFromCentavos(centavos?: number | null): string {
  if (centavos == null || isNaN(centavos)) return '₱0.00';
  return `₱${(centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 1. Pickup Confirmation Email Template
 */
export function renderPickupConfirmationHtml(props: PickupEmailProps): string {
  const { customerName, orderNumber, weightKg, totalCentavos, riderName, pickupAddress, trackingUrl } = props;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pickup Confirmed — ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 16px rgba(14, 116, 144, 0.06);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #164E63; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">gowashgo</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(103, 232, 249, 0.15); color: #67E8F9; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Pickup Confirmed
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                Your laundry is on the way to our hub!
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>${customerName}</strong>, our courier <strong>${riderName || 'your GoWashGo driver'}</strong> has securely collected your laundry. The bag was weighed at your gate with a certified hanging scale and is now en route to our San Juan washing facility.
              </p>

              <!-- Order Summary Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ECFEFF; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid #CFFAFE;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Order Number</span>
                          <div style="font-size: 17px; font-weight: 800; color: #164E63; font-family: monospace; margin-top: 2px;">${orderNumber}</div>
                        </td>
                        <td align="right" style="padding-bottom: 12px; border-bottom: 1px solid #CFFAFE;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Doorstep Weight</span>
                          <div style="font-size: 17px; font-weight: 800; color: #164E63; margin-top: 2px;">
                            ${weightKg ? `${weightKg} kg` : 'Standard Load'}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 12px;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Pickup Address</span>
                          <div style="font-size: 13px; color: #334155; margin-top: 2px;">${pickupAddress}</div>
                        </td>
                        <td align="right" style="padding-top: 12px;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Total Estimated</span>
                          <div style="font-size: 18px; font-weight: 800; color: #0E7490; margin-top: 2px;">
                            ${formatPesoFromCentavos(totalCentavos)}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 13px; color: #475569; line-height: 1.6;">
                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 6px;">Next Wash Steps:</div>
                    1. Inspection & Sorting: Our staff checks care tags and garment fabrics.<br>
                    2. Temperature-controlled wash & tumble dry.<br>
                    3. Crisp folding and dispatch back to your door.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #0E7490; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 3px; letter-spacing: 0.02em;">
                      Track Wash Progress in Real Time &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B;">
              <div>GoWashGo — General Luna St., Poblacion, San Juan, Batangas</div>
              <div style="margin-top: 4px;">Smart laundry pickup with doorstep calibrated hanging scale weighing.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 2. Online Payment Receipt Confirmation Template
 */
export function renderPaymentConfirmationHtml(props: PaymentEmailProps): string {
  const { customerName, orderNumber, amountCentavos, paymentMethod, paidAt, receiptUrl } = props;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt — ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 16px rgba(14, 116, 144, 0.06);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #047857; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">gowashgo</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Payment Confirmed ✓
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                Payment received, thank you!
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>${customerName}</strong>, we have received your online payment of <strong>${formatPesoFromCentavos(amountCentavos)}</strong> for laundry order <strong>${orderNumber}</strong>.
              </p>

              <!-- Receipt Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <span style="font-size: 12px; color: #065F46;">Amount Paid</span>
                        </td>
                        <td align="right" style="padding-bottom: 10px;">
                          <strong style="font-size: 18px; color: #047857;">${formatPesoFromCentavos(amountCentavos)}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <span style="font-size: 12px; color: #065F46;">Payment Method</span>
                        </td>
                        <td align="right" style="padding-bottom: 10px;">
                          <strong style="font-size: 13px; color: #065F46; text-transform: uppercase;">${paymentMethod}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <span style="font-size: 12px; color: #065F46;">Order Number</span>
                        </td>
                        <td align="right" style="padding-bottom: 10px;">
                          <strong style="font-size: 13px; color: #065F46; font-family: monospace;">${orderNumber}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 12px; color: #065F46;">Transaction Date</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 12px; color: #065F46;">${paidAt}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Link -->
              ${receiptUrl ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${receiptUrl}" target="_blank" style="display: inline-block; background-color: #047857; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 3px; letter-spacing: 0.02em;">
                      View Order &amp; Full Receipt &rarr;
                    </a>
                  </td>
                </tr>
              </table>` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B;">
              <div>GoWashGo — San Juan Batangas Hub</div>
              <div style="margin-top: 4px;">Official electronic receipt generated for your records.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 3. Staff & Rider Team Invite Email Template
 */
export function renderInviteEmailHtml(props: InviteEmailProps): string {
  const { role, branchName, inviterName, inviteUrl, inviteCode } = props;
  const roleTitle = role === 'rider' ? 'Delivery Courier Rider' : role === 'staff' ? 'Facility Laundry Staff' : 'Branch Manager';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join GoWashGo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 16px rgba(14, 116, 144, 0.06);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0E7490; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">gowashgo</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Team Invitation
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                You're invited to join the team!
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                <strong>${inviterName}</strong> has invited you to join the <strong>${branchName}</strong> operations team as a <strong>${roleTitle}</strong>.
              </p>

              <!-- Role & Hub Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ECFEFF; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Role</span>
                          <div style="font-size: 16px; font-weight: 800; color: #164E63; margin-top: 2px;">${roleTitle}</div>
                        </td>
                        <td align="right">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Branch Location</span>
                          <div style="font-size: 14px; font-weight: 700; color: #164E63; margin-top: 2px;">${branchName}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 14px; border-top: 1px solid #CFFAFE; margin-top: 10px;">
                          <span style="font-size: 11px; color: #0E7490;">Invite Code: </span>
                          <strong style="font-size: 14px; font-family: monospace; color: #164E63;">${inviteCode}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #64748B;">
                Click the button below to accept your invitation, create your password, and activate your access to the operations cockpit. This invite link expires in 7 days.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #0E7490; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 3px; letter-spacing: 0.02em;">
                      Accept Invitation &amp; Join Team &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B;">
              <div>GoWashGo — Smart Laundry Pickup &amp; Delivery System</div>
              <div style="margin-top: 4px;">If you were not expecting this invitation, you can safely ignore this email.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export interface BookingEmailProps extends BaseEmailProps {
  customerName: string;
  orderNumber: string;
  branchName: string;
  pickupAddress: string;
  pickupScheduledAt?: string | null;
  deliveryEstimatedAt?: string | null;
  paymentMethod: string;
  totalCentavos: number;
  trackingUrl: string;
  itemCount?: number;
}

/**
 * 4. Order Booking / Pickup Scheduled Confirmation Template
 */
export function renderBookingConfirmationHtml(props: BookingEmailProps): string {
  const {
    customerName,
    orderNumber,
    branchName,
    pickupAddress,
    pickupScheduledAt,
    deliveryEstimatedAt,
    paymentMethod,
    totalCentavos,
    trackingUrl,
    itemCount,
  } = props;

  const formattedDelivery = deliveryEstimatedAt
    ? new Date(deliveryEstimatedAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Within 24 hours';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed — ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 16px rgba(14, 116, 144, 0.06);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #164E63; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">gowashgo</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(103, 232, 249, 0.15); color: #67E8F9; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Pickup Scheduled ✓
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                Your laundry pickup is scheduled!
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>${customerName}</strong>, thank you for booking with GoWashGo! Your order <strong>${orderNumber}</strong> has been received by our <strong>${branchName}</strong> hub. Our dispatch team is preparing a rider to collect your laundry.
              </p>

              <!-- Order Summary Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ECFEFF; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid #CFFAFE;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Order Number</span>
                          <div style="font-size: 17px; font-weight: 800; color: #164E63; font-family: monospace; margin-top: 2px;">${orderNumber}</div>
                        </td>
                        <td align="right" style="padding-bottom: 12px; border-bottom: 1px solid #CFFAFE;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Est. Delivery</span>
                          <div style="font-size: 14px; font-weight: 700; color: #164E63; margin-top: 2px;">
                            ${formattedDelivery}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 12px;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Pickup Address</span>
                          <div style="font-size: 13px; color: #334155; margin-top: 2px;">${pickupAddress}</div>
                        </td>
                        <td align="right" style="padding-top: 12px;">
                          <span style="font-size: 11px; font-weight: 700; color: #0E7490; text-transform: uppercase; letter-spacing: 0.05em;">Payment</span>
                          <div style="font-size: 14px; font-weight: 700; color: #0E7490; text-transform: uppercase; margin-top: 2px;">
                            ${paymentMethod === 'online' ? 'Online Pay' : 'Cash on Delivery'}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What to Expect Next -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 13px; color: #475569; line-height: 1.6;">
                    <div style="font-weight: 700; color: #0F172A; margin-bottom: 6px;">What happens next:</div>
                    1. <strong>Doorstep Weighing:</strong> Our rider will bring a certified digital scale to weigh your laundry bag at your doorstep.<br>
                    2. <strong>Facility Processing:</strong> Your clothes are washed, tumble dried, and inspected according to fabric care tags.<br>
                    3. <strong>Fresh Delivery:</strong> We fold and package your fresh laundry and deliver it back to your door.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #0E7490; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 3px; letter-spacing: 0.02em;">
                      View &amp; Track Order Status &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B;">
              <div>GoWashGo — General Luna St., Poblacion, San Juan, Batangas</div>
              <div style="margin-top: 4px;">Smart laundry pickup and doorstep delivery platform.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}


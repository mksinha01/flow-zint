import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../config/logger';

const resend = new Resend(env.RESEND_API_KEY);

export const sendCallSummaryEmail = async ({
  toEmail,
  toName,
  leadName,
  leadPhone,
  summary,
  leadScore,
  classification,
  sentiment,
  buyingIntent,
  callDuration,
}: {
  toEmail: string;
  toName: string;
  leadName: string;
  leadPhone: string;
  summary: string;
  leadScore: number;
  classification: string;
  sentiment: string;
  buyingIntent: boolean;
  callDuration: number;
}): Promise<void> => {
  const classColors = { HOT: '#ef4444', WARM: '#f59e0b', COLD: '#3b82f6' };
  const color = classColors[classification as keyof typeof classColors] || '#6b7280';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Inter', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e1e3f 0%, #2d1b69 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(139,92,246,0.2);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #a78bfa; font-size: 24px; margin: 0;">⚡ FlowZint Call Summary</h1>
      <p style="color: #94a3b8; margin: 8px 0 0;">AI Sales Intelligence Report</p>
    </div>
    
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #e2e8f0; font-size: 18px; margin: 0 0 12px;">Lead: ${leadName}</h2>
      <p style="color: #94a3b8; margin: 4px 0;">📞 ${leadPhone} • ⏱ ${Math.floor(callDuration / 60)}m ${callDuration % 60}s</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: ${color};">${leadScore}</div>
        <div style="color: #94a3b8; font-size: 12px;">Lead Score</div>
      </div>
      <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; text-align: center;">
        <div style="font-size: 18px; font-weight: bold; color: ${color};">${classification}</div>
        <div style="color: #94a3b8; font-size: 12px;">Classification</div>
      </div>
      <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; text-align: center;">
        <div style="font-size: 18px; font-weight: bold; color: ${buyingIntent ? '#22c55e' : '#ef4444'};">${buyingIntent ? '✓ Yes' : '✗ No'}</div>
        <div style="color: #94a3b8; font-size: 12px;">Buying Intent</div>
      </div>
    </div>

    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <h3 style="color: #a78bfa; margin: 0 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">AI Summary</h3>
      <p style="color: #e2e8f0; line-height: 1.6; margin: 0;">${summary}</p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${env.FRONTEND_URL}/dashboard/leads" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Full Analysis →</a>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: toEmail,
      subject: `[FlowZint] Call with ${leadName} — Score: ${leadScore}/100 · ${classification}`,
      html,
    });
    logger.info(`Call summary email sent to ${toEmail} for lead ${leadName}`);
  } catch (error) {
    logger.error('Failed to send call summary email:', error);
  }
};

export const sendBookingConfirmationEmail = async ({
  toEmail,
  leadName,
  scheduledAt,
  meetingLink,
}: {
  toEmail: string;
  leadName: string;
  scheduledAt: Date;
  meetingLink?: string;
}): Promise<void> => {
  const formattedDate = scheduledAt.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: toEmail,
      subject: `✅ Demo Booked with ${leadName} — ${formattedDate}`,
      html: `<div style="font-family: Arial; padding: 20px;"><h2>Demo Booked!</h2><p>Your demo with <strong>${leadName}</strong> is confirmed for <strong>${formattedDate}</strong>.</p>${meetingLink ? `<p><a href="${meetingLink}">Join Meeting</a></p>` : ''}</div>`,
    });
  } catch (error) {
    logger.error('Failed to send booking confirmation email:', error);
  }
};

import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { env } from '../config/env';
import { createCalendlyBooking } from '../services/calendly.service';
import { sendBookingConfirmationEmail } from '../services/resend.service';
import { logger } from '../config/logger';

const router = Router();

/**
 * Internal-only middleware — validates the shared secret from the Python agent.
 * This bypasses JWT auth for machine-to-machine calls.
 */
const validateInternalKey = (req: Request, res: Response, next: Function) => {
  const key = req.headers['x-internal-key'];
  const internalKey = process.env.BACKEND_INTERNAL_KEY || 'super-secret-key';
  if (!key || key !== internalKey) {
    res.status(401).json({ success: false, message: 'Unauthorized internal request' });
    return;
  }
  next();
};

router.use(validateInternalKey);

/** Agent fetches its config at call start */
router.get('/agent-config/:configId', async (req: Request, res: Response) => {
  const config = await prisma.agentConfig.findUnique({
    where: { id: req.params.configId },
  });

  if (!config) {
    res.status(404).json({ success: false, message: 'Agent config not found' });
    return;
  }

  res.json({ success: true, config });
});

/** Agent updates call status and transcript after call ends */
router.patch('/calls/:callId', async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { transcript, status } = req.body;

  await prisma.call.update({
    where: { id: callId },
    data: {
      ...(transcript && { transcript }),
      ...(status && { status }),
      ...(status === 'COMPLETED' && { endedAt: new Date() }),
      ...(status === 'FAILED' && { endedAt: new Date() }),
    },
  });

  res.json({ success: true });
});

/** Agent records qualification data mid-call */
router.post('/calls/:callId/qualify', async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { interestLevel, budgetConfirmed, timeline, notes } = req.body;

  // Store in call notes field (we can log this for analysis later)
  const existing = await prisma.call.findUnique({
    where: { id: callId },
    select: { transcript: true },
  });

  const qualNote = `[QUALIFICATION] Interest: ${interestLevel}/10 | Budget: ${budgetConfirmed} | Timeline: ${timeline} | Notes: ${notes}`;
  const updatedTranscript = existing?.transcript
    ? `${existing.transcript}\n${qualNote}`
    : qualNote;

  await prisma.call.update({
    where: { id: callId },
    data: { transcript: updatedTranscript },
  });

  res.json({ success: true });
});

/** Agent triggers demo booking */
router.post('/calls/:callId/book', async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { preferredDate, preferredTime } = req.body;

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { lead: true },
  });

  if (!call) {
    res.status(404).json({ success: false, message: 'Call not found' });
    return;
  }

  try {
    const booking = await createCalendlyBooking(
      call.lead.name,
      call.lead.email || '',
      `${preferredDate} ${preferredTime}`
    );

    await prisma.booking.create({
      data: {
        workspaceId: call.workspaceId,
        callId,
        leadId: call.leadId,
        calendlyEventUri: booking.eventUri,
        scheduledAt: booking.scheduledAt,
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: call.leadId },
      data: { status: 'BOOKED' },
    });

    // Send confirmation email if we have their email
    if (call.lead.email && booking.scheduledAt) {
      sendBookingConfirmationEmail({
        toEmail: call.lead.email,
        leadName: call.lead.name,
        scheduledAt: booking.scheduledAt,
        meetingLink: booking.schedulingUrl,
      }).catch(() => {});
    }

    logger.info(`Demo booked for lead ${call.lead.name} (call ${callId})`);
    res.json({ success: true, schedulingUrl: booking.schedulingUrl });
  } catch (error) {
    logger.error('Booking failed:', error);
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
});

export default router;

import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Calendly service — STUB implementation for hackathon.
 * Replace with real Calendly v2 API calls when ready.
 */

export interface BookingResult {
  eventUri: string;
  schedulingUrl: string;
  scheduledAt?: Date;
}

export const createCalendlyBooking = async (
  leadName: string,
  leadEmail: string,
  preferredTime?: string
): Promise<BookingResult> => {
  if (!env.CALENDLY_API_KEY || !env.CALENDLY_EVENT_TYPE_URI) {
    logger.warn('Calendly not configured — returning stub booking');
    return {
      eventUri: `stub:calendly:${Date.now()}`,
      schedulingUrl: `https://calendly.com/flowzint/demo?name=${encodeURIComponent(leadName)}&email=${encodeURIComponent(leadEmail)}`,
      scheduledAt: preferredTime ? new Date(preferredTime) : undefined,
    };
  }

  try {
    // Real Calendly API v2 call would go here:
    // POST https://api.calendly.com/scheduling_links
    // with { owner: eventTypeUri, max_event_count: 1, owner_type: "EventType" }
    const response = await fetch('https://api.calendly.com/scheduling_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner: env.CALENDLY_EVENT_TYPE_URI,
        max_event_count: 1,
        owner_type: 'EventType',
      }),
    });

    const data = await response.json() as any;
    return {
      eventUri: data.resource?.uri || `calendly:${Date.now()}`,
      schedulingUrl: data.resource?.booking_url || '',
    };
  } catch (error) {
    logger.error('Calendly API error:', error);
    throw new Error('Failed to create Calendly booking');
  }
};

import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * HubSpot CRM integration — STUB implementation for hackathon.
 * Sends lead data to HubSpot when a call is analyzed.
 */

export const syncLeadToHubSpot = async (leadData: {
  name: string;
  email?: string;
  phone: string;
  company?: string;
  leadScore: number;
  classification: string;
  notes: string;
}): Promise<void> => {
  if (!env.HUBSPOT_API_KEY) {
    logger.warn('HubSpot not configured — skipping CRM sync');
    return;
  }

  try {
    // Real HubSpot Contacts API call would go here
    // POST https://api.hubapi.com/crm/v3/objects/contacts
    logger.info(`[HubSpot STUB] Would sync lead: ${leadData.name} (score: ${leadData.leadScore})`);

    // Stub: just log it for now
    // In production, uncomment and use real HubSpot SDK
  } catch (error) {
    logger.error('HubSpot sync error:', error);
    // Non-fatal — CRM sync failure shouldn't break the main flow
  }
};

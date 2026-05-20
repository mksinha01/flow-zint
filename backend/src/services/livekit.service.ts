import { RoomServiceClient, AccessToken, SipClient } from 'livekit-server-sdk';
import { env } from '../config/env';
import { logger } from '../config/logger';

const roomService = new RoomServiceClient(
  env.LIVEKIT_URL,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

const sipClient = new SipClient(
  env.LIVEKIT_URL,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

export interface DispatchCallOptions {
  phoneNumber: string;
  callId: string;
  leadName: string;
  agentConfigId: string;
  workspaceId: string;
  transferTo?: string;
}

/**
 * Dispatches an outbound call via LiveKit SIP.
 * The ai-agent picks up the job, loads the AgentConfig, and dials the lead.
 */
export const dispatchOutboundCall = async (options: DispatchCallOptions): Promise<string> => {
  const roomName = `call-${options.callId}`;

  logger.info(`Dispatching outbound call to ${options.phoneNumber} in room ${roomName}`);

  // Create a room for this call
  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 300, // 5 minutes to connect
    maxParticipants: 2,
  });

  // Dispatch agent with call metadata
  const metadata = JSON.stringify({
    phone_number: options.phoneNumber,
    call_id: options.callId,
    lead_name: options.leadName,
    agent_config_id: options.agentConfigId,
    workspace_id: options.workspaceId,
    transfer_to: options.transferTo || null,
  });

  await sipClient.createSipParticipant(
    env.SIP_OUTBOUND_TRUNK_ID,
    options.phoneNumber,
    roomName,
    {
      participantIdentity: options.phoneNumber,
      participantMetadata: metadata,
      waitUntilAnswered: false,
    }
  );

  logger.info(`SIP participant created for ${options.phoneNumber}`);
  return roomName;
};

/**
 * Generates a LiveKit access token for the agent to join a room.
 */
export const generateAgentToken = (roomName: string, identity: string): string => {
  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity,
    ttl: '1h',
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  return at.toJwt() as unknown as string;
};

/**
 * Fetches the transcript for a completed room from LiveKit.
 * (In practice, transcript comes from Deepgram/OpenAI during the call and stored separately)
 */
export const deleteRoom = async (roomName: string): Promise<void> => {
  try {
    await roomService.deleteRoom(roomName);
    logger.info(`Room ${roomName} deleted`);
  } catch (error) {
    logger.warn(`Could not delete room ${roomName}:`, error);
  }
};

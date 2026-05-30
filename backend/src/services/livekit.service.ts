import { RoomServiceClient, AccessToken, AgentDispatchClient } from 'livekit-server-sdk';
import { env } from '../config/env';
import { logger } from '../config/logger';
import net from 'net';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const roomService = new RoomServiceClient(
  env.LIVEKIT_URL,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

const agentDispatchClient = new AgentDispatchClient(
  env.LIVEKIT_URL,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

export interface DispatchCallOptions {
  phoneNumber: string;
  callId: string;
  leadName: string;
  leadNotes?: string;
  agentConfigId: string;
  workspaceId: string;
  transferTo?: string;
}

/**
 * Ensures the AI Agent Python worker is running.
 * If not running, it spawns it automatically in the background.
 */
export const ensureAgentRunning = (): Promise<void> => {
  if (env.NODE_ENV === 'production') {
    logger.info('Skipping local agent check in production environment.');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(200);

    socket.on('connect', () => {
      logger.info('AI Agent worker is already running on port 63888.');
      socket.destroy();
      resolve();
    });

    socket.on('error', () => {
      logger.info('AI Agent worker is not running. Starting it automatically...');
      const agentDir = path.resolve(process.cwd(), '../ai-agent');
      
      const pythonExe = process.platform === 'win32'
        ? path.join(agentDir, 'venv', 'Scripts', 'python.exe')
        : path.join(agentDir, 'venv', 'bin', 'python');

      let pythonCmd = pythonExe;
      if (!fs.existsSync(pythonExe)) {
        logger.info(`Venv python not found at ${pythonExe}, falling back to system 'python'`);
        pythonCmd = 'python';
      }

      logger.info(`Spawning agent worker in background: ${pythonCmd} agent.py dev`);
      
      try {
        const child = spawn(pythonCmd, ['agent.py', 'dev'], {
          cwd: agentDir,
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
      } catch (err) {
        logger.error('Failed to spawn agent worker:', err);
      }
      
      resolve();
    });

    socket.connect(63888, '127.0.0.1');
  });
};

/**
 * Dispatches an outbound call via LiveKit SIP.
 * The ai-agent picks up the job, loads the AgentConfig, and dials the lead.
 */
export const dispatchOutboundCall = async (options: DispatchCallOptions): Promise<string> => {
  const roomName = `call-${options.callId}`;

  // Ensure the AI agent worker is running in the background
  await ensureAgentRunning();

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
    lead_notes: options.leadNotes || null,
    agent_config_id: options.agentConfigId,
    workspace_id: options.workspaceId,
    transfer_to: options.transferTo || null,
  });

  await agentDispatchClient.createDispatch(roomName, 'outbound-caller', {
    metadata,
  });

  logger.info(`Agent dispatched for room ${roomName} and lead ${options.phoneNumber}`);
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

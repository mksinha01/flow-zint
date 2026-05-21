import { Request, Response } from 'express';

// Module-level mock object for Prisma (avoids hoisting issues)
const mockPrisma = {
  call: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  lead: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  agentConfig: { findFirst: jest.fn() },
  businessContext: { findUnique: jest.fn() },
  callAnalysis: { create: jest.fn() },
  workspace: { findUnique: jest.fn() },
};

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const mockGetActiveAgentConfig = jest.fn();
jest.mock('../../src/services/persona.service', () => ({
  getActiveAgentConfig: mockGetActiveAgentConfig,
}));

const mockDispatchOutboundCall = jest.fn().mockResolvedValue('call-room-abc');
jest.mock('../../src/services/livekit.service', () => ({
  dispatchOutboundCall: mockDispatchOutboundCall,
}));

jest.mock('../../src/services/openai.service', () => ({
  analyzeCallTranscript: jest.fn(),
}));

jest.mock('../../src/services/resend.service', () => ({
  sendCallSummaryEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/crm.service', () => ({
  syncLeadToHubSpot: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/utils/response.util', () => ({
  sendSuccess: jest.fn((res: Response, data: unknown, _msg?: string, status = 200, meta?: unknown) => {
    res.status(status).json({ success: true, data, meta });
  }),
  sendCreated: jest.fn((res: Response, data: unknown, msg: string) => {
    res.status(201).json({ success: true, data, message: msg });
  }),
  sendError: jest.fn((res: Response, msg: string, status = 400) => {
    res.status(status).json({ success: false, message: msg });
  }),
  sendNotFound: jest.fn((res: Response, entity: string) => {
    res.status(404).json({ success: false, message: `${entity} not found` });
  }),
}));

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { listCalls, dispatchCall, getCall } from '../../src/controllers/calls.controller';

const mockReq = (overrides = {}): Request =>
({
  user: { userId: 'u1', workspaceId: 'ws1', email: 'test@test.com' },
  query: {},
  params: {},
  body: {},
  ...overrides,
} as unknown as Request);

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listCalls', () => {
  it('returns paginated calls', async () => {
    mockPrisma.call.findMany.mockResolvedValue([]);
    mockPrisma.call.count.mockResolvedValue(0);

    const req = mockReq({ query: {} });
    const res = mockRes();
    await listCalls(req as any, res);

    expect(mockPrisma.call.findMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('filters by status when provided', async () => {
    mockPrisma.call.findMany.mockResolvedValue([]);
    mockPrisma.call.count.mockResolvedValue(0);

    const req = mockReq({ query: { status: 'COMPLETED' } });
    const res = mockRes();
    await listCalls(req as any, res);

    const whereArg = mockPrisma.call.findMany.mock.calls[0][0].where;
    expect(whereArg.status).toBe('COMPLETED');
  });
});

describe('dispatchCall', () => {
  it('returns 404 if lead not found', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);

    const req = mockReq({ body: { leadId: 'bad-lead' } });
    const res = mockRes();
    await dispatchCall(req as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 if no active agent config', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({ id: 'l1', name: 'Alice', phone: '+1' });
    mockGetActiveAgentConfig.mockResolvedValue(null);

    const req = mockReq({ body: { leadId: 'l1' } });
    const res = mockRes();
    await dispatchCall(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('dispatches call and returns 201 when lead + config exist', async () => {
    const lead = { id: 'l1', name: 'Alice', phone: '+15551234567' };
    const agentConfig = { id: 'ac1', version: 1, status: 'ACTIVE' };
    const call = { id: 'c1', workspaceId: 'ws1', leadId: 'l1', agentConfigId: 'ac1', status: 'QUEUED' };

    mockPrisma.lead.findFirst.mockResolvedValue(lead);
    mockGetActiveAgentConfig.mockResolvedValue(agentConfig);
    mockPrisma.call.create.mockResolvedValue(call);
    mockPrisma.call.update.mockResolvedValue({ ...call, status: 'IN_PROGRESS', livekitRoomId: 'call-room-abc' });
    mockPrisma.lead.update.mockResolvedValue({ ...lead, status: 'CALLED' });

    const req = mockReq({ body: { leadId: 'l1' } });
    const res = mockRes();
    await dispatchCall(req as any, res);

    expect(mockDispatchOutboundCall).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('getCall', () => {
  it('returns 404 if call not found', async () => {
    mockPrisma.call.findFirst.mockResolvedValue(null);

    const req = mockReq({ params: { callId: 'nope' } });
    const res = mockRes();
    await getCall(req as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns call data with analysis included', async () => {
    const call = {
      id: 'c1', status: 'COMPLETED',
      lead: { name: 'Alice', phone: '+1', email: null, company: null },
      analysis: { leadScore: 75, classification: 'HOT', sentiment: 'POSITIVE' },
      agentConfig: { version: 1, openingScript: 'Hello!' },
      booking: null,
    };
    mockPrisma.call.findFirst.mockResolvedValue(call);

    const req = mockReq({ params: { callId: 'c1' } });
    const res = mockRes();
    await getCall(req as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.call.analysis.leadScore).toBe(75);
  });
});

import { Request, Response } from 'express';

// Prisma mock — must use the actual module shape (default export)
const mockPrisma = {
  lead: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
  },
  booking: {
    deleteMany: jest.fn(),
  },
  call: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
};

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
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

import { listLeads, createLead, getLead, deleteLead, bulkImportLeads } from '../../src/controllers/leads.controller';

const mockReq = (overrides: Partial<Request> = {}): Request =>
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

describe('listLeads', () => {
  it('returns leads with pagination meta', async () => {
    mockPrisma.lead.findMany.mockResolvedValue([{ id: 'l1', name: 'Alice', phone: '+1234', calls: [] }]);
    mockPrisma.lead.count.mockResolvedValue(1);

    const req = mockReq({ query: { page: '1', limit: '20' } as any });
    const res = mockRes();
    await listLeads(req as any, res);

    expect(mockPrisma.lead.findMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('filters by status if provided', async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);

    const req = mockReq({ query: { status: 'QUALIFIED' } as any });
    const res = mockRes();
    await listLeads(req as any, res);

    const whereArg = mockPrisma.lead.findMany.mock.calls[0][0].where;
    expect(whereArg.status).toBe('QUALIFIED');
  });

  it('applies search filter when search param provided', async () => {
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);

    const req = mockReq({ query: { search: 'alice' } as any });
    const res = mockRes();
    await listLeads(req as any, res);

    const whereArg = mockPrisma.lead.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
  });
});

describe('createLead', () => {
  it('creates a lead and returns 201', async () => {
    const newLead = { id: 'l2', name: 'Bob', phone: '+5678', workspaceId: 'ws1' };
    mockPrisma.lead.create.mockResolvedValue(newLead);

    const req = mockReq({ body: { name: 'Bob', phone: '+5678' } });
    const res = mockRes();
    await createLead(req as any, res);

    expect(mockPrisma.lead.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('getLead', () => {
  it('returns 404 when lead not found', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);

    const req = mockReq({ params: { leadId: 'nonexistent' } });
    const res = mockRes();
    await getLead(req as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns lead when found', async () => {
    const lead = { id: 'l1', name: 'Alice', phone: '+1', calls: [], bookings: [] };
    mockPrisma.lead.findFirst.mockResolvedValue(lead);

    const req = mockReq({ params: { leadId: 'l1' } });
    const res = mockRes();
    await getLead(req as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('deleteLead', () => {
  it('returns 404 when lead does not exist', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);

    const req = mockReq({ params: { leadId: 'ghost' } });
    const res = mockRes();
    await deleteLead(req as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deletes and returns 200 when found', async () => {
    const lead = { id: 'l3', name: 'Charlie' };
    mockPrisma.lead.findFirst.mockResolvedValue(lead);
    mockPrisma.lead.delete.mockResolvedValue(lead);
    mockPrisma.booking.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.call.deleteMany.mockResolvedValue({ count: 0 });

    const req = mockReq({ params: { leadId: 'l3' } });
    const res = mockRes();
    await deleteLead(req as any, res);

    expect(mockPrisma.booking.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'l3' } });
    expect(mockPrisma.call.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'l3' } });
    expect(mockPrisma.lead.delete).toHaveBeenCalledWith({ where: { id: 'l3' } });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('bulkImportLeads', () => {
  it('returns 400 if leads array is empty', async () => {
    const req = mockReq({ body: { leads: [] } });
    const res = mockRes();
    await bulkImportLeads(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates many leads and returns 201 with count', async () => {
    mockPrisma.lead.createMany.mockResolvedValue({ count: 3 });

    const req = mockReq({
      body: {
        leads: [
          { name: 'A', phone: '+1' },
          { name: 'B', phone: '+2' },
          { name: 'C', phone: '+3' },
        ],
      },
    });
    const res = mockRes();
    await bulkImportLeads(req as any, res);

    expect(mockPrisma.lead.createMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 if body has no leads key', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await bulkImportLeads(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

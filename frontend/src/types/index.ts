// Shared TypeScript types across the FlowZint frontend

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  businessContext?: BusinessContext;
  _count?: { leads: number; calls: number };
}

export interface BusinessContext {
  id: string;
  workspaceId: string;
  companyName: string;
  productDescription: string;
  targetCustomer: string;
  keyPainPoints: string;
  pricing?: string;
  competitorNames?: string;
  callObjective: "book_demo" | "qualify" | "sell_direct";
  voiceStyle: "FORMAL" | "CASUAL" | "AGGRESSIVE" | "EMPATHETIC";
  additionalNotes?: string;
}

export interface BusinessDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface AgentConfig {
  id: string;
  workspaceId: string;
  version: number;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "ARCHIVED";
  systemPrompt: string;
  openingScript: string;
  qualifyingQuestions: string[];
  objectionHandlers: { objection: string; response: string }[];
  generatedFromInsights?: string[];
  generatedAt: string;
  activatedAt?: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  status: "NEW" | "CALLED" | "QUALIFIED" | "DISQUALIFIED" | "BOOKED";
  notes?: string;
  createdAt: string;
  calls?: Call[];
  bookings?: Booking[];
}

export interface Call {
  id: string;
  workspaceId: string;
  leadId: string;
  agentConfigId?: string;
  livekitRoomId?: string;
  status: "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "VOICEMAIL";
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  lead?: { name: string; phone: string; company?: string };
  analysis?: CallAnalysis;
  agentConfig?: { version: number; status: string };
}

export interface Objection {
  text: string;
  timestamp: number;
  handled: boolean;
}

export interface CallAnalysis {
  id: string;
  callId: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  leadScore: number;
  classification: "HOT" | "WARM" | "COLD";
  objections: Objection[];
  buyingIntent: boolean;
  intentReasoning: string;
  summary: string;
  createdAt: string;
}

export interface LearningInsight {
  id: string;
  workspaceId: string;
  sourceCallIds: string[];
  insightType: string;
  description: string;
  suggestion: string;
  appliedToVersion?: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  callId: string;
  leadId: string;
  calendlyEventUri?: string;
  scheduledAt?: string;
  confirmationEmailSent: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  avgLeadScore: number;
  bookings: number;
  successRate: number;
  activeAgentVersion: number | null;
}

export interface DashboardCharts {
  callVolume: Record<string, { total: number; completed: number }>;
  scoreDistribution: Record<string, number>;
  topObjections: { text: string; count: number }[];
  classificationBreakdown: { HOT: number; WARM: number; COLD: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  status: string;
  data: T;
  message?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

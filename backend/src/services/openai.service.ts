import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../config/logger';
import prisma from '../config/database';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface GeneratedPersona {
  systemPrompt: string;
  openingScript: string;
  qualifyingQuestions: string[];
  objectionHandlers: { objection: string; response: string }[];
}

/**
 * Builds a full AI agent persona from the business context and uploaded docs.
 * Called during onboarding after user completes the form and uploads docs.
 */
export const generateAgentPersona = async (workspaceId: string): Promise<GeneratedPersona> => {
  const context = await prisma.businessContext.findUnique({
    where: { workspaceId },
  });

  if (!context) {
    throw new Error('Business context not found. Complete the onboarding form first.');
  }

  const documents = await prisma.businessDocument.findMany({
    where: { workspaceId },
    select: { fileName: true, extractedText: true },
  });

  const docsContent = documents
    .map((d) => `--- Document: ${d.fileName} ---\n${d.extractedText}`)
    .join('\n\n');

  const prompt = `You are an expert sales trainer and AI agent designer. Based on the following business information, create a complete AI sales agent configuration.

BUSINESS INFORMATION:
Company Name: ${context.companyName}
Product/Service: ${context.productDescription}
Target Customer (ICP): ${context.targetCustomer}
Key Pain Points We Solve: ${context.keyPainPoints}
Pricing: ${context.pricing || 'Not specified'}
Competitors: ${context.competitorNames || 'Not specified'}
Call Objective: ${context.callObjective}
Voice Style: ${context.voiceStyle}
Additional Notes: ${context.additionalNotes || 'None'}

UPLOADED BUSINESS DOCUMENTS:
${docsContent || 'No documents uploaded'}

Create a complete AI sales agent configuration with the following JSON structure:
{
  "systemPrompt": "A comprehensive system prompt (500-800 words) that gives the AI agent its complete personality, knowledge about the company, its mission during calls, and how to handle different scenarios. Make it specific to this business.",
  "openingScript": "The exact opening message the agent speaks when the lead picks up (2-3 sentences). Should mention the company name, be warm and professional, and immediately establish the reason for the call.",
  "qualifyingQuestions": [
    "Question 1 - discover if they have the pain point",
    "Question 2 - understand their budget/timeline",
    "Question 3 - identify decision maker",
    "Question 4 - gauge interest level",
    "Question 5 - understand current solution"
  ],
  "objectionHandlers": [
    { "objection": "I'm not interested", "response": "Specific empathetic response..." },
    { "objection": "I don't have time right now", "response": "..." },
    { "objection": "It's too expensive", "response": "..." },
    { "objection": "We already have a solution", "response": "..." },
    { "objection": "Send me an email instead", "response": "..." }
  ]
}

IMPORTANT:
- Make the system prompt highly specific to this business — not generic
- Objection handlers must reference actual company benefits and differentiators
- The voice style should be ${context.voiceStyle.toLowerCase()}
- The goal is: ${context.callObjective}
- Respond ONLY with valid JSON, no markdown, no explanation.`;

  logger.info(`Generating agent persona for workspace: ${workspaceId}`);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('OpenAI returned empty response for persona generation');

  const persona = JSON.parse(content) as GeneratedPersona;
  logger.info(`Agent persona generated successfully for workspace: ${workspaceId}`);
  return persona;
};

/**
 * Analyzes a completed call transcript to extract sales intelligence.
 */
export interface CallAnalysisResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  leadScore: number;
  classification: 'HOT' | 'WARM' | 'COLD';
  objections: { text: string; timestamp: number; handled: boolean }[];
  buyingIntent: boolean;
  intentReasoning: string;
  summary: string;
}

export const analyzeCallTranscript = async (
  transcript: string,
  businessContext: { companyName: string; productDescription: string; callObjective: string }
): Promise<CallAnalysisResult> => {
  const prompt = `You are an expert sales call analyst. Analyze the following sales call transcript and provide a structured analysis.

COMPANY: ${businessContext.companyName}
PRODUCT: ${businessContext.productDescription}
CALL OBJECTIVE: ${businessContext.callObjective}

TRANSCRIPT:
${transcript}

Analyze and return ONLY valid JSON:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "leadScore": <integer 1-100 based on: interest level, engagement, budget fit, timeline, authority>,
  "classification": "HOT" | "WARM" | "COLD",
  "objections": [
    { "text": "exact objection raised", "timestamp": <estimated second in call>, "handled": <true|false> }
  ],
  "buyingIntent": <true|false>,
  "intentReasoning": "2-3 sentence explanation of why you rated intent as true/false",
  "summary": "3-sentence summary: what happened, how lead responded, recommended next step"
}

SCORING GUIDE:
- 80-100: HOT — strong interest, budget confirmed, decision maker, clear timeline
- 50-79: WARM — some interest, needs nurturing, follow-up recommended  
- 1-49: COLD — no interest, wrong fit, or no engagement`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('OpenAI returned empty analysis response');

  return JSON.parse(content) as CallAnalysisResult;
};

/**
 * Learning loop: analyzes a batch of call analyses to extract lessons.
 */
export interface LearningInsightResult {
  insightType: string;
  description: string;
  suggestion: string;
}

export const extractLearningInsights = async (
  callAnalyses: Array<{
    sentiment: string;
    leadScore: number;
    classification: string;
    objections: unknown;
    buyingIntent: boolean;
    summary: string;
  }>,
  currentSystemPrompt: string
): Promise<LearningInsightResult[]> => {
  const prompt = `You are a senior sales coach reviewing the results of ${callAnalyses.length} AI sales calls. Identify patterns and generate actionable insights to improve the agent.

CURRENT AGENT SYSTEM PROMPT:
${currentSystemPrompt.slice(0, 1000)}...

CALL RESULTS BATCH:
${JSON.stringify(callAnalyses, null, 2)}

Analyze the patterns and return ONLY valid JSON array of insights:
[
  {
    "insightType": "OBJECTION_UNHANDLED" | "WRONG_TONE" | "SCRIPT_TOO_LONG" | "ICP_MISMATCH" | "LOW_ENGAGEMENT" | "TIMING_ISSUE" | "COMPETITOR_MENTION" | "PRICING_PUSHBACK",
    "description": "Specific observation about what went wrong (be data-driven, e.g. '7 out of ${callAnalyses.length} calls had unhandled price objections')",
    "suggestion": "Concrete, actionable fix (e.g. 'Add a ROI-focused response to price objections that mentions payback period within 90 days')"
  }
]

Only return insights that are clearly evidenced by the data. Return empty array [] if calls went well. Max 5 insights.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const content = response.choices[0].message.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : parsed.insights || [];
};

/**
 * Generates an improved AgentConfig based on learning insights.
 */
export const improvePersonaFromInsights = async (
  currentPersona: GeneratedPersona,
  insights: LearningInsightResult[]
): Promise<GeneratedPersona> => {
  const prompt = `You are an expert sales trainer. Improve the following AI sales agent configuration based on the lessons learned from recent calls.

CURRENT CONFIGURATION:
${JSON.stringify(currentPersona, null, 2)}

LESSONS TO INCORPORATE:
${insights.map((i, idx) => `${idx + 1}. [${i.insightType}] ${i.description}\n   Fix: ${i.suggestion}`).join('\n\n')}

Generate an improved version that addresses each lesson. Return ONLY valid JSON matching the same structure:
{
  "systemPrompt": "...",
  "openingScript": "...",
  "qualifyingQuestions": [...],
  "objectionHandlers": [...]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('OpenAI returned empty improved persona response');

  return JSON.parse(content) as GeneratedPersona;
};

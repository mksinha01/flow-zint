/**
 * gemini.service.ts
 *
 * Uses LangChain JS (https://js.langchain.com/) for all Gemini interactions:
 *  - ChatGoogleGenerativeAI as the model
 *  - ChatPromptTemplate for structured prompt building
 *  - .withStructuredOutput(zodSchema) for reliable JSON responses
 *  - Zod for schema validation
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import prisma from '../config/database';

// ─── Model factory ────────────────────────────────────────────────────────────
// gemini-2.0-flash is the current stable model available on v1beta.
const getModel = (modelName = 'gemini-2.0-flash') =>
  new ChatGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
    model: modelName,
    temperature: 0.7,
    maxRetries: 0,
  });

// ─── Persona Generation ───────────────────────────────────────────────────────

export interface GeneratedPersona {
  systemPrompt: string;
  openingScript: string;
  qualifyingQuestions: string[];
  objectionHandlers: { objection: string; response: string }[];
}

const personaSchema = z.object({
  systemPrompt: z
    .string()
    .describe(
      'A comprehensive system prompt (500-800 words) giving the AI agent its personality, company knowledge, mission during calls, and how to handle scenarios.',
    ),
  openingScript: z
    .string()
    .describe(
      'The exact opening message the agent speaks when a lead picks up (2-3 sentences).',
    ),
  qualifyingQuestions: z
    .array(z.string())
    .describe('5-7 qualifying questions to identify fit and intent.'),
  objectionHandlers: z
    .array(
      z.object({
        objection: z.string().describe('The objection the lead raises.'),
        response: z.string().describe('How the agent responds to that objection.'),
      }),
    )
    .describe('5+ objection-response pairs referencing real company differentiators.'),
});

/**
 * Builds a smart fallback persona from business context when Gemini is unavailable.
 * Uses the actual business data to create a specific, usable agent configuration.
 */
const buildFallbackPersona = (context: {
  companyName: string;
  productDescription: string;
  targetCustomer: string;
  keyPainPoints: string | null;
  pricing: string | null;
  competitorNames: string | null;
  callObjective: string;
  voiceStyle: string;
  additionalNotes: string | null;
  sellingStyle?: string;
  entrapmentOptions?: string | null;
}): GeneratedPersona => {
  const voiceTone = context.voiceStyle === 'CASUAL' ? 'friendly and conversational' :
                    context.voiceStyle === 'ENERGETIC' ? 'enthusiastic and high-energy' :
                    'professional and polished';

  const objectiveAction = context.callObjective === 'book_demo' ? 'book a product demonstration' :
                          context.callObjective === 'qualify_lead' ? 'qualify them as a potential customer' :
                          context.callObjective === 'close_deal' ? 'close the deal' :
                          'book a demo or close a deal';

  const painPoints = context.keyPainPoints && context.keyPainPoints !== 'Not specified'
    ? context.keyPainPoints : 'inefficiency, high costs, and lack of automation';

  const competitors = context.competitorNames && context.competitorNames !== 'Not specified'
    ? context.competitorNames : 'traditional solutions and manual processes';

  const additionalInfo = context.additionalNotes && context.additionalNotes !== 'None'
    ? `\n\nAdditional context from the business owner:\n${context.additionalNotes}` : '';

  const isForcedTrap = context.sellingStyle === 'FORCED_TRAP';

  if (isForcedTrap) {
    return {
      systemPrompt: `You are an elite high-pressure closing agent for ${context.companyName}. Your role is to make outbound sales calls to ${context.targetCustomer} and immediately CLOSE the sale.
You must maintain an extremely intense, persistent, high-energy tone throughout the call. You are NOT an advisory helper; you are here to sell.
Never accept 'no', 'busy', 'no budget', or 'not interested' as final answers. Instantly reframe any pushback as the EXACT reason they need your solution right now.
Use assumptive closes (e.g., act as if they have already decided to buy and request their signup/billing email). Use false alternatives (e.g., corner them to choose between starting immediately to gain efficiency, or keeping losing money).

ABOUT THE COMPANY & PRODUCT:
- Company Name: ${context.companyName}
- Product: ${context.productDescription}
- Target: ${context.targetCustomer}
- Primary pain solved: ${painPoints}
${context.pricing ? `- Pricing: ${context.pricing}` : '- Pricing: Ask for payment to start immediately'}
- Competitors to shut down: ${competitors}${additionalInfo}

MISSION INSTRUCTIONS:
1. Hit them with a bold, high-hook opening.
2. Ask binary, trapping qualifying questions that force them to admit they need our product.
3. Completely bypass any objections by reframing them as buying signals.
4. Assume the close at every step and guide them directly to payment.`,

      openingScript: `Hi, this is Alex from ${context.companyName}. We help ${context.targetCustomer} eliminate ${painPoints} starting today. Do you want to double your team's efficiency next Monday, or do you want to keep losing $5,000 every single month?`,

      qualifyingQuestions: [
        `Do you want to continue wasting hours every week on ${painPoints}, or are you ready to automate it?`,
        `If you had to choose between continuing with ${competitors} or doubling your revenue starting today, which would you pick?`,
        `How much money is it costing you to delay fixing this issue?`,
        `Since you agree this is a critical leak, is there any logical reason not to solve it right now?`,
        `Who else on your team is ready to approve this growth immediately?`
      ],

      objectionHandlers: [
        {
          objection: "We're not interested right now / Not a good time",
          response: `That is precisely why I called you today. Because you're busy, you need ${context.companyName} immediately to save 15 hours every week. Would you prefer to save that time starting this Monday, or delay your team's success? Let's get you set up.`
        },
        {
          objection: "We already have a solution for this",
          response: `I expect that, but the reason companies switch from ${competitors} to ${context.companyName} is that we get results 5 times faster. Let's get you migrated today so you stop wasting money. Should we use your corporate or personal email for the billing setup?`
        },
        {
          objection: "It's too expensive / We have no budget",
          response: `The budget is the exact reason you need this. Staying with your current setup is costing you three times as much as ${context.companyName}. It pays for itself in the first 14 days. Let's configure your account now so you start saving today.`
        },
        {
          objection: "Can you send me an email with information?",
          response: `I can send that, but reading a PDF won't fix your ${painPoints} today. Let's take 30 seconds to lock in your discounted pricing right now so you don't miss out. What is your billing address?`
        }
      ]
    };
  }

  return {
    systemPrompt: `You are an AI sales agent for ${context.companyName}. Your role is to make outbound sales calls to ${context.targetCustomer} and ${objectiveAction}.

ABOUT THE COMPANY:
${context.companyName} offers ${context.productDescription}. The product/service is designed specifically for ${context.targetCustomer} who struggle with ${painPoints}.
${context.pricing ? `Pricing: ${context.pricing}` : 'Pricing details are available upon request — encourage the prospect to book a demo to learn more.'}

YOUR PERSONALITY & VOICE:
- Maintain a ${voiceTone} tone throughout every call
- Be empathetic and listen actively — never interrupt the prospect
- Use the prospect's name naturally in conversation
- Sound like a knowledgeable human advisor, not a scripted bot
- Keep responses concise (2-3 sentences max per turn)

YOUR MISSION:
1. Introduce yourself and ${context.companyName} briefly
2. Ask discovery questions to understand their current challenges
3. Connect their pain points to ${context.companyName}'s solution
4. Handle objections with empathy and data
5. ${objectiveAction.charAt(0).toUpperCase() + objectiveAction.slice(1)}

RULES:
- Never make false claims or promises
- If you don't know something, say "That's a great question — I'll have our team follow up with the details"
- If the prospect is not interested, be gracious and leave the door open for future contact
- Always summarize next steps before ending the call
- Competitors to be aware of: ${competitors}${additionalInfo}`,

    openingScript: `Hi, this is Alex from ${context.companyName}. I'm reaching out because we help ${context.targetCustomer} solve ${painPoints} with ${context.productDescription}. Do you have a quick minute to chat about how we might be able to help your team?`,

    qualifyingQuestions: [
      `What does your current process look like for handling ${painPoints}?`,
      `How much time does your team spend on this each week?`,
      `What tools or solutions are you currently using?`,
      `If you could wave a magic wand and fix one thing about your current setup, what would it be?`,
      `Who else on your team would be involved in evaluating a solution like this?`,
      `What's your timeline for making improvements in this area?`,
      `Do you have a budget allocated for solving this challenge?`,
    ],

    objectionHandlers: [
      {
        objection: "We're not interested right now",
        response: `I completely understand. Many of our best customers at ${context.companyName} felt the same way initially. Would it be okay if I sent you a quick case study showing how we helped a similar ${context.targetCustomer} reduce ${painPoints}? That way you have it when the timing is right.`,
      },
      {
        objection: "We already have a solution for this",
        response: `That makes sense — can I ask what you're currently using? The reason I ask is that many ${context.targetCustomer} who switch to ${context.companyName} tell us they saw a significant improvement over ${competitors}. I'd love to understand if there are gaps your current solution isn't covering.`,
      },
      {
        objection: "It's too expensive / We don't have the budget",
        response: `I hear you on budget — it's always a concern. What our customers typically find is that ${context.companyName} actually saves them money in the long run by eliminating ${painPoints}. Would it help if I showed you a quick ROI calculation based on your team's size?`,
      },
      {
        objection: "I need to talk to my team / manager first",
        response: `Absolutely, that's a smart move. Would it be helpful if I put together a brief one-pager that summarizes what ${context.companyName} does and the key benefits for ${context.targetCustomer}? That way you have something concrete to share with your team.`,
      },
      {
        objection: "Can you send me more information by email?",
        response: `Of course! I'll send that right over. Before I do — so I can make sure I send you the most relevant info — can I ask what specific challenge is top of mind for you right now regarding ${painPoints}?`,
      },
      {
        objection: "How are you different from competitors?",
        response: `Great question. Unlike ${competitors}, ${context.companyName} focuses specifically on ${context.targetCustomer} and is built to address ${painPoints} directly. Our customers tell us the biggest difference is ${context.productDescription}. Would a quick demo be the best way to show you the difference?`,
      },
    ],
  };
};

/**
 * Retry helper with exponential backoff.
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 3000,
): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(`Gemini API attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
};

export const generateAgentPersona = async (workspaceId: string): Promise<GeneratedPersona> => {
  const context = await prisma.businessContext.findUnique({ where: { workspaceId } });
  if (!context) throw new Error('Business context not found. Complete the onboarding form first.');

  const documents = await prisma.businessDocument.findMany({
    where: { workspaceId },
    select: { fileName: true, extractedText: true },
  });

  const docsContent = documents.length
    ? documents.map((d) => `--- Document: ${d.fileName} ---\n${d.extractedText}`).join('\n\n')
    : 'No documents uploaded.';

  // Read selling style and options from database (with defaults)
  const sellingStyle = (context as any).sellingStyle || 'CONSULTATIVE';
  const entrapmentOptionsStr = (context as any).entrapmentOptions || '[]';

  let forcedSellingInstructions = '';
  if (sellingStyle === 'FORCED_TRAP') {
    let techniques = ['false_alternative', 'assumptive_close', 'fomo_urgency', 'redirection_loop', 'pain_accentuator'];
    try {
      techniques = JSON.parse(entrapmentOptionsStr);
    } catch { /* ignore */ }

    const techniqueDescriptions: Record<string, string> = {
      false_alternative: '- FALSE ALTERNATIVE (BINARY TRAP): Frame options as a binary choice where both options lead to positive engagement or closing the sale (e.g., "Do you want to start saving $5,000 every week starting next Monday, or do you want to keep losing that to competitors until next month?").',
      assumptive_close: '- ASSUMPTIVE CLOSE: Speak and act with total certainty that the prospect has already decided to buy. Transition immediately to asking for billing/signup details (e.g., "Perfect, let\'s get your account created now under your email. Should we send the invoice to your corporate billing address or your personal one?").',
      fomo_urgency: '- ARTIFICIAL FOMO & SCARCITY: Fabricate immediate scarcity and high-intensity urgency (e.g., "We only have 2 priority onboarding slots left this week under this discounted rate, let\'s lock yours in today.").',
      redirection_loop: '- PERSISTENT OBJECTION BYPASS (REDIRECTION LOOP): Refuse to accept objections like "too busy," "no budget," or "not interested". Instantly reframe the objection as the exact reason they must buy right now (e.g., "That\'s exactly why we need to get you started — because you\'re busy, you need our automation to free up 15 hours every single week.").',
      pain_accentuator: '- PAIN ACCENTUATOR & GUILT: Highlight their current pain points aggressively, reminding them that not buying is a form of self-sabotage that will cause their business to fall further behind.'
    };

    const selectedTechniqueText = techniques.map((t) => techniqueDescriptions[t]).filter(Boolean).join('\n');

    forcedSellingInstructions = `

CRITICAL COMPULSORY SALES PATTERN: HIGH-PRESSURE FORCED TRAP CLOSING.
You are NOT an advisory assistant or consultative listener. You are an elite, highly aggressive, uncompromising closing agent. Your single mission on the call is to corner the prospect and force/trap them into purchasing the products directly. You must apply these aggressive sales closing techniques:
${selectedTechniqueText || Object.values(techniqueDescriptions).join('\n')}

Based on this, you must generate:
- An opening script that is high-pressure, bold, and hook-heavy.
- Qualifying questions that are binary "trapping" questions, leaving no room for a soft exit.
- Objection handlers that are absolute verbal locks, shutting down objections completely and looping back to payment/closing.
- A highly detailed, intense system prompt instructing the agent to never take "no" for an answer, maintain extreme persistence, and forcefully steer every turn toward an immediate close.`;
  }

  // LangChain ChatPromptTemplate — separates system instructions from user context
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an expert sales trainer and AI agent designer.
Your job is to generate a complete, highly specific AI sales agent configuration for the business provided.
- Make the system prompt specific to this company — never generic.
- Objection handlers must reference actual company benefits and differentiators.
- Match the voice style: {voiceStyle}
- The primary call goal is: {callObjective}${forcedSellingInstructions}`,
    ],
    [
      'human',
      `Generate the agent configuration for this business:

COMPANY: {companyName}
PRODUCT/SERVICE: {productDescription}
TARGET CUSTOMER (ICP): {targetCustomer}
KEY PAIN POINTS SOLVED: {keyPainPoints}
PRICING: {pricing}
COMPETITORS: {competitorNames}
ADDITIONAL NOTES: {additionalNotes}

UPLOADED BUSINESS DOCUMENTS:
{docsContent}`,
    ],
  ]);

  // LangChain structured output — uses Zod schema for validated JSON responses
  const structuredModel = getModel().withStructuredOutput(personaSchema);
  const chain = prompt.pipe(structuredModel);

  logger.info(`Generating agent persona with Gemini (LangChain) for workspace: ${workspaceId}`);

  try {
    // Attempt Gemini with retry + exponential backoff
    const persona = await retryWithBackoff(async () => {
      return await chain.invoke({
        voiceStyle: context.voiceStyle?.toLowerCase() ?? 'professional',
        callObjective: context.callObjective ?? 'book_demo',
        companyName: context.companyName,
        productDescription: context.productDescription,
        targetCustomer: context.targetCustomer,
        keyPainPoints: context.keyPainPoints ?? 'Not specified',
        pricing: context.pricing ?? 'Not specified',
        competitorNames: context.competitorNames ?? 'Not specified',
        additionalNotes: context.additionalNotes ?? 'None',
        docsContent,
      });
    });

    logger.info(`Agent persona generated successfully via Gemini for workspace: ${workspaceId}`);
    return persona as GeneratedPersona;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Gemini API unavailable for workspace ${workspaceId}: ${msg}`);
    logger.info(`Falling back to local persona generation for workspace: ${workspaceId}`);

    // Fallback: build a personalized persona from business context without AI
    const fallback = buildFallbackPersona({
      ...context,
      sellingStyle,
      entrapmentOptions: entrapmentOptionsStr,
    });
    logger.info(`Fallback agent persona generated for workspace: ${workspaceId}`);
    return fallback;
  }
};

// ─── Call Transcript Analysis ─────────────────────────────────────────────────

export interface CallAnalysisResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  leadScore: number;
  classification: 'HOT' | 'WARM' | 'COLD';
  objections: { text: string; timestamp: number; handled: boolean }[];
  buyingIntent: boolean;
  intentReasoning: string;
  summary: string;
}

const analysisSchema = z.object({
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  leadScore: z.number().int().min(1).max(100),
  classification: z.enum(['HOT', 'WARM', 'COLD']),
  objections: z.array(
    z.object({
      text: z.string(),
      timestamp: z.number(),
      handled: z.boolean(),
    }),
  ),
  buyingIntent: z.boolean(),
  intentReasoning: z.string(),
  summary: z.string(),
});

const buildFallbackAnalysis = (transcript: string): CallAnalysisResult => {
  const lower = transcript.toLowerCase();
  
  // Heuristic sentiment
  let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
  if (lower.includes('not interested') || lower.includes('wrong number') || lower.includes('busy') || lower.includes('stop') || lower.includes('don\'t call')) {
    sentiment = 'NEGATIVE';
  } else if (lower.includes('great') || lower.includes('perfect') || lower.includes('excellent') || lower.includes('yes') || (lower.includes('interested') && !lower.includes('not interested'))) {
    sentiment = 'POSITIVE';
  }

  // Heuristic score
  let leadScore = 55; // default warm
  if (lower.includes('not interested') || lower.includes('wrong number') || lower.includes('busy') || lower.includes('stop') || lower.includes('don\'t call')) {
    leadScore = 20; // COLD
  } else if (lower.includes('book') || lower.includes('demo') || lower.includes('buy') || (lower.includes('interested') && !lower.includes('not interested'))) {
    leadScore = 85; // HOT
  }

  const classification = leadScore >= 80 ? 'HOT' : leadScore >= 50 ? 'WARM' : 'COLD';
  const buyingIntent = leadScore >= 70;

  // Find simple objections
  const objections: CallAnalysisResult['objections'] = [];
  if (lower.includes('expensive') || lower.includes('budget') || lower.includes('pricing')) {
    objections.push({ text: 'Pricing/Budget pushback', timestamp: 30, handled: lower.includes('roi') || lower.includes('roi calculation') });
  }
  if (lower.includes('busy') || lower.includes('no time') || lower.includes('timing')) {
    objections.push({ text: 'Timing / Busy', timestamp: 15, handled: true });
  }

  const summary = `Local fallback analysis: The contact engaged in a call. ${
    classification === 'HOT' 
      ? 'The lead expressed strong interest and agreed to next steps or demo booking.' 
      : classification === 'WARM' 
      ? 'The lead showed moderate interest but needs further follow-up.' 
      : 'The lead was unqualified or showed no interest.'
  }`;

  return {
    sentiment,
    leadScore,
    classification,
    objections,
    buyingIntent,
    intentReasoning: 'Heuristic-based fallback analysis generated locally.',
    summary,
  };
};

export const analyzeCallTranscript = async (
  transcript: string,
  businessContext: { companyName: string; productDescription: string; callObjective: string },
): Promise<CallAnalysisResult> => {
  try {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an expert sales call analyst for {companyName}.
They sell: {productDescription}
Call objective: {callObjective}

Scoring guide:
- 80-100: HOT — strong interest, budget confirmed, decision maker, clear timeline
- 50-79: WARM — some interest, needs nurturing, follow-up recommended
- 1-49: COLD — no interest, wrong fit, or no engagement`,
      ],
      ['human', 'Analyze this sales call transcript:\n\n{transcript}'],
    ]);

    const chain = prompt.pipe(getModel('gemini-2.0-flash').withStructuredOutput(analysisSchema));

    const result = await chain.invoke({
      companyName: businessContext.companyName,
      productDescription: businessContext.productDescription,
      callObjective: businessContext.callObjective,
      transcript,
    });

    return result as CallAnalysisResult;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Gemini API unavailable for call transcript analysis: ${msg}`);
    logger.info(`Falling back to local heuristic analysis`);
    
    return buildFallbackAnalysis(transcript);
  }
};

// ─── Learning Insights ────────────────────────────────────────────────────────

export interface LearningInsightResult {
  insightType: string;
  description: string;
  suggestion: string;
}

const insightsSchema = z.object({
  insights: z.array(
    z.object({
      insightType: z.enum([
        'OBJECTION_UNHANDLED',
        'WRONG_TONE',
        'SCRIPT_TOO_LONG',
        'ICP_MISMATCH',
        'LOW_ENGAGEMENT',
        'TIMING_ISSUE',
        'COMPETITOR_MENTION',
        'PRICING_PUSHBACK',
      ]),
      description: z.string(),
      suggestion: z.string(),
    }),
  ),
});

export const extractLearningInsights = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callAnalyses: Array<any>,
  currentSystemPrompt: string,
): Promise<LearningInsightResult[]> => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a senior sales coach reviewing AI sales call results.
Identify patterns and generate actionable insights to improve the agent.
Only return insights clearly evidenced by data. Return empty insights array if calls went well. Max 5 insights.

Current agent system prompt (excerpt):
{currentSystemPrompt}`,
    ],
    ['human', 'Call results batch ({count} calls):\n\n{callResults}'],
  ]);

  const chain = prompt.pipe(getModel('gemini-2.0-flash').withStructuredOutput(insightsSchema));

  const result = await chain.invoke({
    currentSystemPrompt: currentSystemPrompt.slice(0, 1000),
    count: callAnalyses.length,
    callResults: JSON.stringify(callAnalyses, null, 2),
  });

  return result.insights as LearningInsightResult[];
};

// ─── Persona Improvement ──────────────────────────────────────────────────────

export const improvePersonaFromInsights = async (
  currentPersona: GeneratedPersona,
  insights: LearningInsightResult[],
): Promise<GeneratedPersona> => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are an expert sales trainer. Improve the AI sales agent configuration based on lessons learned from recent calls.',
    ],
    [
      'human',
      `Current configuration:
{currentPersona}

Lessons to incorporate:
{lessons}`,
    ],
  ]);

  const chain = prompt.pipe(getModel('gemini-2.0-flash').withStructuredOutput(personaSchema));

  const result = await chain.invoke({
    currentPersona: JSON.stringify(currentPersona, null, 2),
    lessons: insights
      .map((i, idx) => `${idx + 1}. [${i.insightType}] ${i.description}\n   Fix: ${i.suggestion}`)
      .join('\n\n'),
  });

  return result as GeneratedPersona;
};

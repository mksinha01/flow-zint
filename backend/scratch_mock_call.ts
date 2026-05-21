import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function runMockCall() {
  console.log('--- STARTING SIMULATED CALL ANALYSIS TEST ---');

  // 1. Get an existing lead
  const lead = await prisma.lead.findFirst();
  if (!lead) {
    console.error('No lead found in the database. Please import or add a lead first.');
    return;
  }
  console.log(`Using Lead: ${lead.name} (${lead.phone}) from Workspace: ${lead.workspaceId}`);

  // 2. Get active agent config or first agent config
  let agentConfig = await prisma.agentConfig.findFirst({
    where: { workspaceId: lead.workspaceId, status: 'ACTIVE' }
  });
  if (!agentConfig) {
    agentConfig = await prisma.agentConfig.findFirst({
      where: { workspaceId: lead.workspaceId }
    });
  }
  if (!agentConfig) {
    console.log('No agent config found. Creating a default one...');
    agentConfig = await prisma.agentConfig.create({
      data: {
        workspaceId: lead.workspaceId,
        version: 1,
        status: 'ACTIVE',
        systemPrompt: 'You are a helpful AI sales agent.',
        openingScript: 'Hello, how can I help you today?',
        qualifyingQuestions: '[]',
        objectionHandlers: '[]',
      }
    });
  }
  console.log(`Using Agent Config: v${agentConfig.version} (${agentConfig.id})`);

  // Ensure BusinessContext exists
  const context = await prisma.businessContext.findUnique({
    where: { workspaceId: lead.workspaceId }
  });
  if (!context) {
    console.log('Creating mock BusinessContext for workspace...');
    await prisma.businessContext.create({
      data: {
        workspaceId: lead.workspaceId,
        companyName: 'FlowZint AI',
        productDescription: 'AI Outbound Voice Call Agents for qualification and booking.',
        targetCustomer: 'Sales Teams',
        keyPainPoints: 'High cost of human callers',
        callObjective: 'qualify',
      }
    });
  }

  // 3. Create simulated call
  const call = await prisma.call.create({
    data: {
      workspaceId: lead.workspaceId,
      leadId: lead.id,
      agentConfigId: agentConfig.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    }
  });
  console.log(`Created Call: ${call.id}`);

  // 4. Update the call and trigger analysis by calling the internal PATCH endpoint
  const url = `http://localhost:4000/api/internal/calls/${call.id}`;
  const payload = {
    status: 'COMPLETED',
    transcript: `AI: Hello! Is this ${lead.name}?
Lead: Yes, this is ${lead.name}.
AI: Hi there! I am calling from FlowZint AI. We build automated AI voice callers to qualify leads and book demos automatically. Are you looking to improve your sales outbound calling?
Lead: Actually yes, we are getting a huge number of inbound leads but our team does not have the capacity to call all of them. So this sounds very interesting.
AI: That is wonderful! To make sure it is a good fit, what is your current monthly budget for sales tools?
Lead: We can spend up to $2500 per month if the ROI is there.
AI: That is a very healthy budget. And when are you looking to start using a solution?
Lead: Ideally within the next two weeks.
AI: Perfect. I would love to book a personalized product demo for you with one of our account executives. Would tomorrow at 2:00 PM work?
Lead: Yes, that works perfectly.
AI: Excellent, I will send you a booking confirmation email. Have a great day!`
  };

  const internalKey = process.env.BACKEND_INTERNAL_KEY || 'super-secret-key';
  
  console.log(`Sending PATCH request to ${url}...`);
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalKey
      },
      body: JSON.stringify(payload)
    });

    console.log(`PATCH Response Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('PATCH Response Body:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('Simulating waiting for Gemini analysis (5 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Fetch call analysis
      const analysis = await prisma.callAnalysis.findUnique({
        where: { callId: call.id }
      });

      if (analysis) {
        console.log('\nSUCCESS! CallAnalysis successfully generated:');
        console.log('--------------------------------------------------');
        console.log(`Sentiment: ${analysis.sentiment}`);
        console.log(`Lead Score: ${analysis.leadScore}`);
        console.log(`Classification: ${analysis.classification}`);
        console.log(`Buying Intent: ${analysis.buyingIntent}`);
        console.log(`Summary: ${analysis.summary}`);
        console.log(`Objections: ${analysis.objections}`);
        console.log('--------------------------------------------------');
      } else {
        console.warn('\nAnalysis record was not created yet. Checking if it takes longer...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        const retryAnalysis = await prisma.callAnalysis.findUnique({
          where: { callId: call.id }
        });
        if (retryAnalysis) {
          console.log('\nSUCCESS (on retry)! CallAnalysis successfully generated:');
          console.log('--------------------------------------------------');
          console.log(`Sentiment: ${retryAnalysis.sentiment}`);
          console.log(`Lead Score: ${retryAnalysis.leadScore}`);
          console.log(`Classification: ${retryAnalysis.classification}`);
          console.log(`Buying Intent: ${retryAnalysis.buyingIntent}`);
          console.log(`Summary: ${retryAnalysis.summary}`);
          console.log('--------------------------------------------------');
        } else {
          console.error('\nFAILED: CallAnalysis record was NOT created. Check backend server logs.');
        }
      }
    } else {
      console.error('Failed to update call status via internal route.');
    }
  } catch (err) {
    console.error('Error during simulated call:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runMockCall();

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function runMockCalls() {
  console.log('--- STARTING EXTRA SIMULATED CALLS ---');

  // 1. Get workspace and active config
  const existingCall = await prisma.call.findFirst({
    include: { lead: true }
  });
  if (!existingCall) {
    console.error('Run scratch_mock_call.ts first to ensure active data exists.');
    return;
  }
  const workspaceId = existingCall.workspaceId;
  
  let agentConfig = await prisma.agentConfig.findFirst({
    where: { workspaceId, status: 'ACTIVE' }
  });
  if (!agentConfig) {
    agentConfig = await prisma.agentConfig.findFirst({
      where: { workspaceId }
    });
  }
  if (!agentConfig) {
    console.error('No agent config found.');
    return;
  }

  // 2. Clean up previous test runs to avoid duplicates (cascading delete)
  const leadsToDelete = await prisma.lead.findMany({
    where: {
      phone: { in: ['+15550001111', '+15552223333'] }
    }
  });
  const leadIds = leadsToDelete.map(l => l.id);
  if (leadIds.length > 0) {
    await prisma.booking.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.call.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  }

  // 3. Create a new lead for a WARM call
  const warmLead = await prisma.lead.create({
    data: {
      workspaceId,
      name: 'Sarah Connor',
      phone: '+15550001111',
      email: 'sarah.connor@example.com',
      company: 'Cyberdyne Systems',
      status: 'NEW',
    }
  });
  console.log(`Created Warm Lead: ${warmLead.name}`);

  // Create call record for Sarah
  const warmCall = await prisma.call.create({
    data: {
      workspaceId,
      leadId: warmLead.id,
      agentConfigId: agentConfig.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    }
  });
  console.log(`Created Warm Call: ${warmCall.id}`);

  // Send PATCH request for WARM call
  const warmUrl = `http://localhost:4000/api/internal/calls/${warmCall.id}`;
  const warmPayload = {
    status: 'COMPLETED',
    transcript: `AI: Hello Sarah! This is Alex from FlowZint AI. We help companies automate their outbound sales calling using smart AI agents. Do you have a minute to chat?
Lead: Hi Alex. Actually yes, we are evaluating sales automation tools right now. But we don't have a large budget at the moment.
AI: I completely understand, budget is always a crucial consideration. Can I ask what you are currently spending or looking to spend on outbound operations?
Lead: Our budget is extremely tight, maybe around $300 a month. But if the product is really good, we might be able to allocate more in the next quarter.
AI: That makes sense. We do have entry-level starter plans that fit right in that range. Would you be willing to read an email with details?
Lead: Yes, please send me some info by email first, and we can discuss further once I check with my team.`
  };

  // 3. Create a new lead for a COLD call
  const coldLead = await prisma.lead.create({
    data: {
      workspaceId,
      name: 'John Connor',
      phone: '+15552223333',
      email: 'john.connor@example.com',
      company: 'Resistance Corp',
      status: 'NEW',
    }
  });
  console.log(`Created Cold Lead: ${coldLead.name}`);

  // Create call record for John
  const coldCall = await prisma.call.create({
    data: {
      workspaceId,
      leadId: coldLead.id,
      agentConfigId: agentConfig.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    }
  });
  console.log(`Created Cold Call: ${coldCall.id}`);

  // Send PATCH request for COLD call
  const coldUrl = `http://localhost:4000/api/internal/calls/${coldCall.id}`;
  const coldPayload = {
    status: 'COMPLETED',
    transcript: `AI: Hello John! This is Alex from FlowZint AI. How are you today?
Lead: Who is this? How did you get my number?
AI: I am calling from FlowZint AI. We help businesses optimize outbound sales. I wanted to ask if you have a minute to talk about your sales pipeline?
Lead: No, I am extremely busy right now. I am not interested in this. Please don't call this number again.
AI: No problem, John. I understand. Have a great day!`
  };

  const internalKey = process.env.BACKEND_INTERNAL_KEY || 'super-secret-key';

  // Dispatch both PATCH updates
  try {
    // Warm Call Patch
    console.log(`Sending PATCH request for Warm Call ${warmCall.id}...`);
    const warmRes = await fetch(warmUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalKey
      },
      body: JSON.stringify(warmPayload)
    });
    console.log(`Warm PATCH Response: ${warmRes.status}`);

    // Cold Call Patch
    console.log(`Sending PATCH request for Cold Call ${coldCall.id}...`);
    const coldRes = await fetch(coldUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalKey
      },
      body: JSON.stringify(coldPayload)
    });
    console.log(`Cold PATCH Response: ${coldRes.status}`);

    console.log('Waiting 5 seconds for background analysis workers...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify Warm Analysis
    const warmAnalysis = await prisma.callAnalysis.findUnique({
      where: { callId: warmCall.id }
    });
    console.log('\n--- Sarah Connor (WARM) Analysis Result ---');
    if (warmAnalysis) {
      console.log(`Score: ${warmAnalysis.leadScore}`);
      console.log(`Classification: ${warmAnalysis.classification}`);
      console.log(`Sentiment: ${warmAnalysis.sentiment}`);
      console.log(`Summary: ${warmAnalysis.summary}`);
      console.log(`Objections: ${warmAnalysis.objections}`);
    } else {
      console.log('No analysis found for warm call.');
    }

    // Verify Cold Analysis
    const coldAnalysis = await prisma.callAnalysis.findUnique({
      where: { callId: coldCall.id }
    });
    console.log('\n--- John Connor (COLD) Analysis Result ---');
    if (coldAnalysis) {
      console.log(`Score: ${coldAnalysis.leadScore}`);
      console.log(`Classification: ${coldAnalysis.classification}`);
      console.log(`Sentiment: ${coldAnalysis.sentiment}`);
      console.log(`Summary: ${coldAnalysis.summary}`);
      console.log(`Objections: ${coldAnalysis.objections}`);
    } else {
      console.log('No analysis found for cold call.');
    }

  } catch (err) {
    console.error('Error dispatching simulated calls:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runMockCalls();

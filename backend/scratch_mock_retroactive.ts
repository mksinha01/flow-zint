import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function runRetroactiveHealingSimulation() {
  console.log('--- STARTING RETROACTIVE SELF-HEALING SIMULATION ---');

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

  // 2. Clean up previous test runs to avoid duplicates
  const oldLeads = await prisma.lead.findMany({
    where: { name: 'Retro Lead' }
  });
  const oldLeadIds = oldLeads.map(l => l.id);
  if (oldLeadIds.length > 0) {
    await prisma.booking.deleteMany({ where: { leadId: { in: oldLeadIds } } });
    await prisma.call.deleteMany({ where: { leadId: { in: oldLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: oldLeadIds } } });
    console.log('Cleaned up previous retroactive test runs.');
  }

  // 3. Create a new lead for retroactive analysis
  const lead = await prisma.lead.create({
    data: {
      workspaceId,
      name: 'Retro Lead',
      phone: '+15559998888',
      email: 'retro.lead@example.com',
      company: 'Self Healing Inc',
      status: 'NEW',
    }
  });
  console.log(`Created Lead: ${lead.name}`);

  // 4. Create an UNANALYZED completed call record
  const call = await prisma.call.create({
    data: {
      workspaceId,
      leadId: lead.id,
      agentConfigId: agentConfig.id,
      status: 'COMPLETED',
      duration: 120,
      transcript: `AI: Hello Retro Lead! This is Alex from FlowZint AI. How are you today?
Lead: Hi Alex. I wanted to see if we can book a demo of your outbound caller.
AI: Of course! I can absolutely book a demo for you tomorrow at 3 PM. Does that work?
Lead: Yes, tomorrow at 3 PM is perfect!
AI: Excellent, I'll send over the details. Have a wonderful day!`,
      startedAt: new Date(Date.now() - 1000 * 60 * 2),
      endedAt: new Date(),
    }
  });
  console.log(`Created Completed Call: ${call.id} (WITHOUT analysis)`);

  // Verify that CallAnalysis does NOT exist yet
  const initialAnalysis = await prisma.callAnalysis.findUnique({
    where: { callId: call.id }
  });
  console.log(`Initial CallAnalysis state: ${initialAnalysis ? 'FOUND (unexpected!)' : 'NOT FOUND (expected! Call is currently unanalyzed.)'}`);

  // 5. Trigger the Self-Healing Retroactive Runner by fetching Dashboard Stats
  // We can do this by making an authenticated HTTP request or simulating it directly.
  // Since we have the session context in our workspace, let's trigger it by calling the dashboard stats endpoint!
  // To make an authenticated request, let's find a user in the workspace to get an auth token or use the internal route.
  // Actually, we can also just call the controller's logic directly, or fetch it via localhost!
  // Wait, let's look at the users. Let's see if we can get a user from the workspace.
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found to fetch JWT for dashboard HTTP request.');
    return;
  }

  // Instead of complex JWT signing in scratch script, let's simulate the self-healing runner's invocation directly:
  // The retroactive runner in dashboard.controller.ts is:
  //   const unanalyzed = await prisma.call.findMany({
  //     where: { workspaceId, status: 'COMPLETED', transcript: { not: null }, analysis: null },
  //     select: { id: true }
  //   });
  //   if (unanalyzed.length > 0) {
  //     Promise.all(unanalyzed.map(c => runCallAnalysis(c.id).catch(() => {}))).catch(() => {});
  //   }
  // Let's trigger it by calling the GET /api/dashboard/stats route!
  // Since we need authentication, let's generate a token or just call the localhost API.
  // Wait, the backend uses JWT. Let's sign a JWT token using our secret!
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: user.id, email: user.email, workspaceId }, process.env.JWT_SECRET || 'super-secret-jwt-key');

  console.log('Sending GET request to dashboard stats endpoint to trigger retroactive self-healing...');
  const statsUrl = 'http://localhost:4000/api/dashboard/stats';
  
  try {
    const res = await fetch(statsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-workspace-id': workspaceId
      }
    });
    console.log(`Dashboard Stats Response Status: ${res.status} ${res.statusText}`);

    console.log('Waiting 5 seconds for retroactive self-healing analyzer to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. Verify that CallAnalysis HAS BEEN created retroactively!
    const finalAnalysis = await prisma.callAnalysis.findUnique({
      where: { callId: call.id }
    });

    console.log('\n--- VERIFICATION OF RETROACTIVE SELF-HEALING ---');
    console.log('--------------------------------------------------');
    if (finalAnalysis) {
      console.log('SUCCESS! The unanalyzed call was retroactively healed and analyzed in the background!');
      console.log(`Sentiment: ${finalAnalysis.sentiment}`);
      console.log(`Lead Score: ${finalAnalysis.leadScore}`);
      console.log(`Classification: ${finalAnalysis.classification}`);
      console.log(`Summary: ${finalAnalysis.summary}`);
    } else {
      console.error('FAILED: Call was not retroactively analyzed. Check backend server logs.');
    }
    console.log('--------------------------------------------------');

  } catch (err) {
    console.error('Error during self-healing simulation:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runRetroactiveHealingSimulation();

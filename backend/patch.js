const fs = require('fs');

let c1 = fs.readFileSync('src/controllers/dashboard.controller.ts', 'utf8');
c1 = c1.replace('const objs = a.objections as Array<{ text: string }>;', 'const objs = (typeof a.objections === "string" ? JSON.parse(a.objections) : a.objections) as Array<{ text: string }>;');
fs.writeFileSync('src/controllers/dashboard.controller.ts', c1);

let c2 = fs.readFileSync('src/controllers/leads.controller.ts', 'utf8');
c2 = c2.replace('skipDuplicates: true,', '');
fs.writeFileSync('src/controllers/leads.controller.ts', c2);

let c3 = fs.readFileSync('src/services/learning.service.ts', 'utf8');
c3 = c3.replace('sourceCallIds: callIds,', 'sourceCallIds: JSON.stringify(callIds),');
c3 = c3.replace('qualifyingQuestions: activeConfig.qualifyingQuestions as string[],', 'qualifyingQuestions: JSON.parse(activeConfig.qualifyingQuestions as string),');
c3 = c3.replace('objectionHandlers: activeConfig.objectionHandlers as {', 'objectionHandlers: JSON.parse(activeConfig.objectionHandlers as string) as {');
c3 = c3.replace('qualifyingQuestions: improvedPersona.qualifyingQuestions,', 'qualifyingQuestions: JSON.stringify(improvedPersona.qualifyingQuestions),');
c3 = c3.replace('objectionHandlers: improvedPersona.objectionHandlers,', 'objectionHandlers: JSON.stringify(improvedPersona.objectionHandlers),');
c3 = c3.replace('generatedFromInsights: savedInsights.map((i) => i.id),', 'generatedFromInsights: JSON.stringify(savedInsights.map((i) => i.id)),');
fs.writeFileSync('src/services/learning.service.ts', c3);

let c4 = fs.readFileSync('src/services/persona.service.ts', 'utf8');
c4 = c4.replace('qualifyingQuestions: persona.qualifyingQuestions,', 'qualifyingQuestions: JSON.stringify(persona.qualifyingQuestions),');
c4 = c4.replace('objectionHandlers: persona.objectionHandlers,', 'objectionHandlers: JSON.stringify(persona.objectionHandlers),');
fs.writeFileSync('src/services/persona.service.ts', c4);

console.log('Patched');

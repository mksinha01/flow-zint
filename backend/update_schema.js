const fs = require('fs');
let s = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. replace provider and url
s = s.replace('provider = "postgresql"', 'provider = "sqlite"');
s = s.replace('env("DATABASE_URL")', '"file:./dev.db"');

// 2. remove all @db.Text
s = s.replace(/@db\.Text/g, '');

// 3. remove enums
const enums = ['Role', 'VoiceStyle', 'LeadStatus', 'CallStatus', 'Sentiment', 'LeadClass', 'InsightType', 'AgentConfigStatus'];
for (const e of enums) {
  const regex = new RegExp(`enum ${e} \\{[\\s\\S]*?\\}`, 'g');
  s = s.replace(regex, '');
  
  const typeRegex = new RegExp(`(\\s)${e}(\\s|\\?|$)`, 'g');
  s = s.replace(typeRegex, `$1String$2`);
}

// 4. replace Json with String
s = s.replace(/\bJson\b/g, 'String');

// 5. convert enum defaults from enum literal to string literal
s = s.replace(/@default\(([A-Z_]+)\)/g, '@default("$1")');

fs.writeFileSync('prisma/schema.prisma', s);
console.log('Done!');

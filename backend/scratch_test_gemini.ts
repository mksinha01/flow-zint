import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Using API Key:', apiKey);

const model = new ChatGoogleGenerativeAI({
  apiKey: apiKey,
  model: 'gemini-2.0-flash',
  temperature: 0.7,
  maxRetries: 0, // <--- Disable LangChain's internal endless retries
});

const schema = z.object({
  openingScript: z.string(),
  qualifyingQuestions: z.array(z.string()),
});

async function main() {
  console.log('Initializing chain...');
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'Generate a simple opening script and 3 questions for {companyName}'],
    ['human', 'Go'],
  ]);

  const structuredModel = model.withStructuredOutput(schema);
  const chain = prompt.pipe(structuredModel);

  console.log('Invoking chain...');
  try {
    const result = await chain.invoke({ companyName: 'Test Inc' });
    console.log('Result:', result);
  } catch (err) {
    console.error('Error occurred and caught:', err);
  }
}

main();

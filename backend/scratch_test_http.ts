import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing HTTP request to Gemini API...');
console.log('Using API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined');

async function testHttp() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: 'Say hello in 3 words' }
        ]
      }
    ]
  };

  try {
    console.log('Sending request to', url);
    const start = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log(`Response received in ${Date.now() - start}ms. Status:`, response.status, response.statusText);
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Request failed:', err);
  }
}

testHttp();

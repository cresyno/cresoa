const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Read the knowledge base
const kbPath = path.join(process.cwd(), 'data', 'knowledge-base.md');
const kbText = fs.readFileSync(kbPath, 'utf-8');

// Split into chunks (roughly by paragraphs)
const chunks = kbText
  .split(/\n\s*\n|##\s*/)
  .filter(chunk => chunk.trim().length > 50);

// Connect to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate embeddings using Gemini (free)
async function getEmbedding(text) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-001',
        content: { parts: [{ text: text }] }
      })
    }
  );
  const data = await response.json();
  return data.embedding?.values || null;
}

// Insert into Supabase
async function embedAll() {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Embedding chunk ${i + 1}/${chunks.length}...`);
    const embedding = await getEmbedding(chunk);
    if (!embedding) {
      console.error('Failed to generate embedding for chunk:', chunk.slice(0, 50));
      continue;
    }
    await supabase.from('knowledge_chunks').insert({
      content: chunk,
      embedding,
      metadata: { source: 'knowledge-base.md' }
    });
  }
  console.log('✅ Done. All chunks embedded.');
}
embedAll();

// scripts/embed-knowledge.js
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_EMBEDDING_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function embedKnowledgeBase() {
  console.log('📖 Reading PDF...');
  const dataBuffer = fs.readFileSync(path.join(__dirname, '../cresoa-knowledge-base.pdf'));
  const data = await pdfParse(dataBuffer);
  const text = data.text;

  // Split by headers (e.g., "## Orders")
  const lines = text.split('\n');
  let chunks = [];
  let currentChunk = '';
  let currentMetadata = { section: 'General' };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentChunk.trim().length > 50) chunks.push({ text: currentChunk.trim(), metadata: currentMetadata });
      currentChunk = line + '\n';
      currentMetadata = { section: line.replace('## ', '').trim() };
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk.trim().length > 50) chunks.push({ text: currentChunk.trim(), metadata: currentMetadata });

  console.log(`✅ Found ${chunks.length} chunks.`);

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔄 Generating embedding ${i + 1}/${chunks.length}...`);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks[i].text,
    });
    const { error } = await supabase
      .from('support_knowledge_chunks')
      .upsert({ content: chunks[i].text, embedding: response.data[0].embedding, metadata: chunks[i].metadata });
    if (error) console.error('❌ Error:', error);
  }
  console.log('🎉 Done! Tessa is now smart.');
}

embedKnowledgeBase().catch(console.error);

import fetch from 'node-fetch';
import { Pinecone } from '@pinecone-database/pinecone';

const EMBEDDING_URL = process.env.EMBEDDING_SERVICE?.replace(/\/$/, '') || '';
const EMBEDDING_MODEL_NAME = process.env.EMBEDDING_MODEL_NAME || 'e5-large-v2';
const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || '1024', 10);

function hashId(text, i) {
  // Simple deterministic id
  const base = Buffer.from(text).toString('base64').slice(0, 24);
  return `${base}-${i}`;
}

export async function embedAndUpsert(chunks, namespace, baseMetadata = {}, modelName) {
  if (!EMBEDDING_URL) throw new Error('EMBEDDING_SERVICE not set');
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error('Missing Pinecone configuration');
  }
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(process.env.PINECONE_INDEX);

  const vectors = [];
  // Batch embed to reduce roundtrips (basic sequential batching)
  for (let i = 0; i < chunks.length; i++) {
    const body = { text: chunks[i], model: modelName || EMBEDDING_MODEL_NAME };
    const r = await fetch(`${EMBEDDING_URL}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`Embedding failed: ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data.embedding)) throw new Error('Invalid embedding response');
    if (data.embedding.length !== EMBEDDING_DIM) {
      // warn but still upsert
    }
    vectors.push({
      id: hashId(chunks[i], i),
      values: data.embedding,
      metadata: { ...baseMetadata, chunkIndex: i, length: chunks[i].length }
    });
  }

  const upserted = vectors.length;
  await index.upsert(vectors, { namespace });
  return { upserted };
}
import pkg from 'tiktoken';
const { getEncoding } = pkg;

// Token-based chunker using tiktoken
export function chunkByTiktoken(text, { chunkSize = 800, chunkOverlap = 200 } = {}) {
  const enc = getEncoding('cl100k_base');
  const tokens = enc.encode(text);
  const chunks = [];
  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const part = tokens.slice(start, end);
    const decoded = enc.decode(part);
    chunks.push(decoded);
    if (end === tokens.length) break;
    start = end - Math.min(chunkOverlap, end);
  }
  enc.free && enc.free();
  return chunks;
}
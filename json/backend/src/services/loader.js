import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

export async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buf = await fs.readFile(filePath);

  if (ext === '.txt') {
    return buf.toString('utf8');
  }

  if (ext === '.md') {
    const md = buf.toString('utf8');
    const tree = unified().use(remarkParse).parse(md);
    // simple plain text extraction from md AST
    const lines = [];
    function walk(node) {
      if (typeof node.value === 'string') lines.push(node.value);
      if (Array.isArray(node.children)) node.children.forEach(walk);
    }
    walk(tree);
    return lines.join('\n').trim();
  }

  if (ext === '.pdf') {
    const data = await pdfParse(buf);
    return data.text || '';
  }

  throw new Error('Unsupported file type');
}
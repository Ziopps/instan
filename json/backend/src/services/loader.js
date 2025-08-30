import fs from 'fs/promises';
import path from 'path';
import { PdfReader } from 'pdfreader';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

export async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    const buf = await fs.readFile(filePath);
    return buf.toString('utf8');
  }

  if (ext === '.md') {
    const buf = await fs.readFile(filePath);
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
    return new Promise((resolve, reject) => {
      let text = '';
      new PdfReader().parseFileItems(filePath, (err, item) => {
        if (err) {
          reject(err);
        } else if (!item) {
          resolve(text);
        } else if (item.text) {
          text += item.text + ' ';
        }
      });
    });
  }

  throw new Error('Unsupported file type');
}
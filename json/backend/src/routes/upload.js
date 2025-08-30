import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fetch from 'node-fetch';
import { extractTextFromFile } from '../services/loader.js';
import { chunkByTiktoken } from '../services/chunker.js';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${ts}_${sanitized}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB || '25', 10)) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.md', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Unsupported file type'));
    cb(null, true);
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const n8nUrl = process.env.N8N_UPLOAD_URL;
    if (!n8nUrl) return res.status(500).json({ error: 'N8N_UPLOAD_URL not set' });

    const { novelId = 'novel-1', namespace, chunkSize = '800', chunkOverlap = '200', metadataJson } = req.body;
    const ns = namespace || `novel-${novelId}`;

    const rawText = await extractTextFromFile(req.file.path);
    const chunks = chunkByTiktoken(rawText, {
      chunkSize: parseInt(chunkSize, 10),
      chunkOverlap: parseInt(chunkOverlap, 10)
    });

    const baseMeta = {
      novelId,
      sourceFile: req.file.originalname,
      storedAs: req.file.filename,
      uploadedAt: new Date().toISOString(),
      size: req.file.size,
      mimeType: req.file.mimetype,
    };
    let extraMeta = {};
    try { if (metadataJson) extraMeta = JSON.parse(metadataJson); } catch {}

    const payload = {
      novelId,
      namespace: ns,
      source: {
        fileName: req.file.originalname,
        storedAs: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      chunking: {
        strategy: 'tiktoken',
        encoding: 'cl100k_base',
        chunkSize: parseInt(chunkSize, 10),
        chunkOverlap: parseInt(chunkOverlap, 10)
      },
      metadata: { ...baseMeta, ...extraMeta },
      chunks: chunks.map((txt, i) => ({ index: i, text: txt, length: txt.length }))
    };

    const headers = { 'content-type': 'application/json' };
    if (process.env.N8N_TOKEN) headers['authorization'] = `Bearer ${process.env.N8N_TOKEN}`;

    const resp = await fetch(n8nUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!resp.ok) {
      return res.status(502).json({ error: 'forward_failed', status: resp.status, n8n: json });
    }

    return res.json({ status: 'forwarded', n8n: json, chunks: chunks.length, namespace: ns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'upload_failed', message: err.message });
  }
});

export default router;
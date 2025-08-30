import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

function verifySignature(req, payload) {
  const secret = process.env.CALLBACK_SECRET || '';
  const signature = req.header('X-Signature') || req.header('x-signature') || '';
  const timestamp = req.header('X-Timestamp') || req.header('x-timestamp') || '';
  if (!secret || !signature || !timestamp) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return signature === `sha256=${expected}`;
}

router.post('/workflow', expressJsonRaw, (req, res) => {
  try {
    const raw = req.rawBody;
    if (!verifySignature(req, raw)) {
      return res.status(401).json({ error: 'invalid_signature' });
    }
    // Store/process as needed (DB write, log, etc.). For now, echo back.
    const data = JSON.parse(raw);
    return res.json({ status: 'received', data });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: 'bad_payload' });
  }
});

function expressJsonRaw(req, res, next) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
}

export default router;
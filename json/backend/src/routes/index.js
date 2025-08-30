import { Router } from 'express';
import uploadRoutes from './upload.js';
import callbackRoutes from './workflowCallback.js';
import novelGenerationRoutes from './novelGeneration.js';
import memoryRoutes from './memory.js';
import aiModelRoutes from './aiModel.js';

const router = Router();

// Layanan API Inti & Orkestrasi
router.use('/', novelGenerationRoutes);

// Layanan Model AI (Para Pekerja Kreatif)
router.use('/ai-models', aiModelRoutes);

// Memory System Routes (Database & Storage)
router.use('/memory', memoryRoutes);

// Existing routes
router.use('/upload', uploadRoutes);
router.use('/callback', callbackRoutes);

router.get('/health', (_, res) => res.json({ 
  status: 'ok',
  services: [
    'Novel Generation API',
    'AI Model Service (Generation, Evaluation, Embedding)',
    'Memory System (Neo4j, Pinecone, Redis)',
    'Upload Service', 
    'Callback Handler'
  ],
  timestamp: new Date().toISOString()
}));

export default router;
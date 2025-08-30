import { Router } from 'express';
import { NovelOrchestrator } from '../services/orchestrator.js';

const router = Router();
const orchestrator = new NovelOrchestrator();

/**
 * Endpoint Publik: /novel-generation
 * Endpoint utama yang dipicu untuk membuat bab baru
 */
router.post('/novel-generation', async (req, res) => {
  try {
    console.log('Novel generation request received:', {
      novelId: req.body.novelId,
      chapterNumber: req.body.chapterNumber,
      timestamp: new Date().toISOString()
    });

    // Validasi & Keamanan
    const validatedInput = orchestrator.validateNovelGenerationRequest(req.body);
    
    // Orkestrator Alur Kerja
    const result = await orchestrator.orchestrateNovelGeneration(validatedInput);

    res.json({
      success: true,
      message: 'Novel generation completed successfully',
      data: result.data,
      metadata: result.metadata,
      requestId: validatedInput.requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Novel generation failed:', error);
    
    res.status(400).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint Publik: /novel-upload  
 * Endpoint yang memicu "Layanan Ingesti Data"
 */
router.post('/novel-upload', async (req, res) => {
  try {
    console.log('Novel upload request received:', {
      novelId: req.body.novelId,
      hasContent: !!req.body.content,
      hasFileUrl: !!req.body.fileUrl,
      hasChunks: !!req.body.chunks,
      timestamp: new Date().toISOString()
    });

    // Validasi input untuk upload
    const validatedInput = orchestrator.validateNovelUploadRequest(req.body);

    // Call n8n document processing workflow
    const result = await orchestrator.callN8nWorkflow('novel-upload', validatedInput);

    res.json({
      success: true,
      message: 'Novel upload processing initiated',
      data: result,
      requestId: validatedInput.requestId || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Novel upload failed:', error);
    
    res.status(400).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check endpoint untuk novel generation service
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'Novel Generation API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /novel-generation',
      'POST /novel-upload',
      'GET /health'
    ]
  });
});

export default router;
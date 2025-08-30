import { Router } from 'express';
import { aiModelService } from '../services/aiModelService.js';

const router = Router();

/**
 * AI Model Routes - Layanan Model AI (Para Pekerja Kreatif)
 * Endpoints untuk generasi, evaluasi, dan embedding menggunakan berbagai model AI
 */

/**
 * @route POST /ai-models/generate
 * @desc Generate text using AI models
 * @access Public (with rate limiting)
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model, options, requestId } = req.body;

    // Validation
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    if (prompt.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Prompt too long (max 50,000 characters)',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    const startTime = Date.now();

    // Generate text
    const result = await aiModelService.generateText({
      prompt,
      model: model || 'openai',
      options: options || {}
    });

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Text generated successfully',
      data: {
        generatedText: result.content,
        model: result.model,
        usage: result.usage,
        finishReason: result.finishReason,
        wordCount: result.content.split(' ').length,
        characterCount: result.content.length
      },
      metadata: {
        processingTime,
        provider: model || 'openai',
        promptLength: prompt.length
      },
      requestId: requestId || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /ai-models/evaluate
 * @desc Evaluate text quality using AI models
 * @access Public (with rate limiting)
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { text, criteria, model, requestId } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    if (text.length > 20000) {
      return res.status(400).json({
        success: false,
        error: 'Text too long for evaluation (max 20,000 characters)',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    const startTime = Date.now();

    // Evaluate text
    const result = await aiModelService.evaluateText({
      text,
      criteria: criteria || [],
      model: model || 'openai'
    });

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Text evaluation completed successfully',
      data: {
        evaluation: result.evaluation,
        textLength: text.length,
        wordCount: text.split(' ').length
      },
      metadata: {
        processingTime,
        provider: model || 'openai',
        criteriaUsed: result.metadata.criteria,
        evaluationTimestamp: result.metadata.timestamp
      },
      requestId: requestId || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /ai-models/embed
 * @desc Generate embeddings for text
 * @access Public (with rate limiting)
 */
router.post('/embed', async (req, res) => {
  try {
    const { text, model, requestId } = req.body;

    // Validation
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    // Handle both string and array inputs
    const textArray = Array.isArray(text) ? text : [text];
    
    // Validate text length
    for (const t of textArray) {
      if (typeof t !== 'string' || t.length > 8000) {
        return res.status(400).json({
          success: false,
          error: 'Each text must be a string with max 8,000 characters',
          requestId: requestId || null,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (textArray.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 texts can be embedded at once',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    const startTime = Date.now();

    // Generate embeddings
    const result = await aiModelService.generateEmbeddings({
      text: textArray,
      model: model || 'custom'
    });

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Embeddings generated successfully',
      data: {
        embeddings: result.embeddings,
        dimensions: result.dimensions,
        model: result.model,
        count: result.embeddings.length
      },
      metadata: {
        processingTime,
        provider: model || 'custom',
        inputCount: textArray.length,
        totalCharacters: textArray.reduce((sum, t) => sum + t.length, 0)
      },
      requestId: requestId || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /ai-models/models
 * @desc Get available AI models and their capabilities
 * @access Public
 */
router.get('/models', (req, res) => {
  try {
    const models = aiModelService.getAvailableModels();
    
    res.json({
      success: true,
      message: 'Available models retrieved successfully',
      data: {
        models,
        totalProviders: {
          generation: Object.keys(models.generation).length,
          evaluation: Object.keys(models.evaluation).length,
          embedding: Object.keys(models.embedding).length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Models info error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /ai-models/health
 * @desc Health check for AI model services
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      service: 'AI Model Service',
      status: 'healthy',
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        customEmbedding: !!process.env.EMBEDDING_SERVICE
      },
      endpoints: [
        'POST /ai-models/generate',
        'POST /ai-models/evaluate', 
        'POST /ai-models/embed',
        'GET /ai-models/models',
        'GET /ai-models/health'
      ],
      timestamp: new Date().toISOString()
    };

    // Check if at least one provider is configured
    const hasProvider = Object.values(healthStatus.providers).some(Boolean);
    if (!hasProvider) {
      healthStatus.status = 'degraded';
      healthStatus.warning = 'No AI providers configured';
    }

    res.json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      service: 'AI Model Service',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /ai-models/batch-generate
 * @desc Generate multiple texts in batch
 * @access Public (with rate limiting)
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const { prompts, model, options, requestId } = req.body;

    // Validation
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompts must be a non-empty array',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    if (prompts.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 prompts allowed per batch',
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      });
    }

    // Validate each prompt
    for (const prompt of prompts) {
      if (!prompt || typeof prompt !== 'string' || prompt.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Each prompt must be a string with max 10,000 characters',
          requestId: requestId || null,
          timestamp: new Date().toISOString()
        });
      }
    }

    const startTime = Date.now();
    const results = [];
    const errors = [];

    // Process each prompt
    for (let i = 0; i < prompts.length; i++) {
      try {
        const result = await aiModelService.generateText({
          prompt: prompts[i],
          model: model || 'openai',
          options: options || {}
        });

        results.push({
          index: i,
          success: true,
          content: result.content,
          usage: result.usage,
          wordCount: result.content.split(' ').length
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
        results.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      message: `Batch generation completed: ${results.filter(r => r.success).length}/${prompts.length} successful`,
      data: {
        results,
        summary: {
          total: prompts.length,
          successful: results.filter(r => r.success).length,
          failed: errors.length,
          totalWords: results.filter(r => r.success).reduce((sum, r) => sum + (r.wordCount || 0), 0)
        }
      },
      metadata: {
        processingTime,
        provider: model || 'openai',
        batchSize: prompts.length
      },
      requestId: requestId || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.body.requestId || null,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
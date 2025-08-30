import express from 'express';
import { memorySystem } from '../services/memorySystem.js';
import Joi from 'joi';

const router = express.Router();

/**
 * Validation schemas
 */
const novelSchema = Joi.object({
  id: Joi.string().optional(),
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().optional().max(1000),
  genre: Joi.string().optional().max(50),
  author: Joi.string().optional().max(100),
  status: Joi.string().valid('active', 'completed', 'paused').default('active')
});

const characterSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(1000),
  traits: Joi.array().items(Joi.string()).optional(),
  motivations: Joi.array().items(Joi.string()).optional(),
  powers: Joi.array().items(Joi.string()).optional(),
  fears: Joi.array().items(Joi.string()).optional(),
  hiddenDesires: Joi.array().items(Joi.string()).optional(),
  origin: Joi.object().optional(),
  affiliations: Joi.array().items(Joi.object()).optional(),
  trivia: Joi.array().items(Joi.string()).optional()
});

const locationSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(1000),
  geography: Joi.string().optional().max(500),
  culture: Joi.string().optional().max(500),
  type: Joi.string().valid('city', 'country', 'region', 'landmark', 'building').default('city')
});

const chapterSchema = Joi.object({
  number: Joi.number().integer().min(1).required(),
  title: Joi.string().optional().max(200),
  content: Joi.string().required().min(1),
  summary: Joi.string().optional().max(1000),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  focusElements: Joi.string().optional().max(500),
  mood: Joi.string().optional().max(50),
  stylePreference: Joi.string().optional().max(50)
});

/**
 * Initialize memory system
 */
router.post('/initialize', async (req, res) => {
  try {
    const result = await memorySystem.initialize();
    
    if (result) {
      res.json({
        success: true,
        message: 'Memory system initialized successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Memory system initialization failed'
      });
    }
  } catch (error) {
    console.error('Memory system initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * System health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await memorySystem.getSystemHealth();
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Novel Management Routes
 */

// Create novel
router.post('/novels', async (req, res) => {
  try {
    const { error, value } = novelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await memorySystem.createNovel(value);
    res.status(201).json(result);
  } catch (error) {
    console.error('Novel creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get novel
router.get('/novels/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const result = await memorySystem.getNovel(novelId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Novel retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Character Management Routes
 */

// Add character to novel
router.post('/novels/:novelId/characters', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { error, value } = characterSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await memorySystem.addCharacter(novelId, value);
    res.status(201).json(result);
  } catch (error) {
    console.error('Character addition error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get character
router.get('/novels/:novelId/characters/:characterId', async (req, res) => {
  try {
    const { novelId, characterId } = req.params;
    const result = await memorySystem.getCharacter(novelId, characterId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Character retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Location Management Routes
 */

// Add location to novel
router.post('/novels/:novelId/locations', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { error, value } = locationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await memorySystem.addLocation(novelId, value);
    res.status(201).json(result);
  } catch (error) {
    console.error('Location addition error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get location
router.get('/novels/:novelId/locations/:locationId', async (req, res) => {
  try {
    const { novelId, locationId } = req.params;
    const result = await memorySystem.getLocation(novelId, locationId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Location retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Chapter Management Routes
 */

// Add chapter to novel
router.post('/novels/:novelId/chapters', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { error, value } = chapterSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await memorySystem.addChapter(novelId, value);
    res.status(201).json(result);
  } catch (error) {
    console.error('Chapter addition error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get chapter
router.get('/novels/:novelId/chapters/:chapterNumber', async (req, res) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const result = await memorySystem.getChapter(novelId, parseInt(chapterNumber));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Chapter retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get chapter sequence
router.get('/novels/:novelId/chapters', async (req, res) => {
  try {
    const { novelId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await memorySystem.getChapterSequence(novelId, limit);
    res.json(result);
  } catch (error) {
    console.error('Chapter sequence retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Search and Discovery Routes
 */

// Semantic search
router.post('/novels/:novelId/search/semantic', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { query, options = {} } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    const result = await memorySystem.semanticSearch(novelId, query, options);
    res.json(result);
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Entity search
router.get('/novels/:novelId/search/entities', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { q: searchText, types } = req.query;
    
    if (!searchText) {
      return res.status(400).json({
        success: false,
        error: 'Search text (q) is required'
      });
    }

    const entityTypes = types ? types.split(',') : ['Character', 'Location'];
    const result = await memorySystem.searchEntities(novelId, searchText, entityTypes);
    res.json(result);
  } catch (error) {
    console.error('Entity search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Find similar content
router.post('/novels/:novelId/search/similar', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { text, options = {} } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string'
      });
    }

    const result = await memorySystem.findSimilarContent(novelId, text, options);
    res.json(result);
  } catch (error) {
    console.error('Similar content search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Context Building Route
 */
router.post('/novels/:novelId/context/:chapterNumber', async (req, res) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const { focusElements = '' } = req.body;
    
    const result = await memorySystem.buildGenerationContext(
      novelId, 
      parseInt(chapterNumber), 
      focusElements
    );
    
    res.json(result);
  } catch (error) {
    console.error('Context building error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * World State Management Routes
 */

// Get world state
router.get('/novels/:novelId/worldstate', async (req, res) => {
  try {
    const { novelId } = req.params;
    const result = await memorySystem.getWorldState(novelId);
    res.json(result);
  } catch (error) {
    console.error('World state retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update world state
router.patch('/novels/:novelId/worldstate', async (req, res) => {
  try {
    const { novelId } = req.params;
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Updates object is required'
      });
    }

    const result = await memorySystem.updateWorldState(novelId, updates);
    res.json(result);
  } catch (error) {
    console.error('World state update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Maintenance Routes
 */

// System cleanup
router.post('/cleanup', async (req, res) => {
  try {
    const options = req.body || {};
    const result = await memorySystem.cleanup(options);
    res.json(result);
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
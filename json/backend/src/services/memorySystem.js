import { neo4jService } from './neo4jService.js';
import { pineconeService } from './pineconeService.js';
import { redisService } from './redisService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Memory System Service
 * Orchestrates all database and storage services for the novel generation system
 * 
 * Architecture:
 * - Neo4j: Structured relationships (novel → chapters → characters → cities)
 * - Pinecone: Vector embeddings for semantic search
 * - Redis: Caching, state management, and queuing
 */
export class MemorySystem {
  constructor() {
    this.neo4j = neo4jService;
    this.pinecone = pineconeService;
    this.redis = redisService;
    this.isInitialized = false;
  }

  /**
   * Initialize all database connections
   */
  async initialize() {
    if (this.isInitialized) return true;

    console.log('🔄 Initializing Memory System...');

    try {
      // Initialize connections in parallel
      const [neo4jResult, pineconeResult, redisResult] = await Promise.allSettled([
        this.neo4j.connect(),
        this.pinecone.connect(),
        this.redis.connect()
      ]);

      // Log connection results
      if (neo4jResult.status === 'fulfilled' && neo4jResult.value) {
        console.log('✅ Neo4j Graph Database ready');
      } else {
        console.warn('⚠️ Neo4j not available:', neo4jResult.reason?.message);
      }

      if (pineconeResult.status === 'fulfilled' && pineconeResult.value) {
        console.log('✅ Pinecone Vector Database ready');
      } else {
        console.warn('⚠️ Pinecone not available:', pineconeResult.reason?.message);
      }

      if (redisResult.status === 'fulfilled' && redisResult.value) {
        console.log('✅ Redis Cache & Queue System ready');
      } else {
        console.warn('⚠️ Redis not available:', redisResult.reason?.message);
      }

      // Initialize queue processors
      await this.initializeQueueProcessors();

      this.isInitialized = true;
      console.log('🎉 Memory System initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Memory System initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize queue processors for background tasks
   */
  async initializeQueueProcessors() {
    // Chapter generation processor
    await this.redis.processQueue('novel-processing', 'generate-chapter', async (job) => {
      const { novelId, chapterData } = job.data;
      console.log(`Processing chapter generation for novel ${novelId}, chapter ${chapterData.number}`);
      
      try {
        // Store chapter in Neo4j
        await this.neo4j.createOrUpdateChapter(novelId, chapterData);
        
        // Store embeddings in Pinecone
        if (chapterData.content) {
          await this.pinecone.storeChapterContent(novelId, chapterData.number, chapterData);
        }
        
        // Cache in Redis
        await this.redis.cacheChapter(novelId, chapterData.number, chapterData);
        
        console.log(`✅ Chapter ${chapterData.number} processed for novel ${novelId}`);
        return { success: true, chapterNumber: chapterData.number };
      } catch (error) {
        console.error(`❌ Chapter processing failed:`, error);
        throw error;
      }
    });

    // Embedding update processor
    await this.redis.processQueue('embedding-processing', 'update-embeddings', async (job) => {
      const { novelId, contentType, contentId, data } = job.data;
      console.log(`Processing embedding update for ${contentType} ${contentId} in novel ${novelId}`);
      
      try {
        switch (contentType) {
          case 'character':
            await this.pinecone.storeCharacterInfo(novelId, data);
            await this.redis.cacheCharacter(novelId, contentId, data);
            break;
          case 'location':
            await this.pinecone.storeLocationInfo(novelId, data);
            await this.redis.cacheLocation(novelId, contentId, data);
            break;
          case 'chapter':
            await this.pinecone.storeChapterContent(novelId, data.number, data);
            await this.redis.cacheChapter(novelId, data.number, data);
            break;
        }
        
        console.log(`✅ Embeddings updated for ${contentType} ${contentId}`);
        return { success: true, contentType, contentId };
      } catch (error) {
        console.error(`❌ Embedding update failed:`, error);
        throw error;
      }
    });

    // World state update processor
    await this.redis.processQueue('world-state-processing', 'update-world-state', async (job) => {
      const { novelId, updates } = job.data;
      console.log(`Processing world state update for novel ${novelId}`);
      
      try {
        // Update in Neo4j
        await this.neo4j.updateWorldState(novelId, updates);
        
        // Update cache in Redis
        await this.redis.updateWorldState(novelId, updates);
        
        console.log(`✅ World state updated for novel ${novelId}`);
        return { success: true, novelId };
      } catch (error) {
        console.error(`❌ World state update failed:`, error);
        throw error;
      }
    });

    console.log('✅ Queue processors initialized');
  }

  /**
   * Novel Management Operations
   */
  async createNovel(novelData) {
    const novelId = novelData.id || uuidv4();
    const novel = { ...novelData, id: novelId };

    try {
      // Store in Neo4j
      const neo4jResult = await this.neo4j.createOrUpdateNovel(novel);
      
      // Initialize world state in Redis
      await this.redis.cacheWorldState(novelId, {
        title: novel.title,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastChapter: 0,
        totalChapters: 0,
        characters: [],
        locations: [],
        plotPoints: []
      });

      console.log(`✅ Novel created: ${novelId}`);
      return { success: true, novelId, data: neo4jResult };
    } catch (error) {
      console.error(`❌ Novel creation failed:`, error);
      throw error;
    }
  }

  async getNovel(novelId) {
    try {
      // Try cache first
      const cachedWorldState = await this.redis.getWorldState(novelId);
      
      // Get from Neo4j
      const novelContext = await this.neo4j.getNovelContext(novelId);
      
      return {
        success: true,
        data: {
          ...novelContext,
          worldState: cachedWorldState
        }
      };
    } catch (error) {
      console.error(`❌ Novel retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * Character Management Operations
   */
  async addCharacter(novelId, characterData) {
    const characterId = characterData.id || uuidv4();
    const character = { ...characterData, id: characterId };

    try {
      // Store in Neo4j
      await this.neo4j.createOrUpdateCharacter(novelId, character);
      
      // Queue embedding update
      await this.redis.queueEmbeddingUpdate(novelId, 'character', characterId, character);
      
      console.log(`✅ Character added: ${characterId} to novel ${novelId}`);
      return { success: true, characterId, data: character };
    } catch (error) {
      console.error(`❌ Character addition failed:`, error);
      throw error;
    }
  }

  async getCharacter(novelId, characterId) {
    try {
      // Try cache first
      const cached = await this.redis.getCachedCharacter(novelId, characterId);
      if (cached) {
        return { success: true, data: cached, source: 'cache' };
      }

      // Get from Neo4j
      const result = await this.neo4j.query(
        'MATCH (n:Novel {id: $novelId})-[:HAS_CHARACTER]->(c:Character {id: $characterId}) RETURN c',
        { novelId, characterId }
      );

      const character = result?.records?.[0]?.get('c')?.properties;
      if (character) {
        // Cache for future use
        await this.redis.cacheCharacter(novelId, characterId, character);
        return { success: true, data: character, source: 'database' };
      }

      return { success: false, error: 'Character not found' };
    } catch (error) {
      console.error(`❌ Character retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * Location Management Operations
   */
  async addLocation(novelId, locationData) {
    const locationId = locationData.id || uuidv4();
    const location = { ...locationData, id: locationId };

    try {
      // Store in Neo4j
      await this.neo4j.createOrUpdateLocation(novelId, location);
      
      // Queue embedding update
      await this.redis.queueEmbeddingUpdate(novelId, 'location', locationId, location);
      
      console.log(`✅ Location added: ${locationId} to novel ${novelId}`);
      return { success: true, locationId, data: location };
    } catch (error) {
      console.error(`❌ Location addition failed:`, error);
      throw error;
    }
  }

  async getLocation(novelId, locationId) {
    try {
      // Try cache first
      const cached = await this.redis.getCachedLocation(novelId, locationId);
      if (cached) {
        return { success: true, data: cached, source: 'cache' };
      }

      // Get from Neo4j
      const result = await this.neo4j.query(
        'MATCH (n:Novel {id: $novelId})-[:HAS_LOCATION]->(l:Location {id: $locationId}) RETURN l',
        { novelId, locationId }
      );

      const location = result?.records?.[0]?.get('l')?.properties;
      if (location) {
        // Cache for future use
        await this.redis.cacheLocation(novelId, locationId, location);
        return { success: true, data: location, source: 'database' };
      }

      return { success: false, error: 'Location not found' };
    } catch (error) {
      console.error(`❌ Location retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * Chapter Management Operations
   */
  async addChapter(novelId, chapterData) {
    try {
      // Queue chapter processing (async)
      await this.redis.queueChapterGeneration(novelId, chapterData);
      
      // Update world state
      const worldStateUpdates = {
        lastChapter: chapterData.number,
        totalChapters: Math.max(chapterData.number, (await this.redis.getWorldState(novelId))?.totalChapters || 0),
        lastUpdated: new Date().toISOString()
      };
      
      await this.redis.queueWorldStateUpdate(novelId, worldStateUpdates);
      
      console.log(`✅ Chapter ${chapterData.number} queued for processing in novel ${novelId}`);
      return { success: true, chapterNumber: chapterData.number, status: 'processing' };
    } catch (error) {
      console.error(`❌ Chapter addition failed:`, error);
      throw error;
    }
  }

  async getChapter(novelId, chapterNumber) {
    try {
      // Try cache first
      const cached = await this.redis.getCachedChapter(novelId, chapterNumber);
      if (cached) {
        return { success: true, data: cached, source: 'cache' };
      }

      // Get from Neo4j
      const result = await this.neo4j.query(
        'MATCH (n:Novel {id: $novelId})-[:HAS_CHAPTER]->(ch:Chapter {number: $chapterNumber}) RETURN ch',
        { novelId, chapterNumber }
      );

      const chapter = result?.records?.[0]?.get('ch')?.properties;
      if (chapter) {
        // Cache for future use
        await this.redis.cacheChapter(novelId, chapterNumber, chapter);
        return { success: true, data: chapter, source: 'database' };
      }

      return { success: false, error: 'Chapter not found' };
    } catch (error) {
      console.error(`❌ Chapter retrieval failed:`, error);
      throw error;
    }
  }

  async getChapterSequence(novelId, limit = 10) {
    try {
      const chapters = await this.neo4j.getChapterSequence(novelId, limit);
      return { success: true, data: chapters };
    } catch (error) {
      console.error(`❌ Chapter sequence retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * Search and Discovery Operations
   */
  async semanticSearch(novelId, query, options = {}) {
    try {
      const results = await this.pinecone.semanticSearch(query, novelId, options);
      return { success: true, data: results };
    } catch (error) {
      console.error(`❌ Semantic search failed:`, error);
      throw error;
    }
  }

  async findSimilarContent(novelId, referenceText, options = {}) {
    try {
      const results = await this.pinecone.findSimilarContent(novelId, referenceText, options);
      return { success: true, data: results };
    } catch (error) {
      console.error(`❌ Similar content search failed:`, error);
      throw error;
    }
  }

  async searchEntities(novelId, searchText, entityTypes = ['Character', 'Location']) {
    try {
      const results = await this.neo4j.searchEntities(novelId, searchText, entityTypes);
      return { success: true, data: results };
    } catch (error) {
      console.error(`❌ Entity search failed:`, error);
      throw error;
    }
  }

  /**
   * Context Building for Novel Generation
   */
  async buildGenerationContext(novelId, chapterNumber, focusElements = '') {
    try {
      console.log(`🔄 Building context for novel ${novelId}, chapter ${chapterNumber}`);

      // Get novel context from Neo4j
      const novelContext = await this.neo4j.getNovelContext(novelId, chapterNumber);
      
      // Get world state from Redis
      const worldState = await this.redis.getWorldState(novelId);
      
      // Get previous chapter from cache/database
      const previousChapter = chapterNumber > 1 
        ? await this.getChapter(novelId, chapterNumber - 1)
        : null;

      // Semantic search for relevant content
      const searchQuery = `${focusElements} chapter ${chapterNumber}`;
      const semanticResults = await this.pinecone.semanticSearch(searchQuery, novelId, {
        topK: 5,
        excludeChapter: chapterNumber
      });

      // Build comprehensive context
      const context = {
        novel: novelContext?.novel || {},
        characters: novelContext?.characters || [],
        locations: novelContext?.locations || [],
        worldState: worldState || {},
        previousChapter: previousChapter?.data || null,
        similarContent: semanticResults || [],
        focusElements,
        chapterNumber,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Context built for novel ${novelId}, chapter ${chapterNumber}`);
      return { success: true, data: context };
    } catch (error) {
      console.error(`❌ Context building failed:`, error);
      throw error;
    }
  }

  /**
   * World State Management
   */
  async updateWorldState(novelId, updates) {
    try {
      await this.redis.queueWorldStateUpdate(novelId, updates);
      return { success: true, status: 'queued' };
    } catch (error) {
      console.error(`❌ World state update failed:`, error);
      throw error;
    }
  }

  async getWorldState(novelId) {
    try {
      const worldState = await this.redis.getWorldState(novelId);
      return { success: true, data: worldState };
    } catch (error) {
      console.error(`❌ World state retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * System Health and Statistics
   */
  async getSystemHealth() {
    try {
      const [neo4jHealth, redisStats, pineconeStats] = await Promise.allSettled([
        this.neo4j.isConnected ? Promise.resolve({ connected: true }) : Promise.resolve({ connected: false }),
        this.redis.getStats(),
        this.pinecone.getNamespaceStats()
      ]);

      return {
        success: true,
        data: {
          neo4j: neo4jHealth.status === 'fulfilled' ? neo4jHealth.value : { connected: false },
          redis: redisStats.status === 'fulfilled' ? redisStats.value : { connected: false },
          pinecone: pineconeStats.status === 'fulfilled' ? pineconeStats.value : { connected: false },
          initialized: this.isInitialized,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ System health check failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup and Maintenance
   */
  async cleanup(options = {}) {
    const {
      cleanupTempData = true,
      cleanupOldChapters = false,
      maxAge = 86400 // 24 hours
    } = options;

    try {
      let cleanedItems = 0;

      if (cleanupTempData) {
        cleanedItems += await this.redis.cleanup('temp:*', maxAge);
      }

      if (cleanupOldChapters) {
        // Implement chapter cleanup logic if needed
      }

      console.log(`🧹 Cleanup completed: ${cleanedItems} items removed`);
      return { success: true, cleanedItems };
    } catch (error) {
      console.error(`❌ Cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Shutdown all connections
   */
  async shutdown() {
    console.log('🔄 Shutting down Memory System...');

    try {
      await Promise.allSettled([
        this.neo4j.close(),
        this.redis.close()
      ]);

      this.isInitialized = false;
      console.log('✅ Memory System shutdown complete');
    } catch (error) {
      console.error('❌ Memory System shutdown error:', error);
    }
  }
}

// Singleton instance
export const memorySystem = new MemorySystem();

// Graceful shutdown
process.on('SIGINT', async () => {
  await memorySystem.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await memorySystem.shutdown();
  process.exit(0);
});

export default MemorySystem;
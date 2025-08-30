import crypto from 'crypto';
import fetch from 'node-fetch';
import { dbService } from './database.js';

/**
 * Layanan API Inti & Orkestrasi (Otak Operasi Real-time)
 * Menangani permintaan masuk, mengorkestrasi seluruh proses generasi, dan memberikan respons
 */
export class NovelOrchestrator {
  constructor() {
    this.neo4jUri = process.env.NEO4J_URI;
    this.neo4jDatabase = process.env.NEO4J_DATABASE;
    this.graphqlEndpoint = process.env.GRAPHQL_ENDPOINT;
    this.embeddingService = process.env.EMBEDDING_SERVICE;
    this.pineconeUrl = process.env.PINECONE_URL;
    this.redisUrl = process.env.REDIS_URL;
    this.callbackSecret = process.env.CALLBACK_SECRET;
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    this.n8nGenerationUrl = process.env.N8N_GENERATION_URL;
    this.n8nUploadUrl = process.env.N8N_UPLOAD_URL;
  }

  /**
   * Validasi & Keamanan: Memvalidasi semua permintaan yang masuk
   */
  validateNovelGenerationRequest(body) {
    const requiredFields = ['novelId', 'chapterNumber', 'focusElements', 'stylePreference', 'mood'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Sanitize inputs
    const novelId = String(body.novelId).trim();
    const chapterNumber = parseInt(body.chapterNumber);
    const focusElements = String(body.focusElements).trim();
    const stylePreference = String(body.stylePreference).trim();
    const mood = String(body.mood).trim();
    const requestId = String(body.requestId || '').trim();
    const callbackUrl = String(body.callbackUrl || '').trim();

    // Validation
    if (isNaN(chapterNumber) || chapterNumber < 1) {
      throw new Error('chapterNumber must be a positive integer');
    }

    if (novelId.length < 3) {
      throw new Error('novelId must be at least 3 characters');
    }

    if (!callbackUrl) {
      throw new Error('callbackUrl is required from backend');
    }

    return {
      novelId,
      chapterNumber,
      focusElements,
      stylePreference,
      mood,
      requestId,
      callbackUrl,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validasi untuk novel upload request
   */
  validateNovelUploadRequest(body) {
    if (!body.novelId) {
      throw new Error('novelId is required');
    }

    if (!body.content && !body.fileUrl && !body.chunks) {
      throw new Error('Either content, fileUrl, or chunks must be provided');
    }

    return {
      novelId: String(body.novelId).trim(),
      content: body.content ? String(body.content) : null,
      fileUrl: body.fileUrl ? String(body.fileUrl).trim() : null,
      chunks: body.chunks || null,
      chunkingStrategy: body.chunkingStrategy || 'semantic',
      chunkSize: parseInt(body.chunkSize) || 1000,
      overlap: parseInt(body.overlap) || 200,
      metadata: body.metadata || {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Orkestrator Alur Kerja: Delegasi ke N8N workflow yang sudah ada
   */
  async orchestrateNovelGeneration(validatedInput) {
    const startTime = Date.now();
    console.log(`🚀 Starting novel generation orchestration for ${validatedInput.novelId}, Chapter ${validatedInput.chapterNumber}`);

    try {
      // Call N8N workflow directly - it handles all the orchestration steps
      // The N8N workflow (Naa.json) already implements:
      // 1. Input validation and sanitization
      // 2. Context fetching (Neo4j, GraphQL, Redis)
      // 3. Embedding generation and Pinecone query
      // 4. Context aggregation and prompt building
      // 5. Novel generation with AI model
      // 6. Quality evaluation
      // 7. Retry logic with iteration count
      // 8. Result saving and callback handling
      
      const result = await this.callN8nWorkflow('novel-generation', validatedInput);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Novel generation completed in ${processingTime}ms`);

      return {
        success: true,
        data: result,
        metadata: {
          processingTime,
          retryCount: result.iterationCount || 0,
          steps: 8,
          n8nProcessed: true,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Novel generation orchestration failed:', error);
      
      // Send error callback if provided
      if (validatedInput.callbackUrl) {
        await this.sendCallback(validatedInput.callbackUrl, {
          success: false,
          error: error.message,
          requestId: validatedInput.requestId,
          timestamp: new Date().toISOString()
        });
      }

      throw error;
    }
  }

  /**
   * Helper methods for database operations (used by callback handlers)
   */

  /**
   * Utility methods for prompt building and context management
   */
  buildGenerationPrompt(input, context) {
    // This is a simplified version - the actual prompt building is done in N8N
    return {
      novelId: input.novelId,
      chapterNumber: input.chapterNumber,
      focusElements: input.focusElements,
      stylePreference: input.stylePreference,
      mood: input.mood,
      context: context
    };
  }

  /**
   * Manajemen Callback dengan HMAC signature
   */
  async sendCallback(callbackUrl, data) {
    if (!callbackUrl || !this.callbackSecret) {
      console.warn('Callback URL or secret not configured');
      return;
    }

    try {
      const payload = JSON.stringify(data);
      const signature = crypto
        .createHmac('sha256', this.callbackSecret)
        .update(payload)
        .digest('hex');

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': `sha256=${signature}`,
          'X-Timestamp': Date.now().toString()
        },
        body: payload,
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Callback failed: ${response.statusText}`);
      }

      console.log('Callback sent successfully');
    } catch (error) {
      console.error('Callback sending failed:', error);
      // Don't throw - callback failure shouldn't fail the main process
    }
  }

  /**
   * Helper methods untuk database operations
   */
  async fetchGraphQLContext(novelId) {
    const query = `
      query GetNovelContext($novelId: ID!) {
        novel(id: $novelId) {
          title
          characters {
            id name traits motivations powers fears hiddenDesires
            origin { name description }
            affiliations { name type }
            trivia
          }
          world {
            powerSystem
            languages { name description }
            races { name characteristics }
            cultures { name traditions }
            cities { name geography }
            countries { name culture }
            geography { regions landmarks }
            monsters { name abilities }
            relationships { between description }
          }
        }
      }
    `;

    const response = await fetch(this.graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { novelId } }),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`GraphQL query failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchNeo4jContext(novelId, chapterNumber) {
    try {
      return await dbService.fetchNovelContext(novelId, chapterNumber);
    } catch (error) {
      console.error('Neo4j context fetch failed:', error);
      return null;
    }
  }

  async fetchRedisChapter(novelId, chapterNumber) {
    try {
      const key = `novel:${novelId}:chapter:${chapterNumber}`;
      return await dbService.getFromRedis(key);
    } catch (error) {
      console.error('Redis chapter fetch failed:', error);
      return null;
    }
  }

  async fetchRedisWorldState(novelId) {
    try {
      const key = `novel:${novelId}:state`;
      return await dbService.getFromRedis(key);
    } catch (error) {
      console.error('Redis world state fetch failed:', error);
      return null;
    }
  }

  async saveToRedis(key, data) {
    try {
      const success = await dbService.setToRedis(key, data, 86400); // 24 hours TTL
      if (success) {
        console.log(`✅ Saved to Redis: ${key}`);
      } else {
        console.warn(`⚠️ Failed to save to Redis: ${key}`);
      }
      return success;
    } catch (error) {
      console.error(`❌ Redis save error for ${key}:`, error);
      return false;
    }
  }

  async updateRedisWorldState(key, updates) {
    try {
      // Get current state
      const currentState = await dbService.getFromRedis(key) || {};
      
      // Merge updates
      const newState = {
        ...currentState,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      
      const success = await dbService.setToRedis(key, newState, 86400);
      if (success) {
        console.log(`✅ Updated world state: ${key}`);
      } else {
        console.warn(`⚠️ Failed to update world state: ${key}`);
      }
      return success;
    } catch (error) {
      console.error(`❌ World state update error for ${key}:`, error);
      return false;
    }
  }

  async callN8nWorkflow(endpoint, data) {
    let webhookUrl;
    
    // Determine the correct webhook URL based on endpoint
    if (endpoint === '/novel-generation' || endpoint === 'novel-generation') {
      webhookUrl = this.n8nGenerationUrl;
    } else if (endpoint === '/document-processing' || endpoint === 'document-processing' || endpoint === '/novel-upload' || endpoint === 'novel-upload') {
      webhookUrl = this.n8nUploadUrl;
    } else {
      // Fallback to base webhook URL
      webhookUrl = this.n8nWebhookUrl ? `${this.n8nWebhookUrl}${endpoint}` : null;
    }

    if (!webhookUrl) {
      throw new Error(`N8N webhook URL not configured for endpoint: ${endpoint}`);
    }

    console.log(`🔗 Calling N8N webhook: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Novel-Backend/1.0'
      },
      body: JSON.stringify(data),
      timeout: 120000 // 2 minutes for generation
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8N workflow failed (${response.status}): ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  buildGenerationPrompt(input, context) {
    // Build comprehensive prompt for novel generation
    let prompt = `Generate Chapter ${input.chapterNumber} for "${context.novel.title || 'Untitled Novel'}"\n\n`;
    
    prompt += `Focus Elements: ${input.focusElements}\n`;
    prompt += `Style Preference: ${input.stylePreference}\n`;
    prompt += `Mood: ${input.mood}\n\n`;

    if (context.characters.length > 0) {
      prompt += `Characters:\n${context.characters.map(c => `- ${c.name}: ${c.traits}`).join('\n')}\n\n`;
    }

    if (context.previousChapter) {
      prompt += `Previous Chapter Summary: ${context.previousChapter.summary || 'N/A'}\n\n`;
    }

    if (context.relevantContent.length > 0) {
      prompt += `Relevant Context:\n${context.relevantContent.map(c => c.content).join('\n')}\n\n`;
    }

    prompt += `Please generate the chapter content following the specified focus, style, and mood.`;

    return prompt;
  }
}

export default NovelOrchestrator;
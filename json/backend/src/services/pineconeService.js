import { Pinecone } from '@pinecone-database/pinecone';
import fetch from 'node-fetch';

/**
 * Pinecone Vector Database Service
 * Handles embeddings and semantic search for novel content
 */
export class PineconeService {
  constructor() {
    this.client = null;
    this.index = null;
    this.isConnected = false;
    this.embeddingService = process.env.EMBEDDING_SERVICE;
    this.embeddingModel = process.env.EMBEDDING_MODEL_NAME || 'multilingual-e5-large';
    this.embeddingDim = parseInt(process.env.EMBEDDING_DIM) || 1024;
  }

  /**
   * Initialize Pinecone connection
   */
  async connect() {
    if (this.isConnected) return this.client;

    try {
      const apiKey = process.env.PINECONE_API_KEY;
      const indexName = process.env.PINECONE_INDEX || 'novel-index';

      if (!apiKey) {
        console.warn('⚠️ Pinecone API key not configured');
        return null;
      }

      this.client = new Pinecone({
        apiKey: apiKey
      });

      // Get index
      this.index = this.client.index(indexName);
      this.isConnected = true;

      console.log('✅ Pinecone connected successfully');
      return this.client;
    } catch (error) {
      console.error('❌ Pinecone connection failed:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text, model = null) {
    if (!this.embeddingService) {
      console.warn('⚠️ Embedding service not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.embeddingService}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model: model || this.embeddingModel
        }),
        timeout: 15000
      });

      if (!response.ok) {
        throw new Error(`Embedding service error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response format');
      }

      return data.embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      return null;
    }
  }

  /**
   * Upsert vectors to Pinecone
   */
  async upsertVectors(vectors, namespace = 'default') {
    if (!this.index) {
      await this.connect();
      if (!this.index) return false;
    }

    try {
      const response = await this.index.namespace(namespace).upsert(vectors);
      console.log(`✅ Upserted ${vectors.length} vectors to namespace: ${namespace}`);
      return response;
    } catch (error) {
      console.error('Pinecone upsert error:', error);
      return false;
    }
  }

  /**
   * Query vectors from Pinecone
   */
  async queryVectors(queryVector, options = {}) {
    if (!this.index) {
      await this.connect();
      if (!this.index) return null;
    }

    const {
      topK = 10,
      namespace = 'default',
      includeMetadata = true,
      includeValues = false,
      filter = null
    } = options;

    try {
      const queryRequest = {
        vector: queryVector,
        topK,
        includeMetadata,
        includeValues
      };

      if (filter) {
        queryRequest.filter = filter;
      }

      const response = await this.index.namespace(namespace).query(queryRequest);
      return response;
    } catch (error) {
      console.error('Pinecone query error:', error);
      return null;
    }
  }

  /**
   * Semantic search for novel content
   */
  async semanticSearch(searchText, novelId, options = {}) {
    const {
      topK = 10,
      chapterNumber = null,
      contentType = null // 'character', 'location', 'chapter', etc.
    } = options;

    // Generate embedding for search text
    const queryEmbedding = await this.generateEmbedding(searchText);
    if (!queryEmbedding) {
      console.error('Failed to generate embedding for search text');
      return [];
    }

    // Build filter
    const filter = {
      novelId: { $eq: novelId }
    };

    if (chapterNumber) {
      filter.chapterNumber = { $eq: chapterNumber };
    }

    if (contentType) {
      filter.contentType = { $eq: contentType };
    }

    // Query Pinecone
    const namespace = `novel-${novelId}`;
    const results = await this.queryVectors(queryEmbedding, {
      topK,
      namespace,
      filter,
      includeMetadata: true
    });

    if (!results?.matches) {
      return [];
    }

    // Format results
    return results.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata,
      content: match.metadata?.content || '',
      contentType: match.metadata?.contentType || 'unknown',
      chapterNumber: match.metadata?.chapterNumber || null
    }));
  }

  /**
   * Store chapter content with embeddings
   */
  async storeChapterContent(novelId, chapterNumber, chapterData) {
    const namespace = `novel-${novelId}`;
    const vectors = [];

    // Split chapter into chunks for better semantic search
    const chunks = this.chunkText(chapterData.content, 500, 50);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      
      if (embedding) {
        vectors.push({
          id: `chapter-${chapterNumber}-chunk-${i}`,
          values: embedding,
          metadata: {
            novelId,
            chapterNumber,
            contentType: 'chapter',
            content: chunk,
            chunkIndex: i,
            title: chapterData.title || `Chapter ${chapterNumber}`,
            summary: chapterData.summary || '',
            mood: chapterData.mood || 'neutral',
            focusElements: chapterData.focusElements || '',
            createdAt: new Date().toISOString()
          }
        });
      }
    }

    // Store chapter summary as a separate vector
    if (chapterData.summary) {
      const summaryEmbedding = await this.generateEmbedding(chapterData.summary);
      if (summaryEmbedding) {
        vectors.push({
          id: `chapter-${chapterNumber}-summary`,
          values: summaryEmbedding,
          metadata: {
            novelId,
            chapterNumber,
            contentType: 'summary',
            content: chapterData.summary,
            title: chapterData.title || `Chapter ${chapterNumber}`,
            createdAt: new Date().toISOString()
          }
        });
      }
    }

    return await this.upsertVectors(vectors, namespace);
  }

  /**
   * Store character information with embeddings
   */
  async storeCharacterInfo(novelId, characterData) {
    const namespace = `novel-${novelId}`;
    const vectors = [];

    // Create comprehensive character description
    const characterDescription = [
      `Name: ${characterData.name}`,
      `Description: ${characterData.description || ''}`,
      `Traits: ${Array.isArray(characterData.traits) ? characterData.traits.join(', ') : ''}`,
      `Motivations: ${Array.isArray(characterData.motivations) ? characterData.motivations.join(', ') : ''}`,
      `Powers: ${Array.isArray(characterData.powers) ? characterData.powers.join(', ') : ''}`,
      `Fears: ${Array.isArray(characterData.fears) ? characterData.fears.join(', ') : ''}`,
      `Origin: ${characterData.origin?.description || ''}`,
      `Trivia: ${Array.isArray(characterData.trivia) ? characterData.trivia.join(', ') : ''}`
    ].filter(line => line.split(': ')[1]).join('\n');

    const embedding = await this.generateEmbedding(characterDescription);
    
    if (embedding) {
      vectors.push({
        id: `character-${characterData.id}`,
        values: embedding,
        metadata: {
          novelId,
          contentType: 'character',
          characterId: characterData.id,
          name: characterData.name,
          content: characterDescription,
          traits: characterData.traits || [],
          motivations: characterData.motivations || [],
          powers: characterData.powers || [],
          createdAt: new Date().toISOString()
        }
      });
    }

    return await this.upsertVectors(vectors, namespace);
  }

  /**
   * Store location information with embeddings
   */
  async storeLocationInfo(novelId, locationData) {
    const namespace = `novel-${novelId}`;
    const vectors = [];

    const locationDescription = [
      `Name: ${locationData.name}`,
      `Description: ${locationData.description || ''}`,
      `Geography: ${locationData.geography || ''}`,
      `Culture: ${locationData.culture || ''}`,
      `Type: ${locationData.type || 'location'}`
    ].filter(line => line.split(': ')[1]).join('\n');

    const embedding = await this.generateEmbedding(locationDescription);
    
    if (embedding) {
      vectors.push({
        id: `location-${locationData.id}`,
        values: embedding,
        metadata: {
          novelId,
          contentType: 'location',
          locationId: locationData.id,
          name: locationData.name,
          content: locationDescription,
          type: locationData.type || 'location',
          createdAt: new Date().toISOString()
        }
      });
    }

    return await this.upsertVectors(vectors, namespace);
  }

  /**
   * Find similar content across the novel
   */
  async findSimilarContent(novelId, referenceText, options = {}) {
    const {
      excludeChapter = null,
      contentTypes = ['chapter', 'character', 'location'],
      topK = 5
    } = options;

    const embedding = await this.generateEmbedding(referenceText);
    if (!embedding) return [];

    const filter = {
      novelId: { $eq: novelId },
      contentType: { $in: contentTypes }
    };

    if (excludeChapter) {
      filter.chapterNumber = { $ne: excludeChapter };
    }

    const namespace = `novel-${novelId}`;
    const results = await this.queryVectors(embedding, {
      topK,
      namespace,
      filter,
      includeMetadata: true
    });

    return results?.matches || [];
  }

  /**
   * Delete vectors by filter
   */
  async deleteVectors(filter, namespace = 'default') {
    if (!this.index) {
      await this.connect();
      if (!this.index) return false;
    }

    try {
      await this.index.namespace(namespace).deleteMany(filter);
      console.log(`✅ Deleted vectors from namespace: ${namespace}`);
      return true;
    } catch (error) {
      console.error('Pinecone delete error:', error);
      return false;
    }
  }

  /**
   * Chunk text into smaller pieces for better embeddings
   */
  chunkText(text, maxChunkSize = 500, overlap = 50) {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxChunkSize;
      
      // Try to break at sentence boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + maxChunkSize * 0.5) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats(namespace = 'default') {
    if (!this.index) {
      await this.connect();
      if (!this.index) return null;
    }

    try {
      const stats = await this.index.describeIndexStats();
      return stats.namespaces?.[namespace] || null;
    } catch (error) {
      console.error('Pinecone stats error:', error);
      return null;
    }
  }
}

// Singleton instance
export const pineconeService = new PineconeService();

export default PineconeService;
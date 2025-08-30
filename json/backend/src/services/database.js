import { createClient } from 'redis';
import fetch from 'node-fetch';
import { memorySystem } from './memorySystem.js';

/**
 * Legacy Database service untuk Redis dan Neo4j operations
 * @deprecated Use memorySystem instead for new implementations
 */
export class DatabaseService {
  constructor() {
    this.redisClient = null;
    this.neo4jUri = process.env.NEO4J_URI;
    this.neo4jDatabase = process.env.NEO4J_DATABASE;
    this.redisUrl = process.env.REDIS_URL;
  }

  /**
   * Initialize Redis connection
   */
  async initRedis() {
    if (!this.redisClient && this.redisUrl) {
      try {
        this.redisClient = createClient({
          url: this.redisUrl
        });
        
        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });
        
        await this.redisClient.connect();
        console.log('✅ Redis connected successfully');
      } catch (error) {
        console.error('❌ Redis connection failed:', error);
        this.redisClient = null;
      }
    }
    return this.redisClient;
  }

  /**
   * Redis operations
   */
  async getFromRedis(key) {
    try {
      await this.initRedis();
      if (!this.redisClient) return null;
      
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async setToRedis(key, value, ttlSeconds = 3600) {
    try {
      await this.initRedis();
      if (!this.redisClient) return false;
      
      await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async updateRedisHash(key, field, value) {
    try {
      await this.initRedis();
      if (!this.redisClient) return false;
      
      await this.redisClient.hSet(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async getRedisHash(key, field = null) {
    try {
      await this.initRedis();
      if (!this.redisClient) return null;
      
      if (field) {
        const value = await this.redisClient.hGet(key, field);
        return value ? JSON.parse(value) : null;
      } else {
        const hash = await this.redisClient.hGetAll(key);
        const result = {};
        for (const [k, v] of Object.entries(hash)) {
          try {
            result[k] = JSON.parse(v);
          } catch {
            result[k] = v;
          }
        }
        return result;
      }
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  /**
   * Neo4j operations
   */
  async queryNeo4j(cypher, parameters = {}) {
    if (!this.neo4jUri || !this.neo4jDatabase) {
      console.warn('Neo4j not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.neo4jUri}/db/${this.neo4jDatabase}/tx/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          statements: [{
            statement: cypher,
            parameters
          }]
        }),
        timeout: 20000
      });

      if (!response.ok) {
        throw new Error(`Neo4j query failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(`Neo4j errors: ${data.errors.map(e => e.message).join(', ')}`);
      }

      return data;
    } catch (error) {
      console.error('Neo4j query error:', error);
      return null;
    }
  }

  /**
   * Fetch novel context from Neo4j
   */
  async fetchNovelContext(novelId, chapterNumber) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      OPTIONAL MATCH (n)-[:HAS_CHARACTER]->(c:Character)
      OPTIONAL MATCH (n)-[:HAS_LOCATION]->(l:Location)
      OPTIONAL MATCH (n)-[:HAS_CHAPTER]->(ch:Chapter {number: $chapterNumber})
      OPTIONAL MATCH (n)-[:RELATED_TO]->(r)
      RETURN {
        novel: n,
        characters: collect(DISTINCT c)[0..10],
        locations: collect(DISTINCT l)[0..5],
        chapter: ch,
        related: collect(DISTINCT r)[0..5]
      } as context
    `;

    const result = await this.queryNeo4j(cypher, { novelId, chapterNumber });
    
    if (result?.results?.[0]?.data?.[0]?.row?.[0]) {
      return result.results[0].data[0].row[0];
    }

    return null;
  }

  /**
   * Save chapter to Neo4j
   */
  async saveChapterToNeo4j(novelId, chapterNumber, chapterData) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      MERGE (n)-[:HAS_CHAPTER]->(c:Chapter {number: $chapterNumber})
      SET c.title = $title,
          c.content = $content,
          c.summary = $summary,
          c.wordCount = $wordCount,
          c.createdAt = datetime(),
          c.updatedAt = datetime()
      RETURN c
    `;

    return await this.queryNeo4j(cypher, {
      novelId,
      chapterNumber,
      title: chapterData.title || `Chapter ${chapterNumber}`,
      content: chapterData.content,
      summary: chapterData.summary || '',
      wordCount: chapterData.content?.length || 0
    });
  }

  /**
   * Update world state in Neo4j
   */
  async updateWorldState(novelId, worldStateUpdates) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      OPTIONAL MATCH (n)-[:HAS_WORLD_STATE]->(ws:WorldState)
      WITH n, ws
      MERGE (n)-[:HAS_WORLD_STATE]->(newWs:WorldState)
      SET newWs += $updates,
          newWs.updatedAt = datetime()
      RETURN newWs
    `;

    return await this.queryNeo4j(cypher, {
      novelId,
      updates: worldStateUpdates
    });
  }

  /**
   * Close connections
   */
  async close() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        console.log('✅ Redis connection closed');
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error);
      }
    }
  }
}

// Singleton instance
export const dbService = new DatabaseService();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down database connections...');
  await dbService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down database connections...');
  await dbService.close();
  process.exit(0);
});

export default DatabaseService;
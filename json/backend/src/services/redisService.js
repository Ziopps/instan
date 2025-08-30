import Redis from 'ioredis';
import Bull from 'bull';

/**
 * Enhanced Redis Service
 * Handles caching, state management, and queue operations
 */
export class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.queues = new Map();
    this.isConnected = false;
    
    // Configuration
    this.config = {
      host: this.parseRedisUrl().host,
      port: this.parseRedisUrl().port,
      password: process.env.REDIS_PASSWORD || this.parseRedisUrl().password,
      username: process.env.REDIS_USERNAME || this.parseRedisUrl().username,
      db: parseInt(process.env.REDIS_DB) || 0,
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY_ON_FAILURE) || 100,
      enableOfflineQueue: true,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    };

    // Cache TTL settings
    this.ttl = {
      default: parseInt(process.env.MEMORY_CACHE_TTL) || 3600,
      worldState: parseInt(process.env.MEMORY_WORLD_STATE_TTL) || 86400,
      chapter: parseInt(process.env.MEMORY_CHAPTER_CACHE_TTL) || 7200,
      short: 300,
      long: 604800 // 1 week
    };
  }

  /**
   * Parse Redis URL
   */
  parseRedisUrl() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname || 'localhost',
        port: parseInt(url.port) || 6379,
        password: url.password || null,
        username: url.username || null
      };
    } catch (error) {
      console.warn('Invalid Redis URL, using defaults');
      return {
        host: 'localhost',
        port: 6379,
        password: null,
        username: null
      };
    }
  }

  /**
   * Initialize Redis connections
   */
  async connect() {
    if (this.isConnected) return this.client;

    try {
      // Main client
      this.client = new Redis(this.config);
      
      // Subscriber for pub/sub
      this.subscriber = new Redis(this.config);
      
      // Publisher for pub/sub
      this.publisher = new Redis(this.config);

      // Event handlers
      this.client.on('connect', () => {
        console.log('✅ Redis main client connected');
      });

      this.client.on('error', (error) => {
        console.error('❌ Redis main client error:', error);
      });

      this.subscriber.on('connect', () => {
        console.log('✅ Redis subscriber connected');
      });

      this.publisher.on('connect', () => {
        console.log('✅ Redis publisher connected');
      });

      // Test connection
      await this.client.ping();
      this.isConnected = true;

      console.log('✅ Redis service connected successfully');
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Basic cache operations
   */
  async get(key) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return null;

      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return false;

      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return false;

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return false;

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Hash operations for complex data structures
   */
  async hget(key, field) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return null;

      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hset(key, field, value, ttl = null) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return false;

      await this.client.hset(key, field, JSON.stringify(value));
      
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      
      return true;
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hgetall(key) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return {};

      const hash = await this.client.hgetall(key);
      const result = {};
      
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Redis HGETALL error for key ${key}:`, error);
      return {};
    }
  }

  /**
   * Novel-specific cache operations
   */
  async cacheChapter(novelId, chapterNumber, chapterData) {
    const key = `novel:${novelId}:chapter:${chapterNumber}`;
    return await this.set(key, chapterData, this.ttl.chapter);
  }

  async getCachedChapter(novelId, chapterNumber) {
    const key = `novel:${novelId}:chapter:${chapterNumber}`;
    return await this.get(key);
  }

  async cacheWorldState(novelId, worldState) {
    const key = `novel:${novelId}:worldstate`;
    return await this.set(key, worldState, this.ttl.worldState);
  }

  async getWorldState(novelId) {
    const key = `novel:${novelId}:worldstate`;
    return await this.get(key);
  }

  async updateWorldState(novelId, updates) {
    const key = `novel:${novelId}:worldstate`;
    const currentState = await this.get(key) || {};
    const newState = { ...currentState, ...updates, updatedAt: new Date().toISOString() };
    return await this.set(key, newState, this.ttl.worldState);
  }

  /**
   * Character and location caching
   */
  async cacheCharacter(novelId, characterId, characterData) {
    const key = `novel:${novelId}:character:${characterId}`;
    return await this.set(key, characterData, this.ttl.default);
  }

  async getCachedCharacter(novelId, characterId) {
    const key = `novel:${novelId}:character:${characterId}`;
    return await this.get(key);
  }

  async cacheLocation(novelId, locationId, locationData) {
    const key = `novel:${novelId}:location:${locationId}`;
    return await this.set(key, locationData, this.ttl.default);
  }

  async getCachedLocation(novelId, locationId) {
    const key = `novel:${novelId}:location:${locationId}`;
    return await this.get(key);
  }

  /**
   * Session and temporary data management
   */
  async setTemporary(key, value, ttl = 300) {
    return await this.set(`temp:${key}`, value, ttl);
  }

  async getTemporary(key) {
    return await this.get(`temp:${key}`);
  }

  async setSession(sessionId, data, ttl = 3600) {
    const key = `session:${sessionId}`;
    return await this.set(key, data, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  /**
   * Queue operations using Bull
   */
  async createQueue(queueName, options = {}) {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName);
    }

    const queueOptions = {
      redis: {
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS) || 3,
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.QUEUE_BACKOFF_DELAY) || 2000
        }
      },
      ...options
    };

    const queue = new Bull(queueName, queueOptions);
    this.queues.set(queueName, queue);

    // Error handling
    queue.on('error', (error) => {
      console.error(`Queue ${queueName} error:`, error);
    });

    queue.on('waiting', (jobId) => {
      console.log(`Job ${jobId} is waiting in queue ${queueName}`);
    });

    queue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed in queue ${queueName}`);
    });

    queue.on('failed', (job, error) => {
      console.error(`Job ${job.id} failed in queue ${queueName}:`, error);
    });

    return queue;
  }

  async addJob(queueName, jobType, data, options = {}) {
    const queue = await this.createQueue(queueName);
    return await queue.add(jobType, data, options);
  }

  async processQueue(queueName, jobType, processor, concurrency = null) {
    const queue = await this.createQueue(queueName);
    const processConcurrency = concurrency || parseInt(process.env.QUEUE_CONCURRENCY) || 5;
    
    queue.process(jobType, processConcurrency, processor);
    console.log(`✅ Processing queue ${queueName}:${jobType} with concurrency ${processConcurrency}`);
  }

  /**
   * Novel processing queues
   */
  async queueChapterGeneration(novelId, chapterData, priority = 0) {
    return await this.addJob('novel-processing', 'generate-chapter', {
      novelId,
      chapterData,
      timestamp: new Date().toISOString()
    }, {
      priority,
      delay: 0
    });
  }

  async queueEmbeddingUpdate(novelId, contentType, contentId, data) {
    return await this.addJob('embedding-processing', 'update-embeddings', {
      novelId,
      contentType,
      contentId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  async queueWorldStateUpdate(novelId, updates) {
    return await this.addJob('world-state-processing', 'update-world-state', {
      novelId,
      updates,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Pub/Sub operations
   */
  async publish(channel, message) {
    try {
      if (!this.publisher) await this.connect();
      if (!this.publisher) return false;

      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Redis PUBLISH error for channel ${channel}:`, error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.subscriber) await this.connect();
      if (!this.subscriber) return false;

      await this.subscriber.subscribe(channel);
      
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            console.error('Error parsing subscribed message:', error);
            callback(message);
          }
        }
      });

      return true;
    } catch (error) {
      console.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * Batch operations
   */
  async mget(keys) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return [];

      const values = await this.client.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Redis MGET error:', error);
      return [];
    }
  }

  async mset(keyValuePairs, ttl = null) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return false;

      const pipeline = this.client.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis MSET error:', error);
      return false;
    }
  }

  /**
   * Statistics and monitoring
   */
  async getStats() {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return null;

      const info = await this.client.info();
      const dbsize = await this.client.dbsize();
      
      return {
        connected: this.isConnected,
        dbsize,
        info: this.parseRedisInfo(info)
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return null;
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Cleanup and maintenance
   */
  async cleanup(pattern = 'temp:*', maxAge = 3600) {
    try {
      if (!this.client) await this.connect();
      if (!this.client) return 0;

      const keys = await this.client.keys(pattern);
      let deletedCount = 0;

      for (const key of keys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -1 || ttl > maxAge) {
          await this.client.del(key);
          deletedCount++;
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} expired keys`);
      return deletedCount;
    } catch (error) {
      console.error('Redis cleanup error:', error);
      return 0;
    }
  }

  /**
   * Close connections
   */
  async close() {
    try {
      // Close queues
      for (const [name, queue] of this.queues) {
        await queue.close();
        console.log(`✅ Queue ${name} closed`);
      }
      this.queues.clear();

      // Close Redis connections
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      
      if (this.publisher) {
        await this.publisher.quit();
        this.publisher = null;
      }

      this.isConnected = false;
      console.log('✅ Redis service closed');
    } catch (error) {
      console.error('❌ Error closing Redis connections:', error);
    }
  }
}

// Singleton instance
export const redisService = new RedisService();

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisService.close();
});

process.on('SIGTERM', async () => {
  await redisService.close();
});

export default RedisService;
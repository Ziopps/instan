import neo4j from 'neo4j-driver';

/**
 * Neo4j Graph Database Service
 * Handles structured relationships: novel → chapters → characters → cities
 */
export class Neo4jService {
  constructor() {
    this.driver = null;
    this.session = null;
    this.isConnected = false;
  }

  /**
   * Initialize Neo4j connection
   */
  async connect() {
    if (this.isConnected) return this.driver;

    try {
      const uri = process.env.NEO4J_URI;
      const username = process.env.NEO4J_USERNAME || 'neo4j';
      const password = process.env.NEO4J_PASSWORD;
      const database = process.env.NEO4J_DATABASE || 'neo4j';

      if (!uri || !password) {
        console.warn('⚠️ Neo4j credentials not configured');
        return null;
      }

      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
        maxConnectionPoolSize: parseInt(process.env.NEO4J_MAX_CONNECTION_POOLSIZE) || 50,
        connectionTimeout: parseInt(process.env.NEO4J_CONNECTION_TIMEOUT) || 30000,
        database: database
      });

      // Test connection
      await this.driver.verifyConnectivity();
      this.isConnected = true;
      
      console.log('✅ Neo4j connected successfully');
      
      // Initialize schema
      await this.initializeSchema();
      
      return this.driver;
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Get or create session
   */
  getSession() {
    if (!this.driver) return null;
    if (!this.session) {
      this.session = this.driver.session();
    }
    return this.session;
  }

  /**
   * Initialize database schema and constraints
   */
  async initializeSchema() {
    const session = this.getSession();
    if (!session) return;

    try {
      // Create constraints and indexes
      const constraints = [
        'CREATE CONSTRAINT novel_id IF NOT EXISTS FOR (n:Novel) REQUIRE n.id IS UNIQUE',
        'CREATE CONSTRAINT character_id IF NOT EXISTS FOR (c:Character) REQUIRE c.id IS UNIQUE',
        'CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE',
        'CREATE CONSTRAINT chapter_composite IF NOT EXISTS FOR (ch:Chapter) REQUIRE (ch.novelId, ch.number) IS UNIQUE',
        'CREATE INDEX novel_title IF NOT EXISTS FOR (n:Novel) ON (n.title)',
        'CREATE INDEX character_name IF NOT EXISTS FOR (c:Character) ON (c.name)',
        'CREATE INDEX location_name IF NOT EXISTS FOR (l:Location) ON (l.name)',
        'CREATE INDEX chapter_number IF NOT EXISTS FOR (ch:Chapter) ON (ch.number)'
      ];

      for (const constraint of constraints) {
        try {
          await session.run(constraint);
        } catch (error) {
          // Constraint might already exist, continue
          if (!error.message.includes('already exists')) {
            console.warn(`Schema warning: ${error.message}`);
          }
        }
      }

      console.log('✅ Neo4j schema initialized');
    } catch (error) {
      console.error('❌ Neo4j schema initialization failed:', error);
    }
  }

  /**
   * Execute Cypher query
   */
  async query(cypher, parameters = {}) {
    const session = this.getSession();
    if (!session) {
      console.warn('Neo4j session not available');
      return null;
    }

    try {
      const result = await session.run(cypher, parameters);
      return result;
    } catch (error) {
      console.error('Neo4j query error:', error);
      throw error;
    }
  }

  /**
   * Create or update novel
   */
  async createOrUpdateNovel(novelData) {
    const cypher = `
      MERGE (n:Novel {id: $id})
      SET n.title = $title,
          n.description = $description,
          n.genre = $genre,
          n.author = $author,
          n.status = $status,
          n.createdAt = CASE WHEN n.createdAt IS NULL THEN datetime() ELSE n.createdAt END,
          n.updatedAt = datetime()
      RETURN n
    `;

    const result = await this.query(cypher, {
      id: novelData.id,
      title: novelData.title,
      description: novelData.description || '',
      genre: novelData.genre || 'Fantasy',
      author: novelData.author || 'Unknown',
      status: novelData.status || 'active'
    });

    return result?.records?.[0]?.get('n')?.properties;
  }

  /**
   * Create or update character
   */
  async createOrUpdateCharacter(novelId, characterData) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      MERGE (c:Character {id: $characterId})
      SET c.name = $name,
          c.description = $description,
          c.traits = $traits,
          c.motivations = $motivations,
          c.powers = $powers,
          c.fears = $fears,
          c.hiddenDesires = $hiddenDesires,
          c.origin = $origin,
          c.affiliations = $affiliations,
          c.trivia = $trivia,
          c.updatedAt = datetime()
      MERGE (n)-[:HAS_CHARACTER]->(c)
      RETURN c
    `;

    const result = await this.query(cypher, {
      novelId,
      characterId: characterData.id,
      name: characterData.name,
      description: characterData.description || '',
      traits: characterData.traits || [],
      motivations: characterData.motivations || [],
      powers: characterData.powers || [],
      fears: characterData.fears || [],
      hiddenDesires: characterData.hiddenDesires || [],
      origin: characterData.origin || {},
      affiliations: characterData.affiliations || [],
      trivia: characterData.trivia || []
    });

    return result?.records?.[0]?.get('c')?.properties;
  }

  /**
   * Create or update location
   */
  async createOrUpdateLocation(novelId, locationData) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      MERGE (l:Location {id: $locationId})
      SET l.name = $name,
          l.description = $description,
          l.geography = $geography,
          l.culture = $culture,
          l.type = $type,
          l.updatedAt = datetime()
      MERGE (n)-[:HAS_LOCATION]->(l)
      RETURN l
    `;

    const result = await this.query(cypher, {
      novelId,
      locationId: locationData.id,
      name: locationData.name,
      description: locationData.description || '',
      geography: locationData.geography || '',
      culture: locationData.culture || '',
      type: locationData.type || 'city'
    });

    return result?.records?.[0]?.get('l')?.properties;
  }

  /**
   * Create or update chapter
   */
  async createOrUpdateChapter(novelId, chapterData) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      MERGE (ch:Chapter {novelId: $novelId, number: $number})
      SET ch.title = $title,
          ch.content = $content,
          ch.summary = $summary,
          ch.wordCount = $wordCount,
          ch.status = $status,
          ch.focusElements = $focusElements,
          ch.mood = $mood,
          ch.stylePreference = $stylePreference,
          ch.createdAt = CASE WHEN ch.createdAt IS NULL THEN datetime() ELSE ch.createdAt END,
          ch.updatedAt = datetime()
      MERGE (n)-[:HAS_CHAPTER]->(ch)
      RETURN ch
    `;

    const result = await this.query(cypher, {
      novelId,
      number: chapterData.number,
      title: chapterData.title || `Chapter ${chapterData.number}`,
      content: chapterData.content || '',
      summary: chapterData.summary || '',
      wordCount: chapterData.content?.length || 0,
      status: chapterData.status || 'draft',
      focusElements: chapterData.focusElements || '',
      mood: chapterData.mood || 'neutral',
      stylePreference: chapterData.stylePreference || 'default'
    });

    return result?.records?.[0]?.get('ch')?.properties;
  }

  /**
   * Create relationship between entities
   */
  async createRelationship(fromType, fromId, relationshipType, toType, toId, properties = {}) {
    const cypher = `
      MATCH (from:${fromType} {id: $fromId})
      MATCH (to:${toType} {id: $toId})
      MERGE (from)-[r:${relationshipType}]->(to)
      SET r += $properties,
          r.updatedAt = datetime()
      RETURN r
    `;

    const result = await this.query(cypher, {
      fromId,
      toId,
      properties
    });

    return result?.records?.[0]?.get('r')?.properties;
  }

  /**
   * Get novel context with all related entities
   */
  async getNovelContext(novelId, chapterNumber = null) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      OPTIONAL MATCH (n)-[:HAS_CHARACTER]->(c:Character)
      OPTIONAL MATCH (n)-[:HAS_LOCATION]->(l:Location)
      OPTIONAL MATCH (n)-[:HAS_CHAPTER]->(ch:Chapter)
      ${chapterNumber ? 'WHERE ch.number = $chapterNumber' : ''}
      OPTIONAL MATCH (n)-[:HAS_WORLD_STATE]->(ws:WorldState)
      RETURN {
        novel: n,
        characters: collect(DISTINCT c)[0..20],
        locations: collect(DISTINCT l)[0..10],
        chapters: collect(DISTINCT ch),
        worldState: ws
      } as context
    `;

    const result = await this.query(cypher, { 
      novelId, 
      ...(chapterNumber && { chapterNumber }) 
    });

    return result?.records?.[0]?.get('context');
  }

  /**
   * Get characters appearing in a specific chapter
   */
  async getChapterCharacters(novelId, chapterNumber) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})-[:HAS_CHAPTER]->(ch:Chapter {number: $chapterNumber})
      OPTIONAL MATCH (ch)-[:FEATURES]->(c:Character)
      RETURN collect(c) as characters
    `;

    const result = await this.query(cypher, { novelId, chapterNumber });
    return result?.records?.[0]?.get('characters') || [];
  }

  /**
   * Update world state
   */
  async updateWorldState(novelId, worldStateData) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})
      MERGE (n)-[:HAS_WORLD_STATE]->(ws:WorldState)
      SET ws += $worldState,
          ws.updatedAt = datetime()
      RETURN ws
    `;

    const result = await this.query(cypher, {
      novelId,
      worldState: worldStateData
    });

    return result?.records?.[0]?.get('ws')?.properties;
  }

  /**
   * Search entities by text
   */
  async searchEntities(novelId, searchText, entityTypes = ['Character', 'Location']) {
    const typeFilter = entityTypes.map(type => `e:${type}`).join(' OR ');
    
    const cypher = `
      MATCH (n:Novel {id: $novelId})-[]->(e)
      WHERE (${typeFilter})
        AND (toLower(e.name) CONTAINS toLower($searchText) 
             OR toLower(e.description) CONTAINS toLower($searchText))
      RETURN e, labels(e) as type
      LIMIT 20
    `;

    const result = await this.query(cypher, { novelId, searchText });
    return result?.records?.map(record => ({
      entity: record.get('e').properties,
      type: record.get('type')[0]
    })) || [];
  }

  /**
   * Get chapter sequence for a novel
   */
  async getChapterSequence(novelId, limit = 10) {
    const cypher = `
      MATCH (n:Novel {id: $novelId})-[:HAS_CHAPTER]->(ch:Chapter)
      RETURN ch
      ORDER BY ch.number ASC
      LIMIT $limit
    `;

    const result = await this.query(cypher, { novelId, limit });
    return result?.records?.map(record => record.get('ch').properties) || [];
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }
      if (this.driver) {
        await this.driver.close();
        this.driver = null;
      }
      this.isConnected = false;
      console.log('✅ Neo4j connection closed');
    } catch (error) {
      console.error('❌ Error closing Neo4j connection:', error);
    }
  }
}

// Singleton instance
export const neo4jService = new Neo4jService();

// Graceful shutdown
process.on('SIGINT', async () => {
  await neo4jService.close();
});

process.on('SIGTERM', async () => {
  await neo4jService.close();
});

export default Neo4jService;
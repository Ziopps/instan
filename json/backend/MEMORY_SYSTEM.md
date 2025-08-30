# Memory System Documentation

## Overview

The Memory System is a comprehensive database and storage solution for the novel generation backend. It orchestrates three different database technologies to provide optimal performance for different types of data and operations.

## Architecture

### 🗄️ Database Components

#### 1. Neo4j Graph Database
**Purpose**: Structured relationships and entity management
- **Use Cases**: 
  - Novel → Chapters → Characters → Cities relationships
  - Character interactions and affiliations
  - Location hierarchies and connections
  - Plot point dependencies
- **Benefits**: 
  - Complex relationship queries
  - Graph traversal for context building
  - ACID transactions
  - Flexible schema evolution

#### 2. Pinecone Vector Database
**Purpose**: Semantic search and similarity matching
- **Use Cases**:
  - Chapter content embeddings
  - Character description embeddings
  - Location description embeddings
  - Semantic search across novel content
  - Finding similar content for inspiration
- **Benefits**:
  - Fast vector similarity search
  - Scalable to millions of vectors
  - Real-time updates
  - Metadata filtering

#### 3. Redis Key-Value Store
**Purpose**: Caching, state management, and queuing
- **Use Cases**:
  - **Cache**: Frequently accessed data (chapters, characters, locations)
  - **State Management**: Global novel world state
  - **Queue**: Background processing tasks (embedding updates, chapter processing)
  - **Session Management**: Temporary data and user sessions
- **Benefits**:
  - Sub-millisecond response times
  - Pub/Sub messaging
  - Queue management with Bull
  - Automatic expiration (TTL)

## Installation & Setup

### 1. Install Dependencies

```bash
npm install neo4j-driver @pinecone-database/pinecone ioredis bull uuid joi
```

### 2. Environment Configuration

Update your `.env` file with the following variables:

```env
# Neo4j Graph Database
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
NEO4J_MAX_CONNECTION_POOLSIZE=50
NEO4J_CONNECTION_TIMEOUT=30000

# Pinecone Vector Database
PINECONE_API_KEY=your-api-key
PINECONE_INDEX=novel-index
PINECONE_URL=https://your-index.svc.region.pinecone.io

# Embedding Service
EMBEDDING_SERVICE=https://your-embedding-service/api
EMBEDDING_MODEL_NAME=multilingual-e5-large
EMBEDDING_DIM=1024

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password
REDIS_DB=0
REDIS_MAX_RETRIES=3

# Memory System Configuration
MEMORY_CACHE_TTL=3600
MEMORY_WORLD_STATE_TTL=86400
MEMORY_CHAPTER_CACHE_TTL=7200

# Queue System
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3
QUEUE_BACKOFF_DELAY=2000
```

### 3. Database Setup

#### Neo4j Setup
1. Create a Neo4j AuraDB instance or install Neo4j locally
2. Create a database and obtain connection credentials
3. The system will automatically create constraints and indexes on first run

#### Pinecone Setup
1. Create a Pinecone account and project
2. Create an index with dimension 1024 (or your embedding model's dimension)
3. Obtain your API key and index URL

#### Redis Setup
1. Install Redis locally or use a cloud service (Redis Cloud, AWS ElastiCache, etc.)
2. Configure connection details in environment variables

## API Endpoints

### System Management

#### Initialize Memory System
```http
POST /memory/initialize
```
Initializes all database connections and queue processors.

#### Health Check
```http
GET /memory/health
```
Returns the status of all database connections and system health.

### Novel Management

#### Create Novel
```http
POST /memory/novels
Content-Type: application/json

{
  "title": "My Fantasy Novel",
  "description": "An epic fantasy adventure",
  "genre": "Fantasy",
  "author": "Author Name",
  "status": "active"
}
```

#### Get Novel
```http
GET /memory/novels/{novelId}
```

### Character Management

#### Add Character
```http
POST /memory/novels/{novelId}/characters
Content-Type: application/json

{
  "name": "Hero Name",
  "description": "A brave warrior",
  "traits": ["brave", "loyal", "determined"],
  "motivations": ["save the kingdom", "protect loved ones"],
  "powers": ["sword mastery", "fire magic"],
  "fears": ["losing friends", "failure"],
  "origin": {
    "name": "Mountain Village",
    "description": "A small village in the mountains"
  }
}
```

#### Get Character
```http
GET /memory/novels/{novelId}/characters/{characterId}
```

### Location Management

#### Add Location
```http
POST /memory/novels/{novelId}/locations
Content-Type: application/json

{
  "name": "Capital City",
  "description": "The grand capital of the kingdom",
  "geography": "Built on seven hills beside a great river",
  "culture": "Diverse, cosmopolitan, center of trade",
  "type": "city"
}
```

#### Get Location
```http
GET /memory/novels/{novelId}/locations/{locationId}
```

### Chapter Management

#### Add Chapter
```http
POST /memory/novels/{novelId}/chapters
Content-Type: application/json

{
  "number": 1,
  "title": "The Beginning",
  "content": "Chapter content here...",
  "summary": "Chapter summary",
  "focusElements": "character development, world building",
  "mood": "adventurous",
  "stylePreference": "descriptive"
}
```

#### Get Chapter
```http
GET /memory/novels/{novelId}/chapters/{chapterNumber}
```

#### Get Chapter Sequence
```http
GET /memory/novels/{novelId}/chapters?limit=10
```

### Search & Discovery

#### Semantic Search
```http
POST /memory/novels/{novelId}/search/semantic
Content-Type: application/json

{
  "query": "brave warrior with fire magic",
  "options": {
    "topK": 5,
    "contentType": "character"
  }
}
```

#### Entity Search
```http
GET /memory/novels/{novelId}/search/entities?q=dragon&types=Character,Location
```

#### Find Similar Content
```http
POST /memory/novels/{novelId}/search/similar
Content-Type: application/json

{
  "text": "The hero faced the dragon in the ancient castle",
  "options": {
    "excludeChapter": 5,
    "topK": 3
  }
}
```

### Context Building

#### Build Generation Context
```http
POST /memory/novels/{novelId}/context/{chapterNumber}
Content-Type: application/json

{
  "focusElements": "character development, plot advancement"
}
```

### World State Management

#### Get World State
```http
GET /memory/novels/{novelId}/worldstate
```

#### Update World State
```http
PATCH /memory/novels/{novelId}/worldstate
Content-Type: application/json

{
  "currentLocation": "Capital City",
  "activeCharacters": ["hero-id", "mentor-id"],
  "plotStatus": "rising action",
  "timeOfDay": "evening"
}
```

## Usage Examples

### 1. Creating a Complete Novel Setup

```javascript
// 1. Create novel
const novel = await fetch('/memory/novels', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "The Dragon's Quest",
    description: "An epic fantasy adventure",
    genre: "Fantasy"
  })
});

const { novelId } = await novel.json();

// 2. Add main character
await fetch(`/memory/novels/${novelId}/characters`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Aria Stormwind",
    description: "A young mage with dragon blood",
    traits: ["brave", "curious", "impulsive"],
    powers: ["fire magic", "dragon speech"]
  })
});

// 3. Add location
await fetch(`/memory/novels/${novelId}/locations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Dragonspire Academy",
    description: "A magical academy built in an ancient tower",
    type: "building"
  })
});

// 4. Add first chapter
await fetch(`/memory/novels/${novelId}/chapters`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    number: 1,
    title: "The Awakening",
    content: "Aria discovered her powers on her sixteenth birthday...",
    focusElements: "character introduction, power discovery"
  })
});
```

### 2. Building Context for Chapter Generation

```javascript
// Build context for chapter 5
const context = await fetch(`/memory/novels/${novelId}/context/5`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    focusElements: "dragon encounter, character growth"
  })
});

const contextData = await context.json();
// Use contextData for AI novel generation
```

### 3. Semantic Search for Inspiration

```javascript
// Find similar content for inspiration
const similar = await fetch(`/memory/novels/${novelId}/search/semantic`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "magical battle with ancient dragon",
    options: { topK: 3, contentType: "chapter" }
  })
});

const results = await similar.json();
// Use results to inspire new chapter content
```

## Performance Considerations

### Caching Strategy
- **Hot Data**: Frequently accessed chapters and characters are cached in Redis
- **TTL Settings**: Different TTL for different data types
  - Chapters: 2 hours (7200s)
  - World State: 24 hours (86400s)
  - Characters/Locations: 1 hour (3600s)

### Queue Processing
- **Background Processing**: Heavy operations (embedding generation) run in background queues
- **Concurrency**: Configurable concurrent job processing
- **Retry Logic**: Automatic retry with exponential backoff

### Database Optimization
- **Neo4j**: Proper indexing on frequently queried fields
- **Pinecone**: Namespace separation per novel for better performance
- **Redis**: Pipeline operations for batch updates

## Monitoring & Maintenance

### Health Monitoring
```http
GET /memory/health
```
Returns detailed health information for all database connections.

### System Cleanup
```http
POST /memory/cleanup
Content-Type: application/json

{
  "cleanupTempData": true,
  "maxAge": 86400
}
```

### Queue Monitoring
Monitor queue status through Redis CLI or queue management tools.

## Error Handling

The Memory System implements comprehensive error handling:

1. **Connection Failures**: Graceful degradation when databases are unavailable
2. **Validation Errors**: Input validation with detailed error messages
3. **Retry Logic**: Automatic retry for transient failures
4. **Fallback Strategies**: Cache fallbacks when primary databases are down

## Security Considerations

1. **Input Validation**: All inputs are validated using Joi schemas
2. **SQL Injection Prevention**: Parameterized queries in Neo4j
3. **Access Control**: Environment-based configuration
4. **Data Encryption**: Use TLS for all database connections

## Troubleshooting

### Common Issues

1. **Connection Timeouts**: Check network connectivity and increase timeout values
2. **Memory Issues**: Monitor Redis memory usage and implement cleanup strategies
3. **Queue Backlog**: Monitor queue sizes and adjust concurrency settings
4. **Embedding Failures**: Check embedding service availability and API limits

### Debug Mode
Set `LOG_LEVEL=debug` in environment variables for detailed logging.

## Future Enhancements

1. **Distributed Caching**: Redis Cluster support for horizontal scaling
2. **Advanced Analytics**: Query performance monitoring and optimization
3. **Backup & Recovery**: Automated backup strategies for all databases
4. **Multi-tenancy**: Support for multiple isolated novel environments
5. **Real-time Updates**: WebSocket support for real-time data synchronization
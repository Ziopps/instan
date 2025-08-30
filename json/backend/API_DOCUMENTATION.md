# Novel Generation API Documentation

## Overview
Layanan API Inti & Orkestrasi (Otak Operasi Real-time) untuk sistem generasi novel menggunakan AI. API ini menangani permintaan masuk, mengorkestrasi seluruh proses generasi, dan memberikan respons dengan keamanan dan validasi yang komprehensif.

## Base URL
```
http://localhost:8081
```

## Authentication
API menggunakan HMAC signature untuk callback validation dan rate limiting untuk security.

## Endpoints

### 1. AI Model Service (Layanan Model AI - Para Pekerja Kreatif)

#### `POST /ai-models/generate`
Endpoint untuk generasi teks menggunakan berbagai model AI.

**Request Body:**
```json
{
  "prompt": "Generate a fantasy story about a young wizard...",
  "model": "openai",
  "options": {
    "temperature": 0.8,
    "maxTokens": 4000,
    "model": "gpt-4"
  },
  "requestId": "req-123"
}
```

**Required Fields:**
- `prompt` (string): Prompt untuk generasi teks (max 50,000 karakter)

**Optional Fields:**
- `model` (string): Provider model (openai, gemini, anthropic) - default: openai
- `options` (object): Opsi khusus model
- `requestId` (string): ID untuk tracking request

**Response (Success):**
```json
{
  "success": true,
  "message": "Text generated successfully",
  "data": {
    "generatedText": "Generated content...",
    "model": "gpt-4",
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 800,
      "total_tokens": 950
    },
    "finishReason": "stop",
    "wordCount": 650,
    "characterCount": 4200
  },
  "metadata": {
    "processingTime": 3500,
    "provider": "openai",
    "promptLength": 150
  },
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `POST /ai-models/evaluate`
Endpoint untuk evaluasi kualitas teks menggunakan AI.

**Request Body:**
```json
{
  "text": "Text to be evaluated...",
  "criteria": ["coherence", "creativity", "grammar", "style", "engagement"],
  "model": "openai",
  "requestId": "req-124"
}
```

**Required Fields:**
- `text` (string): Teks yang akan dievaluasi (max 20,000 karakter)

**Optional Fields:**
- `criteria` (array): Kriteria evaluasi - default: ["coherence", "creativity", "grammar", "style", "engagement"]
- `model` (string): Provider model - default: openai
- `requestId` (string): ID untuk tracking request

**Response (Success):**
```json
{
  "success": true,
  "message": "Text evaluation completed successfully",
  "data": {
    "evaluation": {
      "overallScore": 8.5,
      "scores": {
        "coherence": 9,
        "creativity": 8,
        "grammar": 9,
        "style": 8,
        "engagement": 8
      },
      "feedback": {
        "strengths": ["Strong narrative flow", "Engaging characters"],
        "improvements": ["Could use more descriptive language", "Pacing could be improved"],
        "summary": "Well-written piece with good character development"
      },
      "wordCount": 650,
      "readabilityLevel": "intermediate"
    },
    "textLength": 4200,
    "wordCount": 650
  },
  "metadata": {
    "processingTime": 2800,
    "provider": "openai",
    "criteriaUsed": ["coherence", "creativity", "grammar", "style", "engagement"],
    "evaluationTimestamp": "2024-01-15T10:30:00.000Z"
  },
  "requestId": "req-124",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `POST /ai-models/embed`
Endpoint untuk generasi embedding dari teks.

**Request Body:**
```json
{
  "text": "Text to embed...",
  "model": "custom",
  "requestId": "req-125"
}
```

**Request Body (Multiple texts):**
```json
{
  "text": ["Text 1 to embed...", "Text 2 to embed..."],
  "model": "openai",
  "requestId": "req-125"
}
```

**Required Fields:**
- `text` (string|array): Teks atau array teks untuk embedding (max 8,000 karakter per teks, max 100 teks)

**Optional Fields:**
- `model` (string): Provider model (openai, custom) - default: custom
- `requestId` (string): ID untuk tracking request

**Response (Success):**
```json
{
  "success": true,
  "message": "Embeddings generated successfully",
  "data": {
    "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
    "dimensions": 1024,
    "model": "multilingual-e5-large",
    "count": 2
  },
  "metadata": {
    "processingTime": 1200,
    "provider": "custom",
    "inputCount": 2,
    "totalCharacters": 150
  },
  "requestId": "req-125",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `GET /ai-models/models`
Endpoint untuk mendapatkan informasi model AI yang tersedia.

**Response:**
```json
{
  "success": true,
  "message": "Available models retrieved successfully",
  "data": {
    "models": {
      "generation": {
        "openai": {
          "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
          "capabilities": ["text-generation", "conversation", "creative-writing"],
          "maxTokens": 4096,
          "supportedLanguages": ["en", "id", "multiple"]
        },
        "gemini": {
          "models": ["gemini-1.5-pro", "gemini-1.5-flash"],
          "capabilities": ["text-generation", "multimodal", "long-context"],
          "maxTokens": 32768,
          "supportedLanguages": ["en", "id", "multiple"]
        }
      },
      "evaluation": {
        "openai": {
          "models": ["gpt-4", "gpt-3.5-turbo"],
          "capabilities": ["quality-assessment", "content-analysis"],
          "criteria": ["coherence", "creativity", "grammar", "style", "engagement"]
        }
      },
      "embedding": {
        "openai": {
          "models": ["text-embedding-3-large", "text-embedding-3-small"],
          "dimensions": [3072, 1536],
          "capabilities": ["semantic-search", "similarity"]
        },
        "custom": {
          "models": ["multilingual-e5-large"],
          "dimensions": [1024],
          "capabilities": ["multilingual", "semantic-search"]
        }
      }
    },
    "totalProviders": {
      "generation": 3,
      "evaluation": 1,
      "embedding": 2
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `POST /ai-models/batch-generate`
Endpoint untuk generasi batch multiple prompts.

**Request Body:**
```json
{
  "prompts": [
    "Generate story 1...",
    "Generate story 2...",
    "Generate story 3..."
  ],
  "model": "openai",
  "options": {
    "temperature": 0.8,
    "maxTokens": 2000
  },
  "requestId": "req-126"
}
```

**Required Fields:**
- `prompts` (array): Array prompts (max 10 prompts, max 10,000 karakter per prompt)

**Optional Fields:**
- `model` (string): Provider model - default: openai
- `options` (object): Opsi khusus model
- `requestId` (string): ID untuk tracking request

**Response (Success):**
```json
{
  "success": true,
  "message": "Batch generation completed: 3/3 successful",
  "data": {
    "results": [
      {
        "index": 0,
        "success": true,
        "content": "Generated story 1...",
        "usage": {...},
        "wordCount": 450
      },
      {
        "index": 1,
        "success": true,
        "content": "Generated story 2...",
        "usage": {...},
        "wordCount": 520
      }
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "totalWords": 1420
    }
  },
  "metadata": {
    "processingTime": 8500,
    "provider": "openai",
    "batchSize": 3
  },
  "requestId": "req-126",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `GET /ai-models/health`
Health check khusus untuk AI model services.

**Response:**
```json
{
  "service": "AI Model Service",
  "status": "healthy",
  "providers": {
    "openai": true,
    "gemini": true,
    "anthropic": false,
    "customEmbedding": true
  },
  "endpoints": [
    "POST /ai-models/generate",
    "POST /ai-models/evaluate",
    "POST /ai-models/embed",
    "GET /ai-models/models",
    "GET /ai-models/health"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Novel Generation

#### `POST /novel-generation`
Endpoint utama untuk membuat bab baru novel.

**Request Body:**
```json
{
  "novelId": "novel-1",
  "chapterNumber": 1,
  "focusElements": "character development, world building",
  "stylePreference": "character-driven",
  "mood": "adventurous",
  "requestId": "req-123",
  "callbackUrl": "https://your-backend.com/callback"
}
```

**Required Fields:**
- `novelId` (string): Identifier untuk novel (min 3 karakter)
- `chapterNumber` (integer): Nomor chapter yang akan digenerate (min 1)
- `focusElements` (string): Elemen yang ingin difokuskan
- `stylePreference` (string): Preferensi gaya penulisan
- `mood` (string): Mood/suasana yang diinginkan
- `callbackUrl` (string): URL untuk callback hasil

**Optional Fields:**
- `requestId` (string): ID untuk tracking request

**Response (Success):**
```json
{
  "success": true,
  "message": "Novel generation completed successfully",
  "data": {
    "chapterContent": "Generated chapter content...",
    "summary": "Chapter summary...",
    "wordCount": 2500,
    "qualityScore": 8.5
  },
  "metadata": {
    "processingTime": 45000,
    "retryCount": 0,
    "steps": 8
  },
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Missing required fields: novelId, chapterNumber",
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Novel Upload

#### `POST /novel-upload`
Endpoint untuk mengupload dan memproses dokumen novel untuk indexing.

**Request Body (Mode A - Pre-processed Chunks):**
```json
{
  "novelId": "novel-1",
  "chunks": [
    {
      "index": 0,
      "text": "Chapter content...",
      "metadata": {
        "chapter": 1,
        "title": "The Beginning"
      }
    }
  ],
  "metadata": {
    "author": "Author Name",
    "genre": "Fantasy"
  }
}
```

**Request Body (Mode B - Raw Content):**
```json
{
  "novelId": "novel-1",
  "content": "Full novel content text...",
  "chunkingStrategy": "semantic",
  "chunkSize": 1000,
  "overlap": 200,
  "metadata": {
    "author": "Author Name",
    "genre": "Fantasy"
  }
}
```

**Request Body (Mode C - File URL):**
```json
{
  "novelId": "novel-1",
  "fileUrl": "https://example.com/novel.txt",
  "chunkingStrategy": "paragraph",
  "chunkSize": 1500,
  "metadata": {
    "author": "Author Name",
    "genre": "Fantasy"
  }
}
```

**Chunking Strategies:**
- `semantic` (default): Chunking berdasarkan kalimat dengan overlap cerdas
- `paragraph`: Chunking berdasarkan paragraf
- `fixed_size`: Chunking dengan ukuran tetap

**Response (Success):**
```json
{
  "success": true,
  "message": "Novel upload processing initiated",
  "data": {
    "processingStats": {
      "originalLength": 50000,
      "chunksGenerated": 50,
      "averageChunkSize": 950,
      "strategy": "semantic",
      "successRate": 100,
      "totalVectorsCreated": 50
    },
    "vectorsUpserted": 50,
    "namespace": "novel-1"
  },
  "requestId": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Health Check

#### `GET /health`
Check status kesehatan API dan services.

**Response:**
```json
{
  "status": "ok",
  "services": [
    "Novel Generation API",
    "Upload Service",
    "Callback Handler"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `GET /novel-generation/health`
Health check khusus untuk novel generation service.

**Response:**
```json
{
  "service": "Novel Generation API",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "endpoints": [
    "POST /novel-generation",
    "POST /novel-upload",
    "GET /health"
  ]
}
```

## Security Features

### 1. Rate Limiting
- **Limit**: 10 requests per minute per IP
- **Window**: 60 seconds
- **Response**: HTTP 429 dengan `retryAfter` field

### 2. Input Sanitization
- XSS prevention
- Script tag removal
- JavaScript protocol blocking
- Automatic input trimming

### 3. HMAC Signature Validation
Untuk callback endpoints:
```
X-Signature: sha256=<hmac_signature>
X-Timestamp: <unix_timestamp>
```

### 4. CORS Support
Configurable via `ALLOWED_ORIGINS` environment variable.

## Workflow Orchestration

### Processing Steps:
1. **Input Validation**: Validasi dan sanitasi input
2. **Context Fetching**: Ambil konteks dari Neo4j, GraphQL, Redis
3. **Embedding Query**: Build query untuk semantic search
4. **Pinecone Query**: Cari konteks relevan via vector search
5. **Context Aggregation**: Gabungkan semua konteks
6. **Novel Generation**: Generate content via AI model
7. **Quality Evaluation**: Evaluasi kualitas hasil
8. **Retry Logic**: Retry jika diperlukan (max 3 attempts)
9. **Result Saving**: Simpan hasil ke database
10. **Callback**: Kirim hasil ke callback URL

### Error Handling:
- Comprehensive error logging
- Graceful degradation untuk service failures
- Automatic retry dengan exponential backoff
- Detailed error responses dengan context

## Environment Variables

```bash
# Server
PORT=8081
NODE_ENV=development
LOG_LEVEL=info

# Database & Services
GRAPHQL_ENDPOINT=https://your-graphql-endpoint
NEO4J_URI=https://your-neo4j-instance
NEO4J_DATABASE=your-database-name
REDIS_URL=redis://localhost:6379/0

# Embedding & Vector DB
EMBEDDING_SERVICE=https://embedding.service/api
EMBEDDING_MODEL_NAME=e5-large-v2
PINECONE_URL=https://your-pinecone-index
PINECONE_API_KEY=your-pinecone-api-key

# N8N Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook

# AI Model Providers (Layanan Model AI)
OPENAI_API_KEY=sk-your-openai-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# AI Model Configuration
AI_DEFAULT_GENERATION_MODEL=openai
AI_DEFAULT_EVALUATION_MODEL=openai
AI_DEFAULT_EMBEDDING_MODEL=custom
AI_MAX_TOKENS_GENERATION=4000
AI_MAX_TOKENS_EVALUATION=2000
AI_TEMPERATURE_GENERATION=0.8
AI_TEMPERATURE_EVALUATION=0.2

# Security
CALLBACK_SECRET=your-callback-secret
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input atau missing fields |
| 401 | Unauthorized - Invalid signature atau authentication |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server atau service failure |

## Usage Examples

### cURL Examples

**Novel Generation:**
```bash
curl -X POST http://localhost:8081/novel-generation \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "fantasy-novel-1",
    "chapterNumber": 1,
    "focusElements": "introduce main character, establish world",
    "stylePreference": "descriptive",
    "mood": "mysterious",
    "callbackUrl": "https://your-app.com/callback"
  }'
```

**Novel Upload:**
```bash
curl -X POST http://localhost:8081/novel-upload \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "fantasy-novel-1",
    "content": "In a world where magic flows like rivers...",
    "chunkingStrategy": "semantic",
    "chunkSize": 1000,
    "overlap": 200,
    "metadata": {
      "author": "John Doe",
      "genre": "Fantasy",
      "language": "en"
    }
  }'
```

**AI Text Generation:**
```bash
curl -X POST http://localhost:8081/ai-models/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a fantasy story about a young wizard discovering their powers",
    "model": "openai",
    "options": {
      "temperature": 0.8,
      "maxTokens": 2000,
      "model": "gpt-4"
    },
    "requestId": "gen-001"
  }'
```

**AI Text Evaluation:**
```bash
curl -X POST http://localhost:8081/ai-models/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The young wizard stood at the edge of the ancient forest, feeling the magic coursing through his veins for the first time.",
    "criteria": ["coherence", "creativity", "grammar", "style", "engagement"],
    "model": "openai",
    "requestId": "eval-001"
  }'
```

**AI Text Embedding:**
```bash
curl -X POST http://localhost:8081/ai-models/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The magical realm of Eldoria was filled with ancient mysteries and powerful artifacts.",
    "model": "custom",
    "requestId": "embed-001"
  }'
```

**Get Available AI Models:**
```bash
curl -X GET http://localhost:8081/ai-models/models \
  -H "Content-Type: application/json"
```

## Integration with N8N

API ini terintegrasi dengan N8N workflow yang ada (`Naa.json`) untuk:
- Novel generation processing
- Document processing dan embedding
- Quality evaluation
- Result caching

Pastikan N8N instance running dan `N8N_WEBHOOK_URL` dikonfigurasi dengan benar.

## Monitoring & Debugging

### Logging
- Request/response logging dengan Morgan
- Error logging dengan stack traces (development mode)
- Processing statistics untuk performance monitoring

### Metrics
- Processing time tracking
- Retry count monitoring
- Success/failure rates
- Database operation metrics

### Debugging
- Content preview dalam metadata
- Detailed error messages dengan context
- Trace ID propagation untuk request tracking
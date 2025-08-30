# Changelog - N8N Novel Generation Workflow

## 🔧 Perbaikan dan Penambahan Fitur

### ✅ Environment Variable untuk N8N Webhook URL

**Masalah yang Diselesaikan:**
- Environment variable untuk URL webhook n8n tidak tersedia dalam callback system

**Solusi yang Diterapkan:**
1. **Menambahkan Environment Variable `N8N_WEBHOOK_URL`**
   - Ditambahkan ke semua response callback (success, error, intervention)
   - Memungkinkan backend untuk mengetahui URL webhook n8n instance
   - Terintegrasi dengan sistem callback yang sudah ada

2. **Lokasi Perubahan:**
   - `Prepare Success Response`: Menambahkan `n8nWebhookUrl: $env.N8N_WEBHOOK_URL`
   - `Prepare Error Callback`: Menambahkan `n8nWebhookUrl: $env.N8N_WEBHOOK_URL`
   - `Prepare Intervention Alert`: Menambahkan `n8nWebhookUrl: $env.N8N_WEBHOOK_URL`

### 📄 Fitur Document Processing yang Diperluas

**Fitur Baru yang Ditambahkan:**

#### 1. **Document Processing Webhook** (`/document-processing`)
- Webhook baru khusus untuk pemrosesan dokumen
- Mendukung multiple input modes
- Authentication dengan headerAuth

#### 2. **Advanced Document Chunker**
Mendukung 3 strategi chunking:

**a. Fixed Size Chunking (`fixed_size`)**
- Memotong teks setiap N karakter
- Mendukung overlap antar chunk
- Metadata: `startPos`, `endPos`

**b. Paragraph-based Chunking (`paragraph`)**
- Memotong berdasarkan paragraf (`\n\n`)
- Menjaga kesatuan paragraf
- Metadata: `paragraphCount`

**c. Semantic Chunking (`semantic`) - Default**
- Memotong berdasarkan kalimat dengan overlap cerdas
- Menjaga kesatuan makna
- Metadata: `sentenceCount`, `hasOverlap`

#### 3. **Multi-Mode Input Support**

**Mode A: Pre-processed Chunks**
```json
{
  "novelId": "novel-1",
  "chunks": [
    {
      "index": 0,
      "text": "chunk content...",
      "metadata": {}
    }
  ]
}
```

**Mode B: Raw Content**
```json
{
  "novelId": "novel-1",
  "content": "raw text content...",
  "chunkingStrategy": "semantic",
  "chunkSize": 1000,
  "overlap": 200
}
```

**Mode C: File URL**
```json
{
  "novelId": "novel-1",
  "fileUrl": "https://example.com/document.txt",
  "chunkingStrategy": "paragraph",
  "chunkSize": 1500
}
```

#### 4. **Enhanced Vector Metadata**
Setiap vector yang disimpan ke Pinecone memiliki metadata lengkap:
- `novelId`, `namespace`, `chunkIndex`
- `sourceFile`, `sourceType`
- `chunkingStrategy`, `hasOverlap`
- `processingMode`, `uploadedAt`
- `contentPreview` (100 karakter pertama)

#### 5. **Comprehensive Error Handling**
- Error handling untuk setiap tahap processing
- Detailed error responses dengan context
- Fallback mechanisms untuk download failures

#### 6. **Processing Statistics**
Response mencakup statistik lengkap:
```json
{
  "processingStats": {
    "originalLength": 5000,
    "chunksGenerated": 5,
    "averageChunkSize": 950,
    "strategy": "semantic",
    "successRate": 100,
    "totalVectorsCreated": 5
  }
}
```

### 🔄 Workflow Architecture Update

**Node-node Baru:**
1. `Document Processing Webhook` - Entry point
2. `Validate Document Input` - Input validation dan mode detection
3. `Check Processing Mode` - Routing berdasarkan mode
4. `Download Document` - Download file dari URL
5. `Advanced Document Chunker` - Chunking engine
6. `Split Chunks for Processing` - Parallel processing preparation
7. `Generate Document Embeddings` - Embedding generation
8. `Prepare Document Vector` - Vector preparation dengan metadata
9. `Upsert Document Vector` - Pinecone storage
10. `Aggregate Document Results` - Result aggregation
11. `Respond Document Success/Error` - Response handling

### 🛠️ Environment Variables yang Diperlukan

Pastikan environment variables berikut tersedia:

```bash
# Existing variables
GRAPHQL_ENDPOINT=https://your-graphql-endpoint
EMBEDDING_SERVICE=https://your-embedding-service
PINECONE_URL=https://your-pinecone-index
NEO4J_URI=https://your-neo4j-instance
NEO4J_DATABASE=your-database-name
CALLBACK_SECRET=your-callback-secret
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# New variables
N8N_WEBHOOK_URL=https://your-n8n-instance.com
EMBEDDING_MODEL_NAME=e5-large-v2  # Optional, defaults to e5-large-v2
PINECONE_API_KEY=your-pinecone-api-key
```

### 📊 Usage Examples

#### Novel Generation (Existing)
```bash
curl -X POST https://your-n8n-instance.com/webhook/novel-generation \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "novel-1",
    "chapterNumber": 1,
    "focusElements": "character development",
    "stylePreference": "character-driven",
    "mood": "adventurous",
    "callbackUrl": "https://your-backend.com/callback"
  }'
```

#### Document Processing (New)
```bash
curl -X POST https://your-n8n-instance.com/webhook/document-processing \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "novel-1",
    "content": "Your document content here...",
    "chunkingStrategy": "semantic",
    "chunkSize": 1000,
    "overlap": 200,
    "metadata": {
      "author": "Author Name",
      "genre": "Fantasy"
    }
  }'
```

### 🚀 Benefits

1. **Flexibility**: Multiple chunking strategies untuk berbagai jenis konten
2. **Scalability**: Parallel processing untuk embedding generation
3. **Reliability**: Comprehensive error handling dan fallback mechanisms
4. **Observability**: Detailed statistics dan metadata untuk monitoring
5. **Integration**: Seamless integration dengan existing novel generation workflow
6. **Extensibility**: Easy to add new chunking strategies atau processing modes

### 🔍 Monitoring dan Debugging

- Semua responses mencakup `n8nWebhookUrl` untuk backend integration
- Processing statistics untuk performance monitoring
- Content preview dalam metadata untuk debugging
- Detailed error messages dengan context
- Trace ID propagation untuk request tracking

---

**Total Nodes Added**: 11 new nodes
**Total Connections Added**: 10 new connections
**Environment Variables Added**: 1 (`N8N_WEBHOOK_URL`)
**New Endpoints**: 1 (`/document-processing`)

---

## 🚀 Layanan API Inti & Orkestrasi (Backend Implementation)

### ✅ Implementasi Lengkap Backend API

**Fitur Utama yang Ditambahkan:**

#### 1. **Endpoint Publik Baru**
- **`POST /novel-generation`**: Endpoint utama untuk generasi bab novel
- **`POST /novel-upload`**: Endpoint untuk upload dan processing dokumen
- **`GET /health`**: Health check untuk semua services
- **`GET /novel-generation/health`**: Health check khusus novel generation

#### 2. **Layanan Orkestrasi Komprehensif** (`orchestrator.js`)
**Validasi & Keamanan:**
- Input validation dan sanitization untuk semua request
- Field validation dengan error messages yang jelas
- Security checks untuk novelId, chapterNumber, callbackUrl

**Orkestrator Alur Kerja 8-Step Process:**
1. **fetchContext**: Parallel fetching dari Neo4j, GraphQL, Redis
2. **buildEmbeddingQuery**: Build comprehensive embedding text
3. **queryPinecone**: Semantic search via vector database
4. **aggregateContext**: Merge semua konteks untuk prompt building
5. **generateAndEvaluate**: AI generation dengan retry logic
6. **handleRetryLogic**: Exponential backoff retry (max 3 attempts)
7. **saveResults**: Simpan ke Redis dan Neo4j
8. **sendCallback**: HMAC-signed callback dengan security

**Manajemen Callback dengan HMAC:**
- SHA256 signature validation
- Timestamp-based replay attack prevention
- Secure payload transmission
- Error handling untuk callback failures

#### 3. **Database Service Integration** (`database.js`)
**Redis Operations:**
- Connection pooling dengan auto-reconnect
- TTL-based caching (24 hours default)
- Hash operations untuk complex data
- Graceful error handling

**Neo4j Operations:**
- Cypher query execution dengan parameters
- Novel context fetching dengan relationships
- Chapter saving dengan metadata
- World state updates dengan versioning

#### 4. **Security Middleware Lengkap** (`security.js`)
**Rate Limiting:**
- In-memory rate limiter (10 req/min per IP)
- Sliding window implementation
- Configurable limits dan windows

**Input Sanitization:**
- XSS prevention dengan script tag removal
- JavaScript protocol blocking
- Recursive object sanitization
- Content-Type validation

**HMAC Signature Validation:**
- Crypto-safe signature comparison
- Timestamp validation (5-minute window)
- Replay attack prevention

**CORS & Request Logging:**
- Configurable CORS origins
- Comprehensive request/response logging
- Error handling dengan development/production modes

#### 5. **Comprehensive Error Handling**
- Graceful degradation untuk service failures
- Detailed error logging dengan context
- User-friendly error messages
- Development vs production error details

#### 6. **Testing Infrastructure** (`test_novel_api.js`)
**Test Coverage:**
- Health check endpoints
- Input validation testing
- Rate limiting verification
- Novel generation flow testing
- Novel upload processing testing
- Error scenario handling

### 🔧 Environment Variables Baru

```bash
# N8N Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook

# Database Connections
GRAPHQL_ENDPOINT=https://your-graphql-endpoint
NEO4J_URI=https://your-neo4j-instance
NEO4J_DATABASE=your-database-name

# Security Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

### 📊 API Endpoints Summary

| Method | Endpoint | Purpose | Security |
|--------|----------|---------|----------|
| POST | `/novel-generation` | Generate novel chapters | Rate limited, Input sanitized |
| POST | `/novel-upload` | Upload & process documents | Rate limited, Input sanitized |
| GET | `/health` | Overall system health | Public |
| GET | `/novel-generation/health` | Service-specific health | Public |

### 🛡️ Security Features

1. **Rate Limiting**: 10 requests/minute per IP
2. **Input Sanitization**: XSS prevention, script removal
3. **HMAC Callbacks**: SHA256 signed callbacks dengan timestamp
4. **CORS Protection**: Configurable origin whitelist
5. **Request Logging**: Comprehensive audit trail
6. **Error Handling**: Secure error responses

### 🔄 Integration Architecture

```
Frontend → Backend API → N8N Workflow → AI Services
    ↓           ↓              ↓            ↓
Database ← Redis Cache ← Processing ← Vector DB
```

**Data Flow:**
1. Request validation & sanitization
2. Context fetching (parallel dari multiple sources)
3. Embedding generation & vector search
4. Context aggregation & prompt building
5. N8N workflow orchestration
6. AI generation dengan quality evaluation
7. Result caching & database updates
8. Secure callback delivery

### 📈 Performance & Monitoring

**Metrics Tracked:**
- Processing time per request
- Retry counts dan success rates
- Database operation latencies
- Error rates by endpoint
- Rate limiting statistics

**Logging Features:**
- Request/response logging dengan Morgan
- Error stack traces (development mode)
- Database operation logging
- Security event logging

### 🚀 Usage Examples

**Novel Generation Request:**
```bash
curl -X POST http://localhost:8081/novel-generation \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "fantasy-novel-1",
    "chapterNumber": 1,
    "focusElements": "character introduction, world establishment",
    "stylePreference": "descriptive",
    "mood": "mysterious",
    "callbackUrl": "https://your-app.com/callback"
  }'
```

**Novel Upload Request:**
```bash
curl -X POST http://localhost:8081/novel-upload \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "fantasy-novel-1",
    "content": "Novel content here...",
    "chunkingStrategy": "semantic",
    "chunkSize": 1000,
    "overlap": 200
  }'
```

### 📚 Documentation

- **API Documentation**: `backend/API_DOCUMENTATION.md`
- **Test Suite**: `backend/test_novel_api.js`
- **Environment Setup**: `backend/.env.example`

---

**Backend Implementation Summary:**
- **New Files**: 6 (orchestrator.js, novelGeneration.js, security.js, database.js, API_DOCUMENTATION.md, README.md)
- **Updated Files**: 4 (index.js, routes/index.js, .env.example, package.json)
- **Test Suite**: test_novel_api.js dengan comprehensive test coverage
- **New Dependencies**: crypto (built-in), redis client integration
- **Security Features**: 6 comprehensive middleware layers
- **API Endpoints**: 4 new endpoints dengan full documentation

### 🎯 Integration Status

**✅ Completed:**
- Backend API implementation dengan security layers
- N8N webhook integration (novel-generation, novel-upload)
- Database service integration (Redis, Neo4j)
- Comprehensive error handling dan logging
- HMAC-signed callback system
- Rate limiting dan input sanitization
- Full test suite dan documentation

**🔗 N8N Webhook URLs Configured:**
- Novel Generation: `https://xzio.app.n8n.cloud/webhook-test/novel-generation`
- Document Upload: `https://xzio.app.n8n.cloud/webhook-test/novel-upload`

**📋 Ready for Production:**
- Environment variables configured
- Security middleware implemented
- Error handling comprehensive
- Monitoring dan logging ready
- API documentation complete

### 🚀 Next Steps

1. **Deploy Backend**: Deploy ke production environment
2. **Configure Environment**: Set production environment variables
3. **Test Integration**: Test end-to-end dengan N8N workflow
4. **Monitor Performance**: Setup monitoring dan alerting
5. **Frontend Integration**: Integrate dengan frontend application (future)
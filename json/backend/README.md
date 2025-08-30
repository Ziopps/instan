# Novel Generation Backend API

## Overview
Layanan API Inti & Orkestrasi (Otak Operasi Real-time) untuk sistem generasi novel menggunakan AI. Backend ini berfungsi sebagai gateway yang menangani permintaan masuk, melakukan validasi dan keamanan, kemudian mendelegasikan proses generasi ke N8N workflow yang sudah ada.

## Architecture

```
Frontend/Client → Backend API → N8N Workflow (Naa.json) → AI Services
                      ↓                ↓                      ↓
                 Security &      Context Fetching        Vector DB
                 Validation      (Neo4j, GraphQL,        (Pinecone)
                                 Redis)
```

## Features

### 🔒 Security & Validation
- **Rate Limiting**: 10 requests per minute per IP
- **Input Sanitization**: XSS prevention, script removal
- **HMAC Callbacks**: SHA256 signed callbacks dengan timestamp validation
- **CORS Protection**: Configurable origin whitelist
- **Request Logging**: Comprehensive audit trail

### 🚀 API Endpoints
- **`POST /novel-generation`**: Generate novel chapters
- **`POST /novel-upload`**: Upload and process documents for indexing
- **`GET /health`**: System health check
- **`GET /novel-generation/health`**: Service-specific health check

### 🔄 N8N Integration
Backend terintegrasi dengan N8N workflow (`Naa.json`) yang menangani:
1. Input validation dan sanitization
2. Context fetching dari Neo4j, GraphQL, Redis
3. Embedding generation dan Pinecone query
4. Context aggregation dan prompt building
5. Novel generation dengan AI model
6. Quality evaluation
7. Retry logic dengan iteration count
8. Result saving dan callback handling

## Quick Start

### 1. Environment Setup
Copy `.env.example` to `.env` dan konfigurasi:

```bash
# Server Configuration
PORT=8081
NODE_ENV=development

# N8N Integration (REQUIRED)
N8N_GENERATION_URL=https://xzio.app.n8n.cloud/webhook-test/novel-generation
N8N_UPLOAD_URL=https://xzio.app.n8n.cloud/webhook-test/novel-upload

# Database & Services
GRAPHQL_ENDPOINT=https://your-graphql-endpoint
NEO4J_URI=https://your-neo4j-instance
NEO4J_DATABASE=your-database-name
REDIS_URL=redis://localhost:6379/0

# Security
CALLBACK_SECRET=your-callback-secret
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
npm start
```

Server akan berjalan di `http://localhost:8081`

## API Usage

### Novel Generation
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

**Response:**
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
    "steps": 8,
    "n8nProcessed": true
  },
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Novel Upload
```bash
curl -X POST http://localhost:8081/novel-upload \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "fantasy-novel-1",
    "content": "Novel content to be indexed...",
    "chunkingStrategy": "semantic",
    "chunkSize": 1000,
    "overlap": 200,
    "metadata": {
      "author": "Author Name",
      "genre": "Fantasy"
    }
  }'
```

## Testing

Run the test suite:
```bash
node test_novel_api.js
```

Test coverage includes:
- Health check endpoints
- Input validation
- Rate limiting
- Novel generation flow
- Novel upload processing
- Error handling

## File Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── index.js              # Main router
│   │   ├── novelGeneration.js    # Novel generation endpoints
│   │   ├── upload.js             # Legacy upload routes
│   │   └── workflowCallback.js   # Callback handlers
│   ├── services/
│   │   ├── orchestrator.js       # Main orchestration logic
│   │   └── database.js           # Database service (Redis, Neo4j)
│   ├── middleware/
│   │   └── security.js           # Security middleware
│   └── index.js                  # Server entry point
├── test_novel_api.js             # Test suite
├── API_DOCUMENTATION.md          # Detailed API docs
├── README.md                     # This file
├── .env.example                  # Environment template
└── package.json                  # Dependencies
```

## Error Handling

Backend mengimplementasikan comprehensive error handling:

- **400 Bad Request**: Invalid input atau missing fields
- **401 Unauthorized**: Invalid signature atau authentication
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server atau service failure

Semua error responses include:
```json
{
  "success": false,
  "error": "Error message",
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Monitoring & Debugging

### Logging
- Request/response logging dengan Morgan
- Error logging dengan stack traces (development mode)
- Database operation logging
- Security event logging

### Metrics
- Processing time tracking
- Retry count monitoring
- Success/failure rates
- Rate limiting statistics

### Health Checks
```bash
# Overall system health
curl http://localhost:8081/health

# Novel generation service health
curl http://localhost:8081/novel-generation/health
```

## Integration with N8N

Backend berfungsi sebagai secure gateway ke N8N workflow:

1. **Request Validation**: Backend memvalidasi dan sanitasi input
2. **Security Layer**: Rate limiting, CORS, input sanitization
3. **N8N Delegation**: Forward request ke N8N workflow yang sesuai
4. **Response Handling**: Process dan format response dari N8N
5. **Error Management**: Handle errors dan provide user-friendly messages

### N8N Webhook URLs
- **Novel Generation**: `https://xzio.app.n8n.cloud/webhook-test/novel-generation`
- **Document Upload**: `https://xzio.app.n8n.cloud/webhook-test/novel-upload`

## Development

### Adding New Endpoints
1. Create route handler in `src/routes/`
2. Add validation logic in `orchestrator.js`
3. Update security middleware if needed
4. Add tests in `test_novel_api.js`
5. Update API documentation

### Database Operations
Database operations are handled by `database.js`:
- Redis operations untuk caching
- Neo4j operations untuk graph data
- Connection pooling dan error handling

### Security Considerations
- All inputs are sanitized untuk prevent XSS
- Rate limiting prevents abuse
- HMAC signatures untuk secure callbacks
- CORS configured untuk trusted origins only

## Troubleshooting

### Common Issues

**1. N8N Connection Failed**
- Check `N8N_GENERATION_URL` dan `N8N_UPLOAD_URL` in `.env`
- Verify N8N instance is running dan accessible
- Check network connectivity

**2. Rate Limit Exceeded**
- Default: 10 requests per minute per IP
- Wait for rate limit window to reset
- Consider implementing user-based rate limiting

**3. Database Connection Issues**
- Check Redis connection: `REDIS_URL`
- Verify Neo4j credentials: `NEO4J_URI`, `NEO4J_DATABASE`
- Check network connectivity to database services

**4. Callback Failures**
- Verify `CALLBACK_SECRET` is configured
- Check callback URL is accessible
- Ensure callback endpoint accepts HMAC signatures

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests untuk new functionality
4. Update documentation
5. Submit pull request

## License

This project is licensed under the MIT License.
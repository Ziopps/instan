# Novel Embedding Upload System

## Overview

Sistem ini telah diperbarui untuk mendukung upload dan embedding dokumen novel secara otomatis. Backend akan melakukan chunking menggunakan tiktoken, kemudian n8n akan memproses embedding dan menyimpan ke Pinecone.

## Architecture

```
File Upload → Backend (Chunking) → n8n Webhook → Embedding Service → Pinecone
```

### Components

1. **Backend Services**:
   - `chunker.js`: Token-based chunking menggunakan tiktoken
   - `embeddingUpsert.js`: Service untuk embedding dan Pinecone upsert (tidak digunakan lagi)
   - `loader.js`: File extraction (txt, md, pdf)
   - `upload.js`: Route handler untuk file upload

2. **n8n Workflow**:
   - Webhook `/novel-upload` dengan 3 mode:
     - Mode A: Direct Cypher queries
     - Mode B: Embedding upload (chunks dari backend)
     - Mode C: Structured upload (Neo4j)

## Usage

### 1. File Upload via Backend

```bash
curl -X POST http://localhost:8081/upload \
  -F "file=@novel.txt" \
  -F "novelId=novel-1" \
  -F "namespace=novel-novel-1" \
  -F "chunkSize=800" \
  -F "chunkOverlap=200" \
  -F "metadataJson={\"author\":\"John Doe\",\"genre\":\"fantasy\"}"
```

**Backend Process**:
1. File diterima dan disimpan
2. Text diekstrak menggunakan `loader.js`
3. Text di-chunk menggunakan `chunkByTiktoken`
4. Payload dikirim ke n8n webhook

### 2. n8n Webhook Processing

**Endpoint**: `POST /webhook/novel-upload`

**Payload dari Backend**:
```json
{
  "novelId": "novel-1",
  "namespace": "novel-novel-1",
  "chunks": [
    {
      "index": 0,
      "text": "Chapter 1 content...",
      "length": 245
    }
  ],
  "metadata": {
    "novelId": "novel-1",
    "sourceFile": "novel.txt",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "author": "John Doe",
    "genre": "fantasy"
  },
  "source": {
    "fileName": "novel.txt",
    "size": 12345,
    "mimeType": "text/plain"
  }
}
```

**n8n Flow**:
1. `Validate Upload Payload` - Deteksi mode embedding
2. `Check Upload Mode` - Route ke embedding flow
3. `Prepare Chunks for Embedding` - Siapkan chunks untuk processing
4. `Split Chunks` - Split chunks menjadi individual items
5. `Generate Embeddings` - Call embedding service untuk setiap chunk
6. `Prepare Pinecone Vector` - Format vector untuk Pinecone
7. `Upsert to Pinecone` - Upload ke Pinecone
8. `Aggregate Embedding Results` - Kumpulkan hasil dan buat response

### 3. Response Format

**Success Response**:
```json
{
  "status": "success",
  "mode": "embedding",
  "data": {
    "novelId": "novel-1",
    "namespace": "novel-novel-1",
    "totalChunks": 5,
    "successfulUpserts": 5,
    "failedUpserts": 0,
    "upsertedVectors": [
      {
        "chunkIndex": 0,
        "vectorId": "novel-1-chunk-0",
        "upsertedCount": 1
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "processingTime": 1500
  }
}
```

**Error Response**:
```json
{
  "status": "error",
  "message": "Embedding upload failed",
  "mode": "embedding",
  "data": {
    "novelId": "novel-1",
    "namespace": "novel-novel-1",
    "totalChunks": 5
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": {
    "type": "EmbeddingError",
    "details": "Connection timeout"
  }
}
```

## Environment Variables

### Backend (.env)
```env
# Server
PORT=8081
NODE_ENV=development

# Storage
UPLOAD_DIR=./uploads
UPLOAD_MAX_FILE_SIZE_MB=25

# Embedding / Vector DB
EMBEDDING_SERVICE=https://embedding.service/api
EMBEDDING_MODEL_NAME=e5-large-v2
EMBEDDING_DIM=1024
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_URL=https://your-index.svc.region.pinecone.io
PINECONE_INDEX=novel-index
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_NAMESPACE=default

# n8n integration
N8N_UPLOAD_URL=http://localhost:5678/webhook/novel-upload
N8N_TOKEN=optional-bearer-token
```

### n8n Environment Variables
```env
EMBEDDING_SERVICE=https://embedding.service/api
EMBEDDING_MODEL_NAME=e5-large-v2
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_URL=https://your-index.svc.region.pinecone.io
```

## Testing

### 1. Test Backend Upload
```bash
# Upload a text file
curl -X POST http://localhost:8081/upload \
  -F "file=@test.txt" \
  -F "novelId=test-novel" \
  -F "namespace=test-namespace"
```

### 2. Test n8n Webhook Directly
```bash
curl -X POST http://localhost:5678/webhook/novel-upload \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "test-novel",
    "namespace": "test-namespace",
    "chunks": [
      {
        "index": 0,
        "text": "This is a test chunk",
        "length": 19
      }
    ],
    "metadata": {
      "sourceFile": "test.txt"
    },
    "source": {
      "fileName": "test.txt"
    }
  }'
```

## Troubleshooting

### Common Issues

1. **Embedding Service Timeout**
   - Check EMBEDDING_SERVICE URL
   - Increase timeout in n8n node (default: 15s)

2. **Pinecone API Errors**
   - Verify PINECONE_API_KEY
   - Check PINECONE_URL format
   - Ensure index exists and is active

3. **Chunking Issues**
   - Adjust chunkSize and chunkOverlap parameters
   - Check tiktoken encoding compatibility

4. **File Upload Errors**
   - Verify file size limits (default: 25MB)
   - Check supported file types: .txt, .md, .pdf

### Monitoring

- Check n8n execution logs for detailed error information
- Monitor backend logs for file processing issues
- Verify Pinecone dashboard for successful upserts

## Performance Considerations

1. **Chunking**: Default 800 tokens with 200 overlap works well for most novels
2. **Embedding**: Process chunks sequentially to avoid rate limits
3. **Pinecone**: Batch upserts when possible (currently 1 vector per request)
4. **File Size**: Large files (>10MB) may take several minutes to process

## Future Improvements

1. **Batch Processing**: Group multiple chunks for embedding API calls
2. **Async Processing**: Use background jobs for large files
3. **Progress Tracking**: Real-time upload progress updates
4. **Retry Logic**: Automatic retry for failed embeddings
5. **Caching**: Cache embeddings for duplicate content
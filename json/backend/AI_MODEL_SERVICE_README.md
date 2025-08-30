# AI Model Service - Layanan Model AI (Para Pekerja Kreatif)

## Overview
AI Model Service adalah komponen backend yang menyediakan akses terpusat ke berbagai model AI untuk generasi teks, evaluasi kualitas, dan embedding. Service ini mendukung multiple AI providers dan menyediakan API yang konsisten untuk semua operasi AI.

## Features

### 🤖 Multiple AI Providers
- **OpenAI**: GPT-4, GPT-4-turbo, GPT-3.5-turbo
- **Google Gemini**: Gemini-1.5-pro, Gemini-1.5-flash  
- **Anthropic Claude**: Claude-3-opus, Claude-3-sonnet, Claude-3-haiku
- **Custom Embedding**: Multilingual-e5-large

### 📝 Text Generation
- Creative writing dan storytelling
- Multiple model options dengan different capabilities
- Configurable parameters (temperature, max tokens, etc.)
- Batch generation support

### 🔍 Text Evaluation
- Quality assessment dengan multiple criteria
- Coherence, creativity, grammar, style, engagement scoring
- Structured feedback dengan strengths dan improvements
- Customizable evaluation criteria

### 🧮 Text Embedding
- Semantic search capabilities
- Multiple embedding models
- Batch embedding support
- Integration dengan vector databases

### 🛡️ Enterprise Features
- Comprehensive error handling
- Automatic retry logic
- Rate limiting protection
- Request/response logging
- Performance monitoring

## Quick Start

### 1. Installation
```bash
cd backend
npm install
```

### 2. Configuration
Copy `.env.example` to `.env` dan configure:

```bash
# AI Model Providers
OPENAI_API_KEY=sk-your-openai-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Embedding Service
EMBEDDING_SERVICE=https://your-embedding-service.com/api
EMBEDDING_MODEL_NAME=multilingual-e5-large
```

### 3. Start Service
```bash
npm start
```

Service akan running di `http://localhost:8081`

### 4. Health Check
```bash
curl http://localhost:8081/ai-models/health
```

## API Endpoints

### Text Generation
```bash
POST /ai-models/generate
```

**Example:**
```bash
curl -X POST http://localhost:8081/ai-models/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a fantasy story about a young wizard",
    "model": "openai",
    "options": {
      "temperature": 0.8,
      "maxTokens": 2000,
      "model": "gpt-4"
    }
  }'
```

### Text Evaluation
```bash
POST /ai-models/evaluate
```

**Example:**
```bash
curl -X POST http://localhost:8081/ai-models/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The young wizard discovered his magical powers...",
    "criteria": ["coherence", "creativity", "grammar", "style", "engagement"],
    "model": "openai"
  }'
```

### Text Embedding
```bash
POST /ai-models/embed
```

**Example:**
```bash
curl -X POST http://localhost:8081/ai-models/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The magical realm was filled with mysteries",
    "model": "custom"
  }'
```

### Available Models
```bash
GET /ai-models/models
```

### Batch Generation
```bash
POST /ai-models/batch-generate
```

**Example:**
```bash
curl -X POST http://localhost:8081/ai-models/batch-generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": [
      "Describe a magical forest",
      "Write about a dragon",
      "Create a wizard dialogue"
    ],
    "model": "openai"
  }'
```

## Configuration Options

### AI Model Configuration
```bash
# Default models
AI_DEFAULT_GENERATION_MODEL=openai
AI_DEFAULT_EVALUATION_MODEL=openai
AI_DEFAULT_EMBEDDING_MODEL=custom

# Default parameters
AI_MAX_TOKENS_GENERATION=4000
AI_MAX_TOKENS_EVALUATION=2000
AI_TEMPERATURE_GENERATION=0.8
AI_TEMPERATURE_EVALUATION=0.2
```

### Provider-Specific Options

#### OpenAI
```javascript
{
  "model": "openai",
  "options": {
    "model": "gpt-4",           // gpt-4, gpt-4-turbo, gpt-3.5-turbo
    "temperature": 0.8,         // 0.0 - 2.0
    "maxTokens": 4000,         // Max output tokens
    "topP": 1,                 // 0.0 - 1.0
    "frequencyPenalty": 0,     // -2.0 - 2.0
    "presencePenalty": 0       // -2.0 - 2.0
  }
}
```

#### Google Gemini
```javascript
{
  "model": "gemini",
  "options": {
    "model": "gemini-1.5-pro", // gemini-1.5-pro, gemini-1.5-flash
    "temperature": 0.8,        // 0.0 - 1.0
    "maxTokens": 4000,        // Max output tokens
    "topK": 40,               // Top-K sampling
    "topP": 0.95              // Top-P sampling
  }
}
```

#### Anthropic Claude
```javascript
{
  "model": "anthropic",
  "options": {
    "model": "claude-3-sonnet-20240229", // claude-3-opus, claude-3-sonnet, claude-3-haiku
    "temperature": 0.8,                  // 0.0 - 1.0
    "maxTokens": 4000                   // Max output tokens
  }
}
```

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "error": "Error description",
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Types
- **400 Bad Request**: Invalid input atau missing fields
- **401 Unauthorized**: Invalid API keys
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Provider atau service failure

### Retry Logic
Service automatically retries failed requests dengan exponential backoff:
- Max 3 attempts
- Initial delay: 1 second
- Exponential backoff: 2x multiplier

## Performance Monitoring

### Metrics Tracked
- Request/response times
- Success/failure rates
- Token usage per provider
- Error rates by type
- Provider availability

### Logging
```javascript
// Request logging
console.log('AI Generation Request:', {
  model: 'openai',
  promptLength: 150,
  requestId: 'req-123'
});

// Response logging
console.log('AI Generation Response:', {
  success: true,
  wordCount: 650,
  processingTime: 3500,
  provider: 'openai'
});
```

## Integration Examples

### Novel Generation Workflow
```javascript
// 1. Generate chapter content
const generationResponse = await fetch('/ai-models/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: buildNovelPrompt(context),
    model: 'openai',
    options: { temperature: 0.8, maxTokens: 4000 }
  })
});

// 2. Evaluate generated content
const evaluationResponse = await fetch('/ai-models/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: generationResponse.data.generatedText,
    criteria: ['coherence', 'creativity', 'grammar'],
    model: 'openai'
  })
});

// 3. Generate embeddings for storage
const embeddingResponse = await fetch('/ai-models/embed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: generationResponse.data.generatedText,
    model: 'custom'
  })
});
```

### N8N Integration
See `N8N_INTEGRATION_GUIDE.md` untuk detailed integration steps.

## Testing

### Run Tests
```bash
# Test AI Model Service
npm run test:ai

# Test specific endpoints
curl http://localhost:8081/ai-models/health
curl http://localhost:8081/ai-models/models
```

### Test Coverage
- ✅ Text generation dengan multiple providers
- ✅ Text evaluation dengan custom criteria
- ✅ Text embedding dengan different models
- ✅ Batch processing
- ✅ Error handling dan retry logic
- ✅ Rate limiting
- ✅ Input validation

## Security

### API Key Management
- Store API keys dalam environment variables
- Never commit API keys ke version control
- Use different keys untuk development dan production
- Rotate keys regularly

### Input Validation
- Sanitize semua input parameters
- Validate prompt lengths dan content
- Check for malicious content
- Rate limiting per IP address

### Network Security
- Use HTTPS untuk production
- Implement proper CORS policies
- Secure internal communications
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

#### 1. API Key Errors
```bash
# Check if API keys are configured
curl http://localhost:8081/ai-models/health

# Response will show provider status
{
  "providers": {
    "openai": true,
    "gemini": false,
    "anthropic": false
  }
}
```

#### 2. Rate Limiting
```json
{
  "success": false,
  "error": "Rate limit exceeded for provider: openai",
  "retryAfter": 60
}
```

**Solution**: Wait atau switch ke different provider.

#### 3. Provider Timeouts
```json
{
  "success": false,
  "error": "Request timeout: Provider took too long to respond"
}
```

**Solution**: Check provider status atau increase timeout values.

#### 4. Invalid Responses
```json
{
  "success": false,
  "error": "Invalid response format from provider"
}
```

**Solution**: Check provider API changes atau update service code.

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## Contributing

### Development Setup
```bash
git clone <repository>
cd backend
npm install
cp .env.example .env
# Configure environment variables
npm run dev
```

### Code Style
- Use ESLint untuk code formatting
- Follow existing naming conventions
- Add comprehensive error handling
- Include unit tests untuk new features

### Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:ai
npm run test:memory
```

## Roadmap

### Planned Features
- [ ] Support untuk additional AI providers (Cohere, AI21)
- [ ] Advanced caching mechanisms
- [ ] Real-time streaming responses
- [ ] Custom model fine-tuning support
- [ ] Advanced analytics dashboard
- [ ] Multi-language support enhancement

### Performance Improvements
- [ ] Connection pooling untuk providers
- [ ] Response caching
- [ ] Load balancing across providers
- [ ] Async processing queues

## Support

### Documentation
- API Documentation: `API_DOCUMENTATION.md`
- N8N Integration: `N8N_INTEGRATION_GUIDE.md`
- Memory System: `MEMORY_SYSTEM.md`

### Getting Help
1. Check health endpoints untuk service status
2. Review logs untuk error details
3. Test individual endpoints dengan curl
4. Check provider status pages
5. Review configuration settings

### Contact
For technical support atau feature requests, please create an issue dalam repository.
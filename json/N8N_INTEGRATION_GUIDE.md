# N8N Integration Guide - AI Model Service

## Overview
Panduan ini menjelaskan cara mengintegrasikan AI Model Service backend dengan N8N workflow yang sudah ada (`Naa.json`). Integrasi ini akan menggantikan panggilan langsung ke OpenAI dengan panggilan ke backend service yang mendukung multiple AI providers.

## Benefits of Integration

### 1. Centralized AI Management
- Semua panggilan AI melalui satu service
- Consistent error handling dan retry logic
- Centralized logging dan monitoring
- Easier configuration management

### 2. Multiple AI Provider Support
- OpenAI (GPT-4, GPT-3.5-turbo)
- Google Gemini (Gemini-1.5-pro, Gemini-1.5-flash)
- Anthropic Claude (Claude-3-opus, Claude-3-sonnet)
- Custom embedding services

### 3. Enhanced Features
- Batch processing capabilities
- Advanced evaluation criteria
- Better error recovery
- Performance monitoring

## Migration Steps

### Step 1: Backend Deployment
Pastikan AI Model Service backend sudah running:

```bash
cd backend
npm install
npm start
```

Verify service health:
```bash
curl http://localhost:8081/ai-models/health
```

### Step 2: Environment Variables
Tambahkan environment variables berikut ke N8N instance:

```bash
# Backend Service
BACKEND_URL=http://localhost:8081

# Timeouts
AI_GENERATION_TIMEOUT=60000
AI_EVALUATION_TIMEOUT=30000
AI_EMBEDDING_TIMEOUT=20000

# AI Provider Keys (optional - bisa dikonfigurasi di backend)
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Step 3: Node Replacements

#### Replace Novel Generation Model Node
**Old Node (Direct OpenAI):**
```json
{
  "name": "Novel Generation Model",
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "parameters": {
    "options": {
      "maxTokens": 4000,
      "temperature": 0.8
    }
  }
}
```

**New Node (AI Model Service):**
```json
{
  "name": "AI Model Generation",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.BACKEND_URL }}/ai-models/generate",
    "requestFormat": "json",
    "jsonParameters": "{\n  \"prompt\": \"{{ $json.prompt }}\",\n  \"model\": \"openai\",\n  \"options\": {\n    \"temperature\": 0.8,\n    \"maxTokens\": 4000,\n    \"model\": \"gpt-4\"\n  },\n  \"requestId\": \"{{ $runId }}\"\n}",
    "options": {
      "timeout": 60000
    }
  }
}
```

#### Replace QA Evaluation Model Node
**Old Node (Direct OpenAI):**
```json
{
  "name": "QA Evaluation Model",
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "parameters": {
    "options": {
      "maxTokens": 2000,
      "temperature": 0.2
    }
  }
}
```

**New Node (AI Model Service):**
```json
{
  "name": "AI Model Evaluation",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.BACKEND_URL }}/ai-models/evaluate",
    "requestFormat": "json",
    "jsonParameters": "{\n  \"text\": \"{{ $json.generatedText }}\",\n  \"criteria\": [\"coherence\", \"creativity\", \"grammar\", \"style\", \"engagement\"],\n  \"model\": \"openai\",\n  \"requestId\": \"{{ $runId }}\"\n}",
    "options": {
      "timeout": 30000
    }
  }
}
```

#### Replace Embedding Service Node
**Old Node (Direct Embedding Service):**
```json
{
  "name": "E5-large-v2 Embedding Query",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.EMBEDDING_SERVICE }}/embed"
  }
}
```

**New Node (AI Model Service):**
```json
{
  "name": "AI Model Embedding",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.BACKEND_URL }}/ai-models/embed",
    "requestFormat": "json",
    "jsonParameters": "{\n  \"text\": \"{{ $json.text }}\",\n  \"model\": \"custom\",\n  \"requestId\": \"{{ $runId }}\"\n}",
    "options": {
      "timeout": 20000
    }
  }
}
```

### Step 4: Update Processing Nodes

#### Update Prompt Preparation
Modify the "Prepare Generation Prompt" node to format data for AI Model Service:

```javascript
// Prepare prompt for AI Model Generation Service
const inputData = $input.all()[0].json;

// Build comprehensive prompt (existing logic)
const prompt = buildNovelPrompt(inputData);

return [{
  json: {
    prompt,
    model: 'openai',
    temperature: 0.8,
    maxTokens: 4000,
    modelName: 'gpt-4',
    requestId: `gen-${inputData.novelId}-ch${inputData.chapterNumber}-${Date.now()}`,
    ...inputData
  }
}];
```

#### Update Response Processing
Modify response processing nodes to handle AI Model Service responses:

```javascript
// Process AI Model Generation Response
const generationResponse = $('AI Model Generation').first().json;

if (!generationResponse.success) {
  throw new Error(`AI Generation failed: ${generationResponse.error}`);
}

const generatedContent = generationResponse.data.generatedText;
const usage = generationResponse.data.usage;
const wordCount = generationResponse.data.wordCount;

return [{
  json: {
    generatedChapter: generatedContent,
    wordCount,
    usage,
    processingTime: generationResponse.metadata.processingTime,
    ...inputData
  }
}];
```

### Step 5: Error Handling Updates

Add enhanced error handling for AI Model Service:

```javascript
// Enhanced Error Handling
const response = $('AI Model Generation').first().json;

if (!response.success) {
  // Log error details
  console.error('AI Generation failed:', response.error);
  
  // Check if it's a rate limit error
  if (response.error.includes('rate limit')) {
    // Wait and retry logic
    throw new Error('Rate limit exceeded - will retry');
  }
  
  // Check if it's a provider error
  if (response.error.includes('provider')) {
    // Try fallback provider
    return [{
      json: {
        ...inputData,
        retryWithProvider: 'gemini'
      }
    }];
  }
  
  throw new Error(`Generation failed: ${response.error}`);
}
```

## Testing Integration

### 1. Unit Tests
Test individual AI Model Service endpoints:

```bash
# Test generation
curl -X POST http://localhost:8081/ai-models/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test prompt", "model": "openai"}'

# Test evaluation  
curl -X POST http://localhost:8081/ai-models/evaluate \
  -H "Content-Type: application/json" \
  -d '{"text": "Test text", "criteria": ["coherence"]}'

# Test embedding
curl -X POST http://localhost:8081/ai-models/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Test text", "model": "custom"}'
```

### 2. Integration Tests
Test N8N workflow dengan AI Model Service:

```bash
# Run backend tests
cd backend
npm run test:ai

# Test N8N workflow
curl -X POST https://your-n8n-instance.com/webhook-test/novel-generation \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "test-novel",
    "chapterNumber": 1,
    "focusElements": "character introduction",
    "stylePreference": "descriptive",
    "mood": "mysterious",
    "callbackUrl": "https://your-callback-url.com"
  }'
```

### 3. Performance Tests
Monitor performance metrics:

- Response times untuk setiap AI provider
- Success rates dan error rates
- Token usage dan costs
- Memory dan CPU usage

## Monitoring & Debugging

### 1. Logging
AI Model Service menyediakan comprehensive logging:

```javascript
// Check logs untuk debugging
console.log('AI Model Service Response:', response);
console.log('Processing Time:', response.metadata.processingTime);
console.log('Provider Used:', response.metadata.provider);
```

### 2. Health Checks
Monitor service health:

```bash
# Check overall health
curl http://localhost:8081/health

# Check AI Model Service health
curl http://localhost:8081/ai-models/health

# Check available models
curl http://localhost:8081/ai-models/models
```

### 3. Error Tracking
Track common errors:

- Provider API failures
- Rate limiting issues
- Network timeouts
- Invalid responses

## Advanced Features

### 1. Provider Switching
Switch between AI providers based on requirements:

```javascript
// Dynamic provider selection
const provider = inputData.requiresLongContext ? 'gemini' : 'openai';
const model = provider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4';

return [{
  json: {
    prompt: inputData.prompt,
    model: provider,
    options: {
      model: model,
      temperature: 0.8
    }
  }
}];
```

### 2. Batch Processing
Use batch generation untuk multiple prompts:

```javascript
// Batch generation
const prompts = [
  "Generate character description...",
  "Generate location description...", 
  "Generate plot summary..."
];

return [{
  json: {
    prompts,
    model: 'openai',
    options: {
      temperature: 0.7,
      maxTokens: 1000
    }
  }
}];
```

### 3. Custom Evaluation Criteria
Define custom evaluation criteria:

```javascript
// Custom evaluation criteria
const criteria = [
  'character_consistency',
  'world_building_accuracy',
  'plot_advancement',
  'dialogue_quality',
  'pacing',
  'emotional_impact'
];

return [{
  json: {
    text: generatedText,
    criteria,
    model: 'openai'
  }
}];
```

## Rollback Plan

Jika terjadi masalah, rollback ke konfigurasi lama:

1. **Backup Original Workflow**: Simpan `Naa.json` original
2. **Revert Nodes**: Kembalikan ke OpenAI nodes langsung
3. **Remove Environment Variables**: Hapus BACKEND_URL variables
4. **Test Original Workflow**: Pastikan workflow lama masih berfungsi

## Best Practices

### 1. Configuration Management
- Use environment variables untuk semua configurations
- Separate development dan production settings
- Document semua required variables

### 2. Error Handling
- Implement comprehensive error handling
- Use fallback providers when possible
- Log errors untuk debugging

### 3. Performance Optimization
- Monitor response times
- Use appropriate timeouts
- Implement caching where beneficial

### 4. Security
- Secure API keys dengan proper environment management
- Use HTTPS untuk semua communications
- Implement rate limiting

## Conclusion

Integrasi AI Model Service dengan N8N workflow memberikan:

- **Flexibility**: Support multiple AI providers
- **Reliability**: Better error handling dan retry logic
- **Scalability**: Centralized service management
- **Monitoring**: Enhanced logging dan metrics
- **Cost Optimization**: Better provider selection

Ikuti panduan ini step-by-step untuk migration yang smooth dan testing yang comprehensive.
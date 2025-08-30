import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import routes from './routes/index.js';
import { 
  rateLimiter, 
  sanitizeInput, 
  validateContentType, 
  requestLogger, 
  errorHandler, 
  corsHandler 
} from './middleware/security.js';
import { memorySystem } from './services/memorySystem.js';

const app = express();

// Security & Validation Middleware
app.use(corsHandler);
app.use(requestLogger);
app.use(rateLimiter);
app.use(express.json({ limit: '2mb' }));
app.use(validateContentType);
app.use(sanitizeInput);
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));

// Routes
app.use('/', routes);

// Error handling
app.use(errorHandler);

const port = process.env.PORT || 8081;

// Initialize memory system and start server
async function startServer() {
  try {
    // Initialize memory system
    console.log('🔄 Initializing Memory System...');
    await memorySystem.initialize();
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 Novel Generation Backend listening on :${port}`);
      console.log(`📚 Services: Novel Generation API, AI Model Service, Memory System, Upload Service, Callback Handler`);
      console.log(`🤖 AI Models: OpenAI, Gemini, Anthropic (Generation, Evaluation, Embedding)`);
      console.log(`🗄️ Databases: Neo4j (Graph), Pinecone (Vector), Redis (Cache/Queue)`);
      console.log(`🔒 Security: Rate limiting, Input sanitization, CORS enabled`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📖 Memory System API available at: http://localhost:${port}/memory`);
      console.log(`🤖 AI Model Service API available at: http://localhost:${port}/ai-models`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
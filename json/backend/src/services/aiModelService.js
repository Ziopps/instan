import axios from 'axios';

/**
 * AI Model Service - Layanan Model AI (Para Pekerja Kreatif)
 * Menyediakan akses ke berbagai model AI untuk generasi, evaluasi, dan embedding
 */
class AIModelService {
  constructor() {
    this.models = {
      generation: {
        openai: {
          endpoint: 'https://api.openai.com/v1/chat/completions',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        },
        gemini: {
          endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
          headers: {
            'Content-Type': 'application/json'
          }
        },
        anthropic: {
          endpoint: 'https://api.anthropic.com/v1/messages',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        },
        deepseek: {
          endpoint: 'https://api.deepseek.com/v1/chat/completions',
          headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        },
        openrouter: {
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      },
      evaluation: {
        openai: {
          endpoint: 'https://api.openai.com/v1/chat/completions',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      },
      embedding: {
        openai: {
          endpoint: 'https://api.openai.com/v1/embeddings',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        },
        custom: {
          endpoint: process.env.EMBEDDING_SERVICE,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      }
    };
  }

  /**
   * Generate text using specified AI model
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - The prompt for generation
   * @param {string} params.model - Model provider (openai, gemini, anthropic, deepseek, openrouter)
   * @param {Object} params.options - Model-specific options
   * @returns {Promise<Object>} Generated text and metadata
   */
  async generateText(params) {
    const { prompt, model = 'openai', options = {} } = params;
    
    try {
      switch (model.toLowerCase()) {
        case 'openai':
          return await this._generateOpenAI(prompt, options);
        case 'gemini':
          return await this._generateGemini(prompt, options);
        case 'anthropic':
          return await this._generateAnthropic(prompt, options);
        case 'deepseek':
          return await this._generateDeepSeek(prompt, options);
        case 'openrouter':
          return await this._generateOpenRouter(prompt, options);
        default:
          throw new Error(`Unsupported generation model: ${model}`);
      }
    } catch (error) {
      console.error(`Generation error with ${model}:`, error.message);
      throw error;
    }
  }

  /**
   * Evaluate generated text quality
   * @param {Object} params - Evaluation parameters
   * @param {string} params.text - Text to evaluate
   * @param {Array} params.criteria - Evaluation criteria
   * @param {string} params.model - Model provider for evaluation
   * @returns {Promise<Object>} Evaluation scores and feedback
   */
  async evaluateText(params) {
    const { text, criteria = [], model = 'openai' } = params;
    
    const evaluationPrompt = this._buildEvaluationPrompt(text, criteria);
    
    try {
      const response = await this._generateOpenAI(evaluationPrompt, {
        temperature: 0.2,
        maxTokens: 1000
      });

      // Parse evaluation response
      const evaluation = this._parseEvaluationResponse(response.content);
      
      return {
        success: true,
        evaluation,
        metadata: {
          model: model,
          criteria: criteria,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Evaluation error:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   * @param {Object} params - Embedding parameters
   * @param {string|Array} params.text - Text or array of texts to embed
   * @param {string} params.model - Embedding model (openai, custom)
   * @returns {Promise<Object>} Embeddings and metadata
   */
  async generateEmbeddings(params) {
    const { text, model = 'custom' } = params;
    
    try {
      switch (model.toLowerCase()) {
        case 'openai':
          return await this._embedOpenAI(text);
        case 'custom':
          return await this._embedCustom(text);
        default:
          throw new Error(`Unsupported embedding model: ${model}`);
      }
    } catch (error) {
      console.error(`Embedding error with ${model}:`, error.message);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Get available models and their capabilities
   * @returns {Object} Available models information
   */
  getAvailableModels() {
    return {
      generation: {
        openai: {
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
          capabilities: ['text-generation', 'conversation', 'creative-writing'],
          maxTokens: 4096,
          supportedLanguages: ['en', 'id', 'multiple']
        },
        gemini: {
          models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
          capabilities: ['text-generation', 'multimodal', 'long-context'],
          maxTokens: 32768,
          supportedLanguages: ['en', 'id', 'multiple']
        },
        anthropic: {
          models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
          capabilities: ['text-generation', 'analysis', 'creative-writing'],
          maxTokens: 4096,
          supportedLanguages: ['en', 'id', 'multiple']
        },
        deepseek: {
          models: ['deepseek-chat', 'deepseek-coder'],
          capabilities: ['text-generation', 'conversation', 'coding'],
          maxTokens: 16384,
          supportedLanguages: ['en', 'id', 'multiple']
        },
        openrouter: {
          models: ['google/gemini-pro-1.5', 'deepseek/deepseek-chat', 'openai/gpt-4-turbo'],
          capabilities: ['text-generation', 'conversation', 'coding', 'multilingual'],
          maxTokens: 128000,
          supportedLanguages: ['en', 'id', 'multiple']
        }
      },
      evaluation: {
        openai: {
          models: ['gpt-4', 'gpt-3.5-turbo'],
          capabilities: ['quality-assessment', 'content-analysis'],
          criteria: ['coherence', 'creativity', 'grammar', 'style', 'engagement']
        }
      },
      embedding: {
        openai: {
          models: ['text-embedding-3-large', 'text-embedding-3-small'],
          dimensions: [3072, 1536],
          capabilities: ['semantic-search', 'similarity']
        },
        custom: {
          models: ['multilingual-e5-large'],
          dimensions: [1024],
          capabilities: ['multilingual', 'semantic-search']
        }
      }
    };
  }

  // Private methods for different providers

  async _generateOpenAI(prompt, options = {}) {
    const config = this.models.generation.openai;
    const payload = {
      model: options.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.8,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    const response = await axios.post(config.endpoint, payload, { headers: config.headers });
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      finishReason: response.data.choices[0].finish_reason
    };
  }

  async _generateGemini(prompt, options = {}) {
    const config = this.models.generation.gemini;
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.8,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 4000
      }
    };

    const response = await axios.post(config.endpoint, payload, { headers: config.headers });
    
    return {
      content: response.data.candidates[0].content.parts[0].text,
      usage: response.data.usageMetadata,
      model: 'gemini-1.5-pro',
      finishReason: response.data.candidates[0].finishReason
    };
  }

  async _generateAnthropic(prompt, options = {}) {
    const config = this.models.generation.anthropic;
    const payload = {
      model: options.model || 'claude-3-sonnet-20240229',
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.8,
      messages: [{ role: 'user', content: prompt }]
    };

    const response = await axios.post(config.endpoint, payload, { headers: config.headers });
    
    return {
      content: response.data.content[0].text,
      usage: response.data.usage,
      model: response.data.model,
      finishReason: response.data.stop_reason
    };
  }

  async _generateDeepSeek(prompt, options = {}) {
    const config = this.models.generation.deepseek;
    const payload = {
      model: options.model || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.8,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    const response = await axios.post(config.endpoint, payload, { headers: config.headers });
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      finishReason: response.data.choices[0].finish_reason
    };
  }

  async _generateOpenRouter(prompt, options = {}) {
    const config = this.models.generation.openrouter;
    const payload = {
      model: options.model || 'google/gemini-pro-1.5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.8,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    const response = await axios.post(config.endpoint, payload, { headers: config.headers });

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      finishReason: response.data.choices[0].finish_reason
    };
  }

  async _embedOpenAI(text) {
    const config = this.models.embedding.openai;
    const payload = {
      model: 'text-embedding-3-large',
      input: Array.isArray(text) ? text : [text],
      encoding_format: 'float'
    };

    const response = await axios.post(config.endpoint, payload, { headers: config.headers });
    
    return {
      embeddings: response.data.data.map(item => item.embedding),
      usage: response.data.usage,
      model: response.data.model,
      dimensions: response.data.data[0].embedding.length
    };
  }

  async _embedCustom(text) {
    const config = this.models.embedding.custom;
    const payload = {
      text: Array.isArray(text) ? text : [text],
      model: process.env.EMBEDDING_MODEL_NAME || 'multilingual-e5-large'
    };

    const response = await axios.post(config.endpoint, payload, { headers: config.headers });
    
    return {
      embeddings: response.data.embeddings || [response.data.embedding],
      model: payload.model,
      dimensions: response.data.dimensions || (response.data.embedding ? response.data.embedding.length : parseInt(process.env.EMBEDDING_DIM)) || 1024
    };
  }

  _buildEvaluationPrompt(text, criteria) {
    const criteriaList = criteria.length > 0 ? criteria : [
      'coherence', 'creativity', 'grammar', 'style', 'engagement'
    ];

    return `Please evaluate the following text based on these criteria: ${criteriaList.join(', ')}.

Text to evaluate:
"""
${text}
"""

Please provide your evaluation in the following JSON format:
{
  "overallScore": <number between 1-10>,
  "scores": {
    ${criteriaList.map(c => `"${c}": <number between 1-10>`).join(',\n    ')}
  },
  "feedback": {
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"],
    "summary": "<overall assessment>"
  },
  "wordCount": <number>,
  "readabilityLevel": "<beginner|intermediate|advanced>"
}`;
  }

  _parseEvaluationResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: create basic evaluation
      return {
        overallScore: 7,
        scores: {
          coherence: 7,
          creativity: 7,
          grammar: 7,
          style: 7,
          engagement: 7
        },
        feedback: {
          strengths: ["Content generated successfully"],
          improvements: ["Could not parse detailed evaluation"],
          summary: "Basic evaluation completed"
        },
        wordCount: response.split(' ').length,
        readabilityLevel: "intermediate"
      };
    } catch (error) {
      console.error('Error parsing evaluation response:', error);
      throw new Error('Failed to parse evaluation response');
    }
  }
}

export const aiModelService = new AIModelService();
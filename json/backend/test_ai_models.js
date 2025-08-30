import 'dotenv/config';

/**
 * Test script untuk AI Model Service
 * Menguji semua endpoint AI Model Service
 */

const BASE_URL = 'http://localhost:8081';

// Test data
const testData = {
  generation: {
    prompt: "Write a short fantasy story about a young wizard discovering their magical powers for the first time. The story should be engaging and creative.",
    model: "openai",
    options: {
      temperature: 0.8,
      maxTokens: 1000
    },
    requestId: "test-gen-001"
  },
  evaluation: {
    text: "The young wizard Aria stood at the edge of the Whispering Woods, her heart pounding with anticipation. As she raised her trembling hand, sparks of golden light danced between her fingers for the first time. The ancient magic that had slept within her bloodline for generations was finally awakening. She felt the power coursing through her veins like liquid starlight, warm and electric. The trees seemed to lean in closer, as if they too could sense the momentous occasion. This was the beginning of her true journey.",
    criteria: ["coherence", "creativity", "grammar", "style", "engagement"],
    model: "openai",
    requestId: "test-eval-001"
  },
  embedding: {
    text: "The magical realm of Eldoria was filled with ancient mysteries and powerful artifacts.",
    model: "custom",
    requestId: "test-embed-001"
  },
  batchGeneration: {
    prompts: [
      "Describe a magical forest in 100 words.",
      "Write about a dragon's first flight.",
      "Create a dialogue between two wizards."
    ],
    model: "openai",
    options: {
      temperature: 0.7,
      maxTokens: 500
    },
    requestId: "test-batch-001"
  }
};

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`\n🔄 Testing ${method} ${endpoint}`);
    console.log('Request data:', data ? JSON.stringify(data, null, 2) : 'None');
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testAIModelService() {
  console.log('🚀 Starting AI Model Service Tests');
  console.log('=====================================');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Health Check
  console.log('\n📋 Test 1: Health Check');
  const healthResult = await makeRequest('/ai-models/health');
  results.tests.push({
    name: 'Health Check',
    passed: healthResult.success,
    details: healthResult
  });
  if (healthResult.success) results.passed++; else results.failed++;

  // Test 2: Get Available Models
  console.log('\n📋 Test 2: Get Available Models');
  const modelsResult = await makeRequest('/ai-models/models');
  results.tests.push({
    name: 'Get Available Models',
    passed: modelsResult.success,
    details: modelsResult
  });
  if (modelsResult.success) results.passed++; else results.failed++;

  // Test 3: Text Generation (only if API keys are configured)
  if (process.env.OPENAI_API_KEY) {
    console.log('\n📋 Test 3: Text Generation');
    const genResult = await makeRequest('/ai-models/generate', 'POST', testData.generation);
    results.tests.push({
      name: 'Text Generation',
      passed: genResult.success,
      details: genResult
    });
    if (genResult.success) results.passed++; else results.failed++;
  } else {
    console.log('\n⚠️  Skipping Text Generation test - OPENAI_API_KEY not configured');
  }

  // Test 4: Text Evaluation (only if API keys are configured)
  if (process.env.OPENAI_API_KEY) {
    console.log('\n📋 Test 4: Text Evaluation');
    const evalResult = await makeRequest('/ai-models/evaluate', 'POST', testData.evaluation);
    results.tests.push({
      name: 'Text Evaluation',
      passed: evalResult.success,
      details: evalResult
    });
    if (evalResult.success) results.passed++; else results.failed++;
  } else {
    console.log('\n⚠️  Skipping Text Evaluation test - OPENAI_API_KEY not configured');
  }

  // Test 5: Text Embedding (only if embedding service is configured)
  if (process.env.EMBEDDING_SERVICE) {
    console.log('\n📋 Test 5: Text Embedding');
    const embedResult = await makeRequest('/ai-models/embed', 'POST', testData.embedding);
    results.tests.push({
      name: 'Text Embedding',
      passed: embedResult.success,
      details: embedResult
    });
    if (embedResult.success) results.passed++; else results.failed++;
  } else {
    console.log('\n⚠️  Skipping Text Embedding test - EMBEDDING_SERVICE not configured');
  }

  // Test 6: Batch Generation (only if API keys are configured)
  if (process.env.OPENAI_API_KEY) {
    console.log('\n📋 Test 6: Batch Generation');
    const batchResult = await makeRequest('/ai-models/batch-generate', 'POST', testData.batchGeneration);
    results.tests.push({
      name: 'Batch Generation',
      passed: batchResult.success,
      details: batchResult
    });
    if (batchResult.success) results.passed++; else results.failed++;
  } else {
    console.log('\n⚠️  Skipping Batch Generation test - OPENAI_API_KEY not configured');
  }

  // Test 7: Error Handling - Invalid Request
  console.log('\n📋 Test 7: Error Handling - Invalid Generation Request');
  const errorResult = await makeRequest('/ai-models/generate', 'POST', {
    // Missing required prompt field
    model: "openai",
    requestId: "test-error-001"
  });
  const errorTestPassed = !errorResult.success && errorResult.status === 400;
  results.tests.push({
    name: 'Error Handling - Invalid Request',
    passed: errorTestPassed,
    details: errorResult
  });
  if (errorTestPassed) results.passed++; else results.failed++;

  // Test 8: Error Handling - Prompt Too Long
  console.log('\n📋 Test 8: Error Handling - Prompt Too Long');
  const longPromptResult = await makeRequest('/ai-models/generate', 'POST', {
    prompt: "A".repeat(60000), // Exceeds 50,000 character limit
    model: "openai",
    requestId: "test-long-001"
  });
  const longPromptTestPassed = !longPromptResult.success && longPromptResult.status === 400;
  results.tests.push({
    name: 'Error Handling - Prompt Too Long',
    passed: longPromptTestPassed,
    details: longPromptResult
  });
  if (longPromptTestPassed) results.passed++; else results.failed++;

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${test.name}`);
  });

  // Configuration Check
  console.log('\n🔧 Configuration Status:');
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`EMBEDDING_SERVICE: ${process.env.EMBEDDING_SERVICE ? '✅ Configured' : '❌ Not configured'}`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! AI Model Service is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
  }

  return results;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAIModelService().catch(console.error);
}

export { testAIModelService };
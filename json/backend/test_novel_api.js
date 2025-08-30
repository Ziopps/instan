import fetch from 'node-fetch';

/**
 * Test script untuk Novel Generation API
 */

const BASE_URL = 'http://localhost:8081';

async function testHealthCheck() {
  console.log('🔍 Testing Health Check...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Health Check Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testNovelGenerationHealthCheck() {
  console.log('🔍 Testing Novel Generation Health Check...');
  
  try {
    const response = await fetch(`${BASE_URL}/novel-generation/health`);
    const data = await response.json();
    
    console.log('✅ Novel Generation Health Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Novel Generation Health Check Failed:', error.message);
    return false;
  }
}

async function testNovelGeneration() {
  console.log('🔍 Testing Novel Generation...');
  
  const requestBody = {
    novelId: 'test-novel-1',
    chapterNumber: 1,
    focusElements: 'character introduction, world building',
    stylePreference: 'descriptive',
    mood: 'mysterious',
    requestId: 'test-req-' + Date.now(),
    callbackUrl: 'https://httpbin.org/post' // Test callback URL
  };
  
  try {
    const response = await fetch(`${BASE_URL}/novel-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Novel Generation Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('⚠️ Novel Generation Error Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Novel Generation Failed:', error.message);
    return false;
  }
}

async function testNovelUpload() {
  console.log('🔍 Testing Novel Upload...');
  
  const requestBody = {
    novelId: 'test-novel-1',
    content: 'In a world where magic flows like rivers through the ancient forests, a young mage named Aria discovered her unique ability to communicate with the spirits of nature. This is the beginning of her extraordinary journey.',
    chunkingStrategy: 'semantic',
    chunkSize: 500,
    overlap: 100,
    metadata: {
      author: 'Test Author',
      genre: 'Fantasy',
      language: 'en'
    }
  };
  
  try {
    const response = await fetch(`${BASE_URL}/novel-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Novel Upload Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('⚠️ Novel Upload Error Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Novel Upload Failed:', error.message);
    return false;
  }
}

async function testInputValidation() {
  console.log('🔍 Testing Input Validation...');
  
  // Test missing required fields
  const invalidRequest = {
    novelId: 'test-novel-1'
    // Missing required fields
  };
  
  try {
    const response = await fetch(`${BASE_URL}/novel-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidRequest)
    });
    
    const data = await response.json();
    
    if (!response.ok && data.error) {
      console.log('✅ Input Validation Working:', data.error);
      return true;
    } else {
      console.log('⚠️ Input Validation Not Working:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Input Validation Test Failed:', error.message);
    return false;
  }
}

async function testRateLimit() {
  console.log('🔍 Testing Rate Limiting...');
  
  const requests = [];
  const requestBody = {
    novelId: 'test-novel-rate-limit',
    chapterNumber: 1,
    focusElements: 'test',
    stylePreference: 'test',
    mood: 'test',
    callbackUrl: 'https://httpbin.org/post'
  };
  
  // Send 12 requests quickly (should trigger rate limit)
  for (let i = 0; i < 12; i++) {
    requests.push(
      fetch(`${BASE_URL}/novel-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
    );
  }
  
  try {
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      console.log(`✅ Rate Limiting Working: ${rateLimitedResponses.length} requests rate limited`);
      return true;
    } else {
      console.log('⚠️ Rate Limiting Not Triggered');
      return false;
    }
  } catch (error) {
    console.error('❌ Rate Limit Test Failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Novel Generation API Tests...\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Novel Generation Health Check', fn: testNovelGenerationHealthCheck },
    { name: 'Input Validation', fn: testInputValidation },
    { name: 'Rate Limiting', fn: testRateLimit },
    { name: 'Novel Upload', fn: testNovelUpload },
    { name: 'Novel Generation', fn: testNovelGeneration }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 Test Results Summary:');
  console.log(`${'='.repeat(50)}`);
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
  });
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above.');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export {
  testHealthCheck,
  testNovelGenerationHealthCheck,
  testNovelGeneration,
  testNovelUpload,
  testInputValidation,
  testRateLimit,
  runAllTests
};
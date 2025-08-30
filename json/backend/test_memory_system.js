#!/usr/bin/env node

/**
 * Memory System Test Script
 * Tests all major functionality of the Memory System
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8081';
const API_BASE = `${BASE_URL}/memory`;

// Test data
const testNovel = {
  title: "Test Fantasy Novel",
  description: "A test novel for the memory system",
  genre: "Fantasy",
  author: "Test Author"
};

const testCharacter = {
  name: "Test Hero",
  description: "A brave test character",
  traits: ["brave", "loyal", "determined"],
  motivations: ["save the world", "protect friends"],
  powers: ["sword mastery", "magic"],
  fears: ["failure", "losing loved ones"]
};

const testLocation = {
  name: "Test City",
  description: "A magnificent test city",
  geography: "Built on a hill beside a river",
  culture: "Diverse and welcoming",
  type: "city"
};

const testChapter = {
  number: 1,
  title: "Test Chapter",
  content: "This is a test chapter content. The hero begins their journey in the test city, meeting various characters and facing challenges. The story unfolds with magic and adventure.",
  summary: "Hero begins their journey",
  focusElements: "character introduction, world building",
  mood: "adventurous",
  stylePreference: "descriptive"
};

// Utility functions
async function makeRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function testSystemHealth() {
  console.log('\n🔍 Testing System Health...');
  
  try {
    const health = await makeRequest('/health');
    console.log('✅ System Health:', JSON.stringify(health, null, 2));
    return health.success;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testSystemInitialization() {
  console.log('\n🚀 Testing System Initialization...');
  
  try {
    const result = await makeRequest('/initialize', { method: 'POST' });
    console.log('✅ System initialized:', result.message);
    return true;
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    return false;
  }
}

async function testNovelCreation() {
  console.log('\n📚 Testing Novel Creation...');
  
  try {
    const result = await makeRequest('/novels', {
      method: 'POST',
      body: JSON.stringify(testNovel)
    });
    
    console.log('✅ Novel created:', result.novelId);
    return result.novelId;
  } catch (error) {
    console.error('❌ Novel creation failed:', error.message);
    return null;
  }
}

async function testNovelRetrieval(novelId) {
  console.log('\n📖 Testing Novel Retrieval...');
  
  try {
    const result = await makeRequest(`/novels/${novelId}`);
    console.log('✅ Novel retrieved:', result.data?.novel?.title || 'Novel data');
    return true;
  } catch (error) {
    console.error('❌ Novel retrieval failed:', error.message);
    return false;
  }
}

async function testCharacterManagement(novelId) {
  console.log('\n👤 Testing Character Management...');
  
  try {
    // Add character
    const addResult = await makeRequest(`/novels/${novelId}/characters`, {
      method: 'POST',
      body: JSON.stringify(testCharacter)
    });
    
    console.log('✅ Character added:', addResult.characterId);
    
    // Wait for background processing
    await delay(2000);
    
    // Retrieve character
    const getResult = await makeRequest(`/novels/${novelId}/characters/${addResult.characterId}`);
    console.log('✅ Character retrieved:', getResult.data?.name || 'Character data');
    
    return addResult.characterId;
  } catch (error) {
    console.error('❌ Character management failed:', error.message);
    return null;
  }
}

async function testLocationManagement(novelId) {
  console.log('\n🏰 Testing Location Management...');
  
  try {
    // Add location
    const addResult = await makeRequest(`/novels/${novelId}/locations`, {
      method: 'POST',
      body: JSON.stringify(testLocation)
    });
    
    console.log('✅ Location added:', addResult.locationId);
    
    // Wait for background processing
    await delay(2000);
    
    // Retrieve location
    const getResult = await makeRequest(`/novels/${novelId}/locations/${addResult.locationId}`);
    console.log('✅ Location retrieved:', getResult.data?.name || 'Location data');
    
    return addResult.locationId;
  } catch (error) {
    console.error('❌ Location management failed:', error.message);
    return null;
  }
}

async function testChapterManagement(novelId) {
  console.log('\n📝 Testing Chapter Management...');
  
  try {
    // Add chapter
    const addResult = await makeRequest(`/novels/${novelId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(testChapter)
    });
    
    console.log('✅ Chapter queued for processing:', addResult.chapterNumber);
    
    // Wait for background processing
    console.log('⏳ Waiting for chapter processing...');
    await delay(5000);
    
    // Retrieve chapter
    const getResult = await makeRequest(`/novels/${novelId}/chapters/${testChapter.number}`);
    console.log('✅ Chapter retrieved:', getResult.data?.title || 'Chapter data');
    
    // Get chapter sequence
    const sequenceResult = await makeRequest(`/novels/${novelId}/chapters?limit=5`);
    console.log('✅ Chapter sequence retrieved:', sequenceResult.data?.length || 0, 'chapters');
    
    return true;
  } catch (error) {
    console.error('❌ Chapter management failed:', error.message);
    return false;
  }
}

async function testSearchFunctionality(novelId) {
  console.log('\n🔍 Testing Search Functionality...');
  
  try {
    // Wait a bit more for embeddings to be processed
    console.log('⏳ Waiting for embeddings to be processed...');
    await delay(3000);
    
    // Test entity search
    const entityResult = await makeRequest(`/novels/${novelId}/search/entities?q=test&types=Character,Location`);
    console.log('✅ Entity search completed:', entityResult.data?.length || 0, 'results');
    
    // Test semantic search
    const semanticResult = await makeRequest(`/novels/${novelId}/search/semantic`, {
      method: 'POST',
      body: JSON.stringify({
        query: "brave hero with magic powers",
        options: { topK: 3 }
      })
    });
    console.log('✅ Semantic search completed:', semanticResult.data?.length || 0, 'results');
    
    // Test similar content search
    const similarResult = await makeRequest(`/novels/${novelId}/search/similar`, {
      method: 'POST',
      body: JSON.stringify({
        text: "The hero begins their adventure in a magical city",
        options: { topK: 3 }
      })
    });
    console.log('✅ Similar content search completed:', similarResult.data?.length || 0, 'results');
    
    return true;
  } catch (error) {
    console.error('❌ Search functionality failed:', error.message);
    return false;
  }
}

async function testContextBuilding(novelId) {
  console.log('\n🧠 Testing Context Building...');
  
  try {
    const result = await makeRequest(`/novels/${novelId}/context/2`, {
      method: 'POST',
      body: JSON.stringify({
        focusElements: "character development, plot advancement"
      })
    });
    
    console.log('✅ Context built successfully');
    console.log('   - Characters:', result.data?.characters?.length || 0);
    console.log('   - Locations:', result.data?.locations?.length || 0);
    console.log('   - Similar content:', result.data?.similarContent?.length || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Context building failed:', error.message);
    return false;
  }
}

async function testWorldStateManagement(novelId) {
  console.log('\n🌍 Testing World State Management...');
  
  try {
    // Get initial world state
    const getResult = await makeRequest(`/novels/${novelId}/worldstate`);
    console.log('✅ World state retrieved');
    
    // Update world state
    const updateResult = await makeRequest(`/novels/${novelId}/worldstate`, {
      method: 'PATCH',
      body: JSON.stringify({
        currentLocation: "Test City",
        activeCharacters: ["test-hero"],
        plotStatus: "beginning",
        timeOfDay: "morning"
      })
    });
    console.log('✅ World state update queued:', updateResult.status);
    
    return true;
  } catch (error) {
    console.error('❌ World state management failed:', error.message);
    return false;
  }
}

async function testCleanup() {
  console.log('\n🧹 Testing System Cleanup...');
  
  try {
    const result = await makeRequest('/cleanup', {
      method: 'POST',
      body: JSON.stringify({
        cleanupTempData: true,
        maxAge: 3600
      })
    });
    
    console.log('✅ Cleanup completed:', result.cleanedItems || 0, 'items removed');
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Memory System Tests');
  console.log('================================');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'System Health', fn: testSystemHealth },
    { name: 'System Initialization', fn: testSystemInitialization },
  ];
  
  // Run initial tests
  for (const test of tests) {
    results.total++;
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
  }
  
  // If basic tests pass, run novel-specific tests
  if (results.failed === 0) {
    const novelId = await testNovelCreation();
    
    if (novelId) {
      const novelTests = [
        { name: 'Novel Retrieval', fn: () => testNovelRetrieval(novelId) },
        { name: 'Character Management', fn: () => testCharacterManagement(novelId) },
        { name: 'Location Management', fn: () => testLocationManagement(novelId) },
        { name: 'Chapter Management', fn: () => testChapterManagement(novelId) },
        { name: 'Search Functionality', fn: () => testSearchFunctionality(novelId) },
        { name: 'Context Building', fn: () => testContextBuilding(novelId) },
        { name: 'World State Management', fn: () => testWorldStateManagement(novelId) },
        { name: 'System Cleanup', fn: testCleanup }
      ];
      
      for (const test of novelTests) {
        results.total++;
        try {
          const success = await test.fn();
          if (success) {
            results.passed++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
        }
      }
    } else {
      console.error('❌ Cannot run novel-specific tests without a valid novel ID');
    }
  }
  
  // Print results
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Memory System is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above for details.');
  }
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Memory System Test Script

Usage: node test_memory_system.js [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  TEST_BASE_URL  Base URL for the API (default: http://localhost:8081)

Examples:
  node test_memory_system.js
  TEST_BASE_URL=http://localhost:3000 node test_memory_system.js
`);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
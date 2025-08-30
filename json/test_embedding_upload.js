#!/usr/bin/env node

/**
 * Test script for embedding upload system
 * Usage: node test_embedding_upload.js
 */

import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/novel-upload';

// Create a test file
const createTestFile = () => {
  const testContent = `Chapter 1: The Beginning

In a land far away, there lived a young wizard named Elara. She had always been fascinated by the ancient arts of magic, spending countless hours in the dusty library of her mentor, Master Aldric.

The morning sun cast long shadows across the cobblestone courtyard as Elara practiced her spells. Each incantation required precise pronunciation and unwavering focus.

Chapter 2: The Discovery

One fateful day, while exploring the forbidden section of the library, Elara discovered an ancient tome bound in dragon leather. The book seemed to pulse with an otherworldly energy.

As she opened the book, golden letters began to appear on the previously blank pages, revealing secrets that had been hidden for centuries.`;

  const filename = 'test_novel.txt';
  fs.writeFileSync(filename, testContent);
  console.log(`✓ Created test file: ${filename}`);
  return filename;
};

// Test 1: Backend file upload
const testBackendUpload = async (filename) => {
  console.log('\n🧪 Testing Backend Upload...');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filename));
    form.append('novelId', 'test-novel-001');
    form.append('namespace', 'test-namespace');
    form.append('chunkSize', '400');
    form.append('chunkOverlap', '100');
    form.append('metadataJson', JSON.stringify({
      author: 'Test Author',
      genre: 'Fantasy',
      testRun: true
    }));

    const response = await fetch(`${BACKEND_URL}/upload`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ Backend upload successful');
      console.log(`  - Status: ${result.status}`);
      console.log(`  - Chunks: ${result.chunks}`);
      console.log(`  - Namespace: ${result.namespace}`);
      return true;
    } else {
      console.log('✗ Backend upload failed');
      console.log(`  - Error: ${result.error}`);
      console.log(`  - Message: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.log('✗ Backend upload error');
    console.log(`  - Error: ${error.message}`);
    return false;
  }
};

// Test 2: Direct n8n webhook test
const testN8nWebhook = async () => {
  console.log('\n🧪 Testing n8n Webhook Directly...');
  
  const testPayload = {
    novelId: 'test-novel-002',
    namespace: 'test-direct',
    chunks: [
      {
        index: 0,
        text: 'This is the first test chunk for embedding.',
        length: 44
      },
      {
        index: 1,
        text: 'This is the second test chunk with different content.',
        length: 53
      }
    ],
    metadata: {
      sourceFile: 'direct_test.txt',
      author: 'Direct Test',
      uploadedAt: new Date().toISOString()
    },
    source: {
      fileName: 'direct_test.txt',
      size: 97,
      mimeType: 'text/plain'
    }
  };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ n8n webhook successful');
      console.log(`  - Status: ${result.status}`);
      console.log(`  - Mode: ${result.mode}`);
      if (result.data) {
        console.log(`  - Total Chunks: ${result.data.totalChunks}`);
        console.log(`  - Successful Upserts: ${result.data.successfulUpserts}`);
        console.log(`  - Failed Upserts: ${result.data.failedUpserts}`);
      }
      return true;
    } else {
      console.log('✗ n8n webhook failed');
      console.log(`  - Status: ${response.status}`);
      console.log(`  - Error: ${result.message || result.error}`);
      return false;
    }
  } catch (error) {
    console.log('✗ n8n webhook error');
    console.log(`  - Error: ${error.message}`);
    return false;
  }
};

// Test 3: Health check
const testHealthCheck = async () => {
  console.log('\n🧪 Testing Health Endpoints...');
  
  try {
    // Backend health
    const backendHealth = await fetch(`${BACKEND_URL}/health`);
    const backendResult = await backendHealth.json();
    
    if (backendHealth.ok && backendResult.status === 'ok') {
      console.log('✓ Backend health check passed');
    } else {
      console.log('✗ Backend health check failed');
    }
  } catch (error) {
    console.log('✗ Backend health check error:', error.message);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Embedding Upload System Tests\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`n8n Webhook URL: ${N8N_WEBHOOK_URL}`);
  
  // Health checks first
  await testHealthCheck();
  
  // Create test file
  const testFile = createTestFile();
  
  // Run tests
  const results = {
    backend: await testBackendUpload(testFile),
    webhook: await testN8nWebhook()
  };
  
  // Cleanup
  try {
    fs.unlinkSync(testFile);
    console.log(`\n🧹 Cleaned up test file: ${testFile}`);
  } catch (error) {
    console.log(`⚠️  Could not clean up test file: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`  Backend Upload: ${results.backend ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  n8n Webhook: ${results.webhook ? '✓ PASS' : '✗ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '❌ Some tests failed'}`);
  
  process.exit(allPassed ? 0 : 1);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { runTests, testBackendUpload, testN8nWebhook, testHealthCheck };
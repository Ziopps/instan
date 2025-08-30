---
description: Repository Information Overview
alwaysApply: true
---

# N8N Workflow Repository Information

## Summary
This repository contains a JSON workflow configuration for n8n, a workflow automation platform. The workflow appears to be designed for novel generation using AI models, with a focus on character development, world-building, and chapter generation.

## Structure
The repository consists of a single JSON file (`Naa.json`) that defines an n8n workflow with multiple interconnected nodes for processing novel generation requests.

## Workflow Components

### Main Components
- **Webhook Trigger**: Entry point for the workflow that accepts HTTP POST requests
- **AI Models**: Utilizes OpenAI models for novel generation and quality evaluation
- **Database Integration**: Connects with Neo4j and Redis for storing and retrieving novel context
- **Vector Search**: Uses Pinecone and embeddings for semantic search capabilities
- **GraphQL Integration**: Queries a GraphQL endpoint for novel metadata

## Configuration Details

### API Integration
**External Services**:
- GraphQL endpoint (via environment variable `GRAPHQL_ENDPOINT`)
- Embedding service (via environment variable `EMBEDDING_SERVICE`)
- Pinecone vector database (via environment variable `PINECONE_URL`)
- Neo4j graph database (via environment variables `NEO4J_URI` and `NEO4J_DATABASE`)
- Redis cache

### Workflow Parameters
**Input Parameters**:
- `novelId`: Identifier for the novel
- `chapterNumber`: Chapter number to generate
- `focusElements`: Elements to focus on in the chapter
- `stylePreference`: Writing style preference
- `mood`: Emotional tone of the chapter
- `requestId`: Optional request identifier
- `callbackUrl`: URL for asynchronous callbacks

### AI Configuration
**Novel Generation Model**:
- Type: OpenAI Chat model
- Max Tokens: 4000
- Temperature: 0.8

**QA Evaluation Model**:
- Type: OpenAI Chat model
- Max Tokens: 2000
- Temperature: 0.2

### Data Flow
1. Webhook receives novel generation request
2. Input parameters are validated and processed
3. Context is fetched from Neo4j and GraphQL
4. Previous chapters and world state are retrieved from Redis
5. Semantic search is performed via embeddings and Pinecone
6. Novel generation model creates chapter content
7. QA evaluation model reviews the generated content
8. Results are cached and returned

## Usage
The workflow is designed to be used as part of an n8n instance, where it can be triggered via HTTP POST requests to the configured webhook endpoint (`/novel-generation`).

## Integration Points
- **Frontend Applications**: Can trigger the workflow via the webhook
- **Database Systems**: Neo4j and Redis for persistent storage
- **Vector Search**: Pinecone for semantic similarity search
- **GraphQL API**: For retrieving novel metadata and context---
description: Repository Information Overview
alwaysApply: true
---

# N8N Workflow Repository Information

## Summary
This repository contains a JSON workflow configuration for n8n, a workflow automation platform. The workflow appears to be designed for novel generation using AI models, with a focus on character development, world-building, and chapter generation.

## Structure
The repository consists of a single JSON file (`Naa.json`) that defines an n8n workflow with multiple interconnected nodes for processing novel generation requests.

## Workflow Components

### Main Components
- **Webhook Trigger**: Entry point for the workflow that accepts HTTP POST requests
- **AI Models**: Utilizes OpenAI models for novel generation and quality evaluation
- **Database Integration**: Connects with Neo4j and Redis for storing and retrieving novel context
- **Vector Search**: Uses Pinecone and embeddings for semantic search capabilities
- **GraphQL Integration**: Queries a GraphQL endpoint for novel metadata

## Configuration Details

### API Integration
**External Services**:
- GraphQL endpoint (via environment variable `GRAPHQL_ENDPOINT`)
- Embedding service (via environment variable `EMBEDDING_SERVICE`)
- Pinecone vector database (via environment variable `PINECONE_URL`)
- Neo4j graph database (via environment variables `NEO4J_URI` and `NEO4J_DATABASE`)
- Redis cache

### Workflow Parameters
**Input Parameters**:
- `novelId`: Identifier for the novel
- `chapterNumber`: Chapter number to generate
- `focusElements`: Elements to focus on in the chapter
- `stylePreference`: Writing style preference
- `mood`: Emotional tone of the chapter
- `requestId`: Optional request identifier
- `callbackUrl`: URL for asynchronous callbacks

### AI Configuration
**Novel Generation Model**:
- Type: OpenAI Chat model
- Max Tokens: 4000
- Temperature: 0.8

**QA Evaluation Model**:
- Type: OpenAI Chat model
- Max Tokens: 2000
- Temperature: 0.2

### Data Flow
1. Webhook receives novel generation request
2. Input parameters are validated and processed
3. Context is fetched from Neo4j and GraphQL
4. Previous chapters and world state are retrieved from Redis
5. Semantic search is performed via embeddings and Pinecone
6. Novel generation model creates chapter content
7. QA evaluation model reviews the generated content
8. Results are cached and returned

## Usage
The workflow is designed to be used as part of an n8n instance, where it can be triggered via HTTP POST requests to the configured webhook endpoint (`/novel-generation`).

## Integration Points
- **Frontend Applications**: Can trigger the workflow via the webhook
- **Database Systems**: Neo4j and Redis for persistent storage
- **Vector Search**: Pinecone for semantic similarity search
- **GraphQL API**: For retrieving novel metadata and context
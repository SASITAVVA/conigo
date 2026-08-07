# CogniPath Enterprise Documentation Library

Welcome to the central engineering documentation repository for the **CogniPath AI Learning Platform**. This library details our modern software architecture, API definitions, database schemas, and testing frameworks.

## Documentation Navigation Table

| Document | Purpose | Target Audience |
| :--- | :--- | :--- |
| [Architecture Guide](./Architecture.md) | Details the separation of concerns across Client, Server, Database, and Tests. | Systems Architects & Backend Developers |
| [API Reference](./API.md) | Full specification of all REST endpoints, parameters, and SSE event streams. | Frontend Engineers & Integrators |
| [Database Schemas](./Database.md) | Covers the 22 relational table definitions and vector embeddings for RAG. | Data Engineers & DBA |

## Development & Environment Setup

### 1. Prerequisites
- **Node.js**: v18.x or v20.x+ recommended.
- **Environment Configuration**: Duplicate `server/.env.example` into `server/.env` and insert your Gemini API Key and Supabase parameters (optional; fallback offline persistence is supported).

### 2. Starting the Platform
```bash
# From project root, launch the enterprise backend and static file server
node server/index.js
```

The application will be served live at **http://localhost:3000/**.

### 3. Executing Automated Test Suites
```bash
# Run full integration test suite against running server
node tests/test_production_suite.js

# Verify specific subsystems
node tests/test_auth.js
node tests/test_gemini.js
node tests/test_quiz.js
```

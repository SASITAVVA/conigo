# 🚀 CogniPath Enterprise AI Learning Platform

An intelligent, state-of-the-art enterprise learning platform powered by **Google Gemini AI**, automated vector document RAG, spaced-repetition active recall flashcards, and centralized user telemetry tracking.

---

## 🌟 Architectural Overview & Highlights
This codebase follows modern software engineering best practices, dividing system responsibilities into dedicated enterprise tiers:
- **`client/`**: Modular Vanilla CSS (Glassmorphism), dynamic JavaScript components (`Navbar`, `Sidebar`, `Toast`, `Neural Loader`), and dedicated page view logic (`Dashboard`, `Progress`, `Analytics`, `Flashcards`).
- **`server/`**: Robust Express.js backend architected with strict separation of concerns—featuring **Routes**, **Controllers**, **Services**, **Middleware**, **Models**, **Config**, and **Utils**.
- **`database/`**: Complete database migrations for 22 relational learning entities, vector embedding search indexes, and resilient offline file-system fallback persistence (`local_db.json`).
- **`tests/`**: Automated integration end-to-end testing suite asserting 100% API health and model performance.
- **`docs/`**: Comprehensive developer manual, API specifications, and architectural documentation.

---

## 📚 Documentation Library
Explore our complete documentation inside the `/docs/` repository:
- 📘 **[Engineering Architecture & MVC Guidelines](./docs/Architecture.md)**
- 📗 **[Complete REST API Endpoints Reference](./docs/API.md)**
- 📙 **[Database Schema & RAG Embeddings Manual](./docs/Database.md)**
- 📕 **[Documentation Index](./docs/README.md)**

---

## ⚡ Quick-Start Instructions

### 1. Launch the Enterprise Learning Server
```powershell
node server/index.js
```
The server will initialize and bind to port **3000**, serving both the interactive REST API and the frontend client simultaneously. Open your browser to **[http://localhost:3000/](http://localhost:3000/)**.

### 2. Verify Application Integrity via Automated Tests
```powershell
# Run automated production validation suite
node tests/test_production_suite.js
```

---

## 🔒 Enterprise Rules & Feature Constraints
- **Centralized Telemetry Tracking**: All statistics, charts, graphs, and activity feeds across the Dashboard, Progress, and Analytics pages reflect real user interactions in real time via Server-Sent Events (SSE). No hardcoded dummy values are used.
- **Neural Link Animation Delay**: The authentication system strictly respects a **minimum 5-second loading screen duration** (`NeuralLoaderComponent`) during sign-in to guarantee smooth animation transitions before displaying curriculum data.
- **Active Recall Learning Center**: Flashcard study reviews automatically adjust spaced-repetition intervals and award study experience points (XP) dynamically.

---
*Developed & architected with Google Antigravity Advanced Agentic Coding.*

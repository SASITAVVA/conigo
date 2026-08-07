# CogniPath Platform Architecture & MVC Pattern Design

The CogniPath AI Learning Platform is architected following industry-standard software engineering principles: **Single Responsibility**, **Separation of Concerns**, and strict **Model-View-Controller (MVC) + Service Layering**.

---

## Architectural Topography

```
c:/Users/tavva/OneDrive/Desktop/CONIGO/
├── client/                     # Frontend Static Web Application
│   ├── index.html              # Core single-page interface structure
│   ├── pages/                  # Modular Page Controller Scripts (Dashboard, Progress, Flashcards, Analytics)
│   ├── components/             # Reusable UI Element Handlers (Navbar, Sidebar, Toast, Neural Loader)
│   ├── css/                    # Vanilla CSS Styling & Glassmorphic Variables
│   ├── js/                     # Application bootstrapping & core state management
│   ├── images/ & icons/        # Graphic background textures & Vector icons
│   └── fonts/                  # Local and Google typography configuration
├── server/                     # Express.js & Backend Architecture Layer
│   ├── index.js                # App bootstrapping, port binding, and global middleware mount
│   ├── routes/                 # Pure endpoint route definition wrappers (14 modules)
│   ├── controllers/            # HTTP Request/Response validation and orchestrations (14 modules)
│   ├── services/               # Business logic execution & DB/External AI calls (gemini.js, db.js, events.js)
│   ├── middleware/             # Interceptor pipeline (auth, validation, logging, global errors)
│   ├── models/                 # Data access abstractions and object schemas
│   ├── config/                 # Centralized environment parsing & DB connections
│   └── utils/                  # Helper utilities (logger, cryptography, structured HTTP response formatting)
├── database/                   # Persistent Data Storage & Migrations
│   ├── local_db.json           # Offline file fallback persistent state storage (300KB+ seeded records)
│   ├── seed.js                 # Initialization script for default users, courses, and gamified states
│   └── migrations/             # SQL definitions for Supabase & Postgres vector extensions
├── tests/                      # Automated Integration and Verification Suites
│   └── test_production_suite.js # Comprehensive 100% automated API integration test script
└── docs/                       # Technical Systems & Developer Documentation
```

---

## Backend Request Lifecycle

1. **HTTP Ingestion**: Client sends an HTTP request to `server/index.js`.
2. **Middleware Interception**: The request traverses `requestLogger` (logging timing/IP) and security headers.
3. **Route Resolution**: `server/routes/` identifies the matching HTTP verb and target URL and forwards execution to the appropriate Controller function.
4. **Controller Orchestration**: The controller (e.g., `dashboardController.js`) unescapes query arguments and invokes business domain methods inside `server/services/`.
5. **Service execution**: `services/db.js` queries remote Supabase instances (or seamlessly falls back to local persistent storage), while `services/gemini.js` executes neural LLM generating tasks.
6. **Real-Time Synchronization**: `services/events.js` casts Server-Sent Event updates across active client dashboard streams to maintain cross-page accuracy without page reloads.

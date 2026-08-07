# CogniPath AI Learning Platform - REST API Reference

The CogniPath backend strictly follows RESTful structural best practices and MVC patterns. All business logic is encapsulated in dedicated controllers and services, while routes map HTTP verbs cleanly.

## Base URL
`http://localhost:3000/api`

---

## 1. Authentication & Users (`/auth`)
| Method | Endpoint | Description | Payload / Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new learner profile. | `{ email, password, name }` |
| `POST` | `/auth/login` | Authenticate user and initialize neural matrix. | `{ email, password }` |
| `GET` | `/auth/profile` | Retrieve user profile & goal configurations. | `?userId={UUID}` |

---

## 2. Dashboard & Telemetry (`/dashboard`)
| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/stats` | Retrieve aggregated study hours, XP, streak, and recent activity feed. | `?userId={UUID}` |

---

## 3. Real-Time Server-Sent Events (`/events/stream`)
- **URL**: `http://localhost:3000/api/events/stream`
- **Protocol**: HTTP Server-Sent Events (`text/event-stream`)
- **Description**: Emits live updates across Dashboard, Progress, and Analytics pages simultaneously when study timers tick or activities trigger.

---

## 4. AI Chat & RAG Querying (`/chat`)
| Method | Endpoint | Description | Payload / Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/chat/ask` | Send conversational prompt to Google Gemini with Document Vector RAG context. | `{ userId, message, documentId }` |
| `GET` | `/chat/history` | Retrieve stored historical conversation logs. | `?userId={UUID}` |

---

## 5. Active Recall Study Materials & Flashcards (`/study-materials`)
| Method | Endpoint | Description | Payload / Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/study-materials/all` | Retrieve all study materials, notes, bookmarks, and flashcards. | `?userId={UUID}` |
| `POST` | `/study-materials/flashcard` | Create or update review difficulty rating for spaced repetition. | `{ userId, cardId, rating }` |

---

## 6. Gamification & Leaderboards (`/gamification`)
| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/gamification/summary` | Get XP level progress, unlocked badges, and university rankings. | `?userId={UUID}` |
| `GET` | `/gamification/leaderboard` | Get sorted public learner rankings. | None |

---

## 7. Curriculum & Courses (`/courses`)
| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/courses/all` | Fetch complete catalog of roadmaps, subjects, and study topics. | None |

---

## 8. Document Ingestion & Embeddings (`/documents`)
| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/documents/upload` | Process PDF/Document file, generate summaries, and compute vector embeddings. | `multipart/form-data` or `{ fileData, title, userId }` |

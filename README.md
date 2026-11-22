# DTU Placement Intelligence

> A centralized platform for exploring historical Delhi Technological University (DTU) campus placement intelligence using structured database queries, semantic search, and an AI-powered RAG system.

---

## 1. System Architecture

```text
DTU Placement Intelligence Architecture:

[ User Interface: React + Vite + Tailwind CSS ]
                     │
                     ▼
[ Express.js REST API Server (Port 5001) ]
  ├── /api/jobs        (Historical WhatsApp announcements & bulk JSON import)
  ├── /api/experiences (Student interview narratives & rounds)
  ├── /api/leetcode    (Company-tagged preparation problems)
  ├── /api/companies   (Directory & live aggregation stats)
  ├── /api/assistant   (Hybrid Router & Grounded RAG Assistant)
  └── /api/admin       (WhatsApp announcement extraction & CSV import)
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[ Multi-Source Query Router ]    [ Google Gemini Models ]
  ├── Deterministic Rules          ├── gemini-2.5-flash (Extraction, Routing & Synthesis)
  └── Gemini Semantic Planner      └── gemini-embedding-001 (768-dim Embeddings)
       │
       ▼
[ MongoDB Atlas Collections ]
  ├── jobs                (Structured queries on CTC, branches, CGPA)
  ├── experiences         (Student narratives & structured breakdowns)
  ├── experience_chunks   (Conditional chunks + vector search)
  ├── leetcode_questions  (Idempotent company-wise practice problems)
  └── companies           (Company directory & tier metrics)
```

---

## 2. Supported Data Sources & Ingestion Pipelines

1. **Historical WhatsApp Placement Announcements:**
   * Admin pastes original raw announcement text copied from authorized WhatsApp groups or campus notices.
   * Gemini extracts structured parameters (`company`, `role`, `type`, `ctc`, `eligibleBranches`, `minCgpa`, `batch`, `ppo`, `location`).
   * Admin reviews/corrects fields before saving to the `jobs` collection.
   * The complete raw announcement message is preserved for full data provenance.

2. **Student Interview Experiences:**
   * Student provides company, role, placement year, and free-text narrative.
   * Gemini analyzes the narrative and extracts rounds breakdown (`OA`, `Technical`, `HR`), DSA topics, CS fundamentals, difficulty, and verdict.
   * Student confirms or edits extracted details.
   * Narrative text is automatically cleaned, conditionally chunked, embedded via Gemini `text-embedding-004`, and stored in `experience_chunks`.
   * Direct structured submissions bypass LLM extraction and undergo direct schema validation.

3. **Company-Wise LeetCode Datasets:**
   * Parsed from CSV (`backend/data/leetcode_sample.csv`).
   * Validated, normalized company names, and deduplicated via MongoDB compound unique index `{ companyNormalized: 1, title: 1 }`.
   * Repeatable imports guarantee zero duplicate records.
   * Labeled strictly as third-party company preparation data, not verified DTU questions.

---

## 3. Grounded Multi-Source RAG Pipeline

* **Hybrid Router:**
  * Deterministic rule-based matching for clear queries (e.g. salary filters $\ge 15$ LPA, pure LeetCode practice, pure interview topics).
  * Gemini routing for nuanced, conversational, or multi-source requests.
  * Generates a strictly validated `RetrievalPlan` using Zod schema.
* **Parallel Execution:**
  * Backend executes independent retrieval services (`searchJobs`, `searchExperiences`, `searchLeetCode`) in parallel using `Promise.all`.
  * **Zero arbitrary database query execution by LLM.**
* **Source Separation & Grounded Synthesis:**
  * Context is strictly labeled into:
    1. `HISTORICAL JOB DATA (OFFICIAL ANNOUNCEMENTS)`
    2. `STUDENT EXPERIENCES (STUDENT-REPORTED EXPERIENCES AT DTU)`
    3. `THIRD-PARTY LEETCODE PREPARATION DATA (PRACTICE ONLY)`
  * Gemini synthesizes a single coherent response with citations (`[Job #id]`, `[Experience #id]`, `[LeetCode #id]`).
  * If no relevant evidence exists, the assistant explicitly states that historical data is unavailable without hallucinating.

---

## 4. Quickstart Guide

### Prerequisites
* Node.js $\ge$ 20.x
* npm $\ge$ 10.x
* (Optional) MongoDB Atlas Connection URI or local MongoDB instance (falls back automatically to in-memory MongoDB for development/tests)
* (Optional) Gemini API Key in `.env` (falls back to deterministic grounded synthesis if unset)

### Installation & Setup

1. **Clone & Install Dependencies:**
   ```bash
   cd "backend"
   npm install
   cd "../frontend"
   npm install
   ```

2. **Configure Environment Variables:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Add your `GEMINI_API_KEY` in `backend/.env`.

3. **Run Automated Test Suite (Phases 1 - 6):**
   ```bash
   npm test
   # Runs 48 automated test cases covering DB foundation, ingestion, chunking, embeddings, retrieval, routing, and RAG.
   ```

4. **Seed Sample Data:**
   ```bash
   npm run seed
   ```

5. **Start Application:**
   * Backend:
     ```bash
     cd backend
     npm start
     # Running on http://localhost:5000
     ```
   * Frontend:
     ```bash
     cd frontend
     npm run dev
     # Running on http://localhost:3000
     ```

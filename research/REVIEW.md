# Public repository review — September 26, 2026

Account: https://github.com/Atomstars

Scope: all 14 public repositories were enumerated through GitHub's API. Repository trees, available READMEs, manifests, and selected implementation files are recorded in `github-audit.json`, together with tree SHA identifiers. Empty repositories and archived source are represented according to their published contents. This review does not assert every file was read or every project was run.

| Repository | Evidence and portfolio treatment |
| --- | --- |
| MoneyFest | Python/FastAPI and React/TypeScript manifests; `app/llm.py` supports Groq/Anthropic structured tool calls. `app/attrib/pipeline.py` performs attribution, deterministic verification, conditional LLM verification, scoring, citations, and abstention. The second LLM call is skipped when no candidates survive, despite README wording of exactly two calls. |
| Buddy-App | Current root React manifest and Node/Express backend; Supabase; `backend/services/aiProvider.js` and `buddyBrain.js` implement Groq reflections and deterministic fallback. Older backup directories are not the active stack evidence. |
| gmat-verbal-practice | Next.js UI, Java service manifests, PostgreSQL/pgvector architecture, Python extraction/indexing, RAG service, and progress outbox integration. Distinct from GMAT. |
| GMAT | React/TypeScript frontend, FastAPI/SQLite backend and local Ollama tutoring in `backend/main.py`. Full operation needs its local services. |
| Tutor-Agent | README is stale: `backend/pom.xml` uses Spring Data MongoDB and User has `@Document`. `TutorService.respond` saves conversation history and constructs a template answer, rather than calling a model. Described as a scaffold. |
| Cafe_pos | Next.js/TypeScript, Prisma schema with PostgreSQL products/orders/order items. n8n is stated in repository description; end-to-end workflow execution was not verified. |
| Davina_AeroSpace | React/TypeScript, React Three Fiber, Three.js, Framer Motion; `src/App.tsx` implements the aerospace website. Hardware claims in client copy are not attributed to the portfolio developer. |
| Dailybash | Daymark README describes hourly timeline, reflections, summaries, and browser-local persistence. Next.js/TypeScript manifests. Installed database libraries are not evidence of active database persistence. |
| Job-Agent | README and tree describe native Node HTTP backend, validation, Boolean queries, links, and checklist. No autonomous applications or LLM operation claimed. |
| Housing_Predictor_ML | `chennai_engine.py` uses small illustrative NumPy/scikit-learn datasets for regression/classification. Learning experiment, not validated real-estate valuation. |
| GAS | This working portfolio uses Vite, JavaScript, CSS and Three.js. Earlier GSAP and galaxy experiments remain available on disk. |
| first_code | Java exercises and foundational algorithms. |
| hcl_tech | `employeeaccountapp.zip` contains a Java 8 / Spring Boot 2.7 service, employee/account models, REST controller, and OpenFeign clients targeting two downstream services. Archive contents were read without executing them; recorded in `hcl-archive-review.json`. |
| Prince | Empty public repository. |

External project preview health was not re-verified during this redesign. Existing September 23 observations are dated in the original catalog; new copy avoids claiming that all listed previews have operational backends. The demonstration graphics and MoneyFest scenario transitions are illustrative, not screenshots or live inference.

To repeat the baseline metadata/manifest collection, run `node research/audit.mjs`. This replaces the snapshot with fresh baseline results; selected implementation files in this review were fetched separately and must also be refreshed before revising their claims.

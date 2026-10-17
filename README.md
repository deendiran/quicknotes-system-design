# QuickNotes System Design & API Client

A production-ready full-stack prototype and distributed backend system architecture for **QuickNotes** — a high-performance note-taking platform designed to scale to 1,000,000 active users.

---

## 1. Project Overview

QuickNotes bridges the gap between client-side web development and large-scale cloud system architecture. The project consists of two core components:

1. **The Interactive API Client (`index.html`, `style.css`, `api.js`):** A responsive, accessible frontend dashboard communicating with the JSONPlaceholder REST API. It implements safe DOM updates (`textContent` XSS mitigation), input validation, asynchronous network state management (idle, loading, success, and error states), and handles dynamic CRUD operations (GET, POST, DELETE).
2. **The Backend System Design Blueprints (`docs/`):** A comprehensive architectural specification detailing how QuickNotes scales from a single-machine prototype to a fault-tolerant cloud service handling 1M registered users.

---

## 2. Repository Structure

```text
quicknotes-system-design/
├── docs/
│   ├── api-design.md       # RESTful API endpoints, request/response JSON & error schemas
│   ├── data-model.md       # PostgreSQL schema DDL, relationships, indexes & query optimizations
│   └── architecture.md     # System architecture diagram, 1M user load estimates & trade-offs
├── index.html              # Accessible HTML5 UI structure
├── style.css               # Modern, accessible styling system with distinct status indicators
├── api.js                  # Asynchronous Fetch API client with complete error handling
└── README.md               # Repository documentation and technical takeaways

## 3. How to Run the API Client Locally

Because modern web browsers enforce security and CORS restrictions on script modules and network requests, run the client using a local HTTP server:

### Option 1: Python HTTP Server (Zero Install)
```bash
# Navigate to the project directory
cd "C:\Users\san\quicknotes-system-design"

# Start the server on port 8000
python3 -m http.server 8000

# Open in browser
http://localhost:8000/index.html
```

### Option 2: Node.js (Quick Install)
If you have Node.js installed, use the built-in `serve` package:

```bash
npx serve .
```
Then open `http://localhost:3000` in your browser.

### Option 3: VS Code Live Server
1. Install the Live Server extension in Visual Studio Code.
2. Right-click index.html in your file explorer and select "Open with Live Server".

## 4. System Design Documentation Links

Read the complete engineering blueprints designed for the backend development team: 

### API Design Document: 
RESTful endpoint contracts, request/response payload examples, and RFC 7807 error status handling.

### Data Model Document: 
Entity relationship definitions, PostgreSQL CREATE TABLE DDL statements, multi-table JOIN queries, indexing strategies, and SQL vs NoSQL justification.

### Architecture Document: 
Scalability estimates for 1M users, Mermaid architecture diagrams, cache-aside read/write flows, trade-off evaluations, and SPOF mitigation.

## 5. What I Learned Building QuickNotes
1. **Defensive Asynchronous Programming & Safe DOM Manipulation:** Handling asynchronous network operations requires more than basic fetch() calls. A robust frontend must gracefully guide the user through all four UI states (idle, loading, success, and error) while disabling interactive buttons to prevent duplicate form submissions. Furthermore, using textContent instead of innerHTML when displaying untrusted external data is essential for eliminating Cross-Site Scripting (XSS) attack vectors.

2. **Capacity Planning Drives Architectural Decisions:** Translating 1,000,000 registered users into quantitative metrics (46.3 Read QPS, 4.6 Write QPS, ~245 GB storage/year) demonstrated that raw numbers dictate technology choices. A 10:1 read-to-write ratio immediately revealed that our bottleneck was reading notes, directly justifying the integration of a Redis caching layer and PostgreSQL read replicas to offload queries from the primary database.

3. **Composite Indexing Eliminates Costly Sorting:** In relational databases, querying sorted records (ORDER BY created_at DESC) with a standard single-column index requires a secondary in-memory sort that degrades under high volume. Creating a composite B-Tree index on (user_id, created_at DESC) allows the database engine to locate a user's notes and read them pre-sorted in a single index seek, reducing query time from $O(N \log N)$ to $O(\log N)$.

Every Architectural Advantage Introduces a Trade-off: No architectural choice comes without a compromise. Adding an asynchronous read replica enables horizontal read scaling, but introduces replication lag and eventual consistency issues. Implementing a Redis cache layer provides lightning-fast sub-5ms responses, but demands strict cache eviction policies to prevent stale data. Engineering high-scale systems is about balancing these trade-offs against user expectations.
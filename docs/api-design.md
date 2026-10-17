# QuickNotes REST API Specification

## 1. Overview
This document specifies the RESTful API for the production QuickNotes service. It provides authenticated access to manage user accounts, notes, and organizational tags at a scale of 1,000,000 users.

- **Base URL:** `https://api.quicknotes.io/api/v1`
- **Content-Type:** `application/json; charset=UTF-8`
- **Authentication:** Bearer JWT in the `Authorization` header (`Authorization: Bearer <token>`).

---

## 2. Endpoints Table

| Method | Endpoint Path | Description | Success Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate user and issue JWT | `200 OK` |
| `GET` | `/notes` | List paginated notes for authenticated user | `200 OK` |
| `POST` | `/notes` | Create a new note | `201 Created` |
| `GET` | `/notes/{id}` | Retrieve details of a specific note | `200 OK` |
| `PUT` | `/notes/{id}` | Replace / update an existing note | `200 OK` |
| `DELETE` | `/notes/{id}` | Remove a note | `204 No Content` |
| `GET` | `/tags` | List all tags created by the user | `200 OK` |

---

## 3. Request & Response Examples

### 3.1. Create a Note (`POST /api/v1/notes`)

#### Request
- **Headers:**
```http
  POST /api/v1/notes HTTP/1.1
  Host: api.quicknotes.io
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
  Content-Type: application/json
  {
  "title": "System Design Revision",
  "body": "Remember to study database partitioning and read replicas.",
  "tag_ids": [12, 45]
}
```

- **Response (201 Created):**

- **Headers:**
```http
 Location: /api/v1/notes/10492
Content-Type: application/json
```

- **Response Body:**
```json
{
  "id": 10492,
  "user_id": 4821,
  "title": "System Design Revision",
  "body": "Remember to study database partitioning and read replicas.",
  "tags": [
    { "id": 12, "name": "study" },
    { "id": 45, "name": "architecture" }
  ],
  "created_at": "2026-10-17T14:30:00Z",
  "updated_at": "2026-10-17T14:30:00Z"
}
```

### 3.2. List Notes (`GET /api/v1/notes`)

#### Request
- **Headers:**
```http
GET /api/v1/notes?page=1&limit=20&tag_id=12 HTTP/1.1
Host: api.quicknotes.io
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

- **Response (200 OK):**

- **Headers:**
```http
Content-Type: application/json
```

- **Response Body:**
```json
{
  "pagination": {
    "total_notes": 42,
    "current_page": 1,
    "total_pages": 3,
    "limit": 20,
    "has_next": true,
    "has_prev": false
  },
  "notes": [
    {
      "id": 10492,
      "title": "System Design Revision",
      "body": "Remember to study database partitioning and read replicas.",
      "tags": [
        { "id": 12, "name": "study" },
        { "id": 45, "name": "architecture" }
      ],
      "created_at": "2026-10-17T14:30:00Z",
      "updated_at": "2026-10-17T14:30:00Z"
    },
    {
      "id": 10491,
      "title": "Weekly Groceries",
      "body": "Milk, eggs, bread, chicken.",
      "tags": [
        { "id": 3, "name": "personal" }
      ],
      "created_at": "2026-10-16T10:15:00Z",
      "updated_at": "2026-10-16T10:15:00Z"
    }
  ]
}
```

### 3.3. Delete a Note (`DELETE /api/v1/notes/{id}`)

#### Request
```http
DELETE /api/v1/notes/10491 HTTP/1.1
Host: api.quicknotes.io
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

- **Response (204 No Content):**

- **Headers:**
```http
Content-Type: application/json
```

- **Response Body:**
```json
{
  "message": "Note deleted successfully."
}
```

## 4. Error Handling and Status Codes
The QuickNotes API adheres to RFC 7807 problem details semantics. Every error response includes an HTTP status code accompanied by a predictable JSON body:
```json
{
  "type": "/api/v1/errors/invalid_request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "The request was malformed or contained invalid parameters.",
  "instance": "/api/v1/notes",
  "errors": {
    "title": ["Title is required"],
    "body": ["Body exceeds maximum length of 5000 characters"]
  }
}
```
#### Supported HTTP Error Status Codes:
```
|Status Code|Meaning|Typical Trigger Scenario|
|-----------|-------|-------------------------|
|400 Bad Request|Malformed payload or validation error|Title missing, or exceeds 100 characters.|
|401 Unauthorized|Missing or invalid authentication|Missing, expired, or malformed JWT Bearer token.|
|403 Forbidden|Authenticated but access denied|Attempting to view or delete another user's note.|
|404 Not Found|Resource does not exist|Requesting a note ID that does not exist in the database.|
|500 Internal Error|Unexpected backend server fault|Database connection timeout or unhandled exception.|
```

Example: 400 Bad Request Validation Error Body
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The payload provided contains validation errors.",
    "status": 400,
    "timestamp": "2026-10-17T14:36:00Z",
    "details": [
      {
        "field": "title",
        "issue": "Title cannot exceed 100 characters."
      }
    ]
  }
}

```
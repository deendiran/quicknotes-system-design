# QuickNotes Data Model

## 1. Entity Overview
QuickNotes is modeled around four core relational entities:

1. **`users`**: Represents registered account holders who own notes and custom tags.
2. **`notes`**: Core user-authored notes containing title, content body, and audit timestamps.
3. **`tags`**: Reusable categorizations created by users to group related notes.
4. **`note_tags`**: Junction table resolving the many-to-many relationship between notes and tags.

---

## 2. Entity Relationships
- **One-to-Many (`users` to `notes`):** One user can author zero or many notes. Each note belongs strictly to one author (`notes.user_id -> users.id`). Deleting a user cascades to delete their authored notes.
- **One-to-Many (`users` to `tags`):** Each tag is scoped to its creator (`tags.user_id -> users.id`).
- **Many-to-Many (`notes` to `tags`):** A note can have multiple tags, and a single tag can be assigned across multiple notes. This is modeled using the associative entity `note_tags` with foreign keys referencing both `notes.id` and `tags.id`.

---

## 3. Database Schema (PostgreSQL DDL)

```sql
-- 1. Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Notes Table
CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_notes_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Tags Table
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_tags_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_tag UNIQUE (user_id, name)
);

-- 4. Note_Tags Junction Table
CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    CONSTRAINT fk_notetags_note FOREIGN KEY (note_id) 
        REFERENCES notes (id) ON DELETE CASCADE,
    CONSTRAINT fk_notetags_tag FOREIGN KEY (tag_id) 
        REFERENCES tags (id) ON DELETE CASCADE
);
```

## 4. Example SQL Queries
### Query 1: Fetch paginated notes for an authenticated user

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = 4821
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;

```

### Query 2: Multi-table JOIN with tag aggregation
Retrieves notes for a user along with an aggregated array of associated tag names:

```sql
SELECT 
    n.id AS note_id,
    n.title,
    n.body,
    n.created_at,
    COALESCE(
        json_agg(
            json_build_object('id', t.id, 'name', t.name)
        ) FILTER (WHERE t.id IS NOT NULL), 
        '[]'
    ) AS tags
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 4821
GROUP BY n.id
ORDER BY n.created_at DESC
LIMIT 10;

```

### Query 3: Search notes by tag name
Searches notes for a specific tag name with optional full-text search on title/body:

```sql

SELECT n.id, n.title, n.created_at
FROM notes n
INNER JOIN note_tags nt ON n.id = nt.note_id
INNER JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 4821 
  AND t.name = 'architecture'
ORDER BY n.created_at DESC;

```

## 5. Indexing Strategy

```sql
-- 1. Index on notes (user_id, created_at DESC)
CREATE INDEX idx_notes_user_id_created_at ON notes(user_id, created_at DESC);

-- 2. Index on note_tags (tag_id, note_id)
CREATE INDEX idx_note_tags_tag_id_note_id ON note_tags(tag_id, note_id);

```

### Indexing Justification:
The index idx_notes_user_id_created_at optimizes the application's most frequent read query: listing a user's notes sorted chronologically. In a single-column index on user_id, PostgreSQL would find matching rows and then perform an expensive in-memory filesort to order by created_at. By creating a composite B-Tree index on (user_id, created_at DESC), the database performs an index seek directly to the user's records and reads them pre-sorted, reducing query execution time from $O(N \log N)$ to $O(\log N)$.

## 6. Architectural Decision: SQL vs NoSQL Justification
QuickNotes selects PostgreSQL (Relational SQL) over NoSQL for the following reasons:

1. **Relational Data Integrity:** QuickNotes has strong relational dependencies (users own notes, notes link to tags). SQL foreign key constraints (ON DELETE CASCADE) natively prevent orphan tag mappings and corrupted records without needing complicated application-level rollback code.
2. **ACID Transactions:** When a note is deleted or updated with newly assigned tags, the operation requires atomicity across both notes and note_tags. Relational ACID guarantees ensure database writes remain consistent even during network partitions or server crashes.
3. **Structured & Predictable Queries:** The data schema has strict boundaries (100-character titles, standard text bodies). Document stores like MongoDB offer schema flexibility that is unnecessary here, while introducing eventual consistency hazards and duplicated tag data across documents.
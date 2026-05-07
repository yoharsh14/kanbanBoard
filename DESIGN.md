# DESIGN.md — Kanban Board Architecture & Design Decisions

## 1. Conflict Resolution Strategy

### Core Philosophy
Rather than treating every simultaneous edit as a conflict, the system first tries to **dissolve conflicts by splitting task data into independent fields**. A task has two independently mutable concerns: its content (`title`, `description`) and its position (`column`, `orderKey`). Most real-world "conflicts" are two users touching different fields — these are merged silently with no user friction.

---

### Version Tracking
Every task carries an integer `version` field, incremented on every write. Clients always send their `baseVersion` (the version they last saw) with every mutation. The server compares this against the current DB version to detect staleness.

```
Client sends: { taskId, patch, baseVersion: 5 }
Server reads: current.version = 6
→ isConflict = baseVersion < current.version  (5 < 6 = true)
```

---

### Scenario 1: Concurrent Move + Edit (different fields)
**Strategy: Always merge — no conflict**

User A moves Task X to "Done" while User B edits Task X's title. These touch independent fields (`column`/`orderKey` vs `title`/`description`). Both are applied. The second writer receives `conflict: true` in the response but the change still goes through. All clients get the merged state via WebSocket broadcast.

```
A: column = "DONE"        → committed, version → 6
B: title = "New Title"    → applied on top, version → 7
Result: { column: "DONE", title: "New Title" }  ✅
```

---

### Scenario 2: Concurrent Move + Move (same field, true conflict)
**Strategy: First-write-wins with loser notification**

Both users move the same task to different columns. The first request to reach the server commits. The second detects a stale version on the same field (`column`) and still applies (using server-authoritative position), but responds with `conflict: true` and `stale: true`. The losing client receives the resolved state via WebSocket and its UI snaps back with a notification.

```
A: column = "IN_PROGRESS"  → arrives first, commits, version → 6
B: column = "DONE"         → arrives second, isStale = true
                           → move still applies with new orderKey
                           → B receives { conflict: true, updatedTask }
                           → UI shows: "Task was moved"
```

---

### Scenario 3: Concurrent Reorder
**Strategy: Fractional indexing makes this a non-issue**

Each task has an `orderKey` string. Moving a task only writes a new `orderKey` to one row — it never touches other tasks. Two simultaneous reorders are independent DB writes. The final display order is determined by lexicographic sort on `orderKey`.

---

### Offline Queue Replay
When a client reconnects after losing its WebSocket connection, it replays queued operations through the same conflict logic. Each operation carries its original `baseVersion`. The server applies what it can, rejects what it can't, and returns a summary. The client reconciles its local state against the authoritative server snapshot.

---

## 2. Ordering Approach

### Fractional Indexing
Tasks are ordered using **string-based fractional indexing** rather than integer positions. Each task has an `orderKey` (e.g., `"a"`, `"b"`, `"an"`, `"anm"`).

**Why not integer positions?**
Moving a task to position 3 in a list of 100 tasks would require updating 97 other rows — O(n) writes. With fractional indexing, only the moved task is updated — O(1) write, O(0) updates to neighbours.

**How it works:**

| Operation | Before | After | New Key |
|---|---|---|---|
| Append to column | `"a"` is last | — | `"b"` |
| Insert between | `"a"` and `"c"` | — | `"b"` |
| Insert between adjacent | `"a"` and `"b"` | — | `"an"` |
| Insert at top | — | `"a"` is first | `generateKeyBetween(null, "a")` |

Keys are sorted with plain lexicographic comparison (`localeCompare`), which is both frontend and DB safe (`ORDER BY orderKey ASC`).

**Key generation:**
- `generateNextKey(prev)` — generates the next key after `prev`
- `generateKeyBetween(before, after)` — generates a key lexicographically between `before` and `after`

The key space grows in length over time with repeated inserts in the same spot (e.g., `"anmmm..."`), but for typical Kanban usage this is not a practical concern. A rebalancing job could be run periodically if needed.

---

## 3. Real-Time Sync (WebSockets)

The server maintains a `Map<WebSocket, User>` of all connected clients. Every mutation (create, edit, move, delete) that succeeds is broadcast to all connected clients via `broadcast(event)`. Clients apply the broadcast to their local Zustand store.

**Message types:**
- `PRESENCE_UPDATE` — user join/leave
- `CURSOR_UPDATE` — live cursor positions
- `TASK_CREATED` / `TASK_UPDATED` / `TASK_MOVED` / `TASK_DELETED` — task mutations

**Presence:** Each client sends a `JOIN` message with their name on connect. The server tracks all connected users and broadcasts the full user list on every join/disconnect.

---

## 4. Optimistic UI

The client updates its local state **immediately** on user action, before the API call completes. If the API call fails, the client rolls back by re-fetching the authoritative state from the server (`getAllTasks()`). This gives instant feedback while maintaining eventual consistency.

---

## 5. Trade-offs

| Decision | Trade-off |
|---|---|
| First-write-wins for move conflicts | Simple and predictable, but the "losing" user gets a surprise snap-back. A UI notification mitigates this. |
| Allow edits through on version conflict | Avoids blocking users, but means you can't guarantee strict serialisability for content fields. Acceptable for a Kanban board. |
| String fractional indexing | Keys grow longer over time with repeated inserts in the same spot. Manageable for typical usage. |
| Single server WebSocket | Simple deployment, but not horizontally scalable. A Redis pub/sub layer would be needed for multi-instance deployments. |
| Soft deletes (`isDeleted`) | Keeps audit history but requires filtering on every query. A separate archive table would be cleaner at scale. |

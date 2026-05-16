---
name: memcore-ai
description: Persistent memory architecture for AI agents. Use when agents need to remember user preferences, conversation history, context across sessions, or long-term state. Solves the "amnesia problem" where agents forget everything between chats.
---

# MemCore AI - Persistent Memory Architecture for Agents

## Overview

MemCore AI provides a complete memory system for AI agents. Most agents suffer from **zero-turns memory** — they forget everything after each response. This skill implements hierarchical memory (working/short-term/long-term/episodic), vector-based semantic recall, and automated memory consolidation. When activated, agents using this skill will remember user context across sessions, recall relevant past conversations, and build persistent user profiles.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Agent forgets user preferences between sessions | Long-term memory stores preferences permanently |
| Agent can't reference past conversations | Episodic memory indexed for semantic search |
| Agent context window fills with irrelevant history | Working memory with automatic pruning |
| User has to re-explain everything each time | Persistent user profile auto-loads |
| No continuity between sub-agent tasks | Shared memory namespace across agents |

## Memory Architecture

```
User Input
    │
    ▼
┌──────────────────────┐
│  WORKING MEMORY      │  ← Current conversation (last ~10 turns)
│  (Ephemeral Buffer)  │
└──────┬───────────────┘
       │ After N turns or explicit save
       ▼
┌──────────────────────┐
│  SHORT-TERM MEMORY   │  ← Recent sessions (24h rolling window)
│  (Session Store)     │
└──────┬───────────────┘
       │ Periodic consolidation (every N sessions or daily cron)
       ▼
┌──────────────────────┐
│  LONG-TERM MEMORY    │  ← Persistent facts, preferences, knowledge
│  (Vector DB + KV)    │     (Never auto-deleted)
├──────────────────────┤
│  EPISODIC MEMORY     │  ← Past conversation summaries, decisions
│  (Semantic Search)   │     (Summarized, tagged, searchable)
├──────────────────────┤
│  USER PROFILE        │  ← Identity, preferences, history
│  (Structured JSON)   │     (Merge-updated each session)
└──────────────────────┘
```

## Memory Operations

### 1. Working Memory (Context Window)

Managed automatically within the current agent session. No tool calls needed.

**Capacity:** Last 10-20 conversational turns.
**Pruning strategy:** FIFO with priority tags (user can "pin" important facts).

### 2. Store a Memory

```markdown
To store an important fact:
1. Identify the fact type (preference | fact | decision | event)
2. Store with: `memcore store "The user prefers dark mode" --type preference`
3. System auto-tags with timestamp, session_id, confidence

For batch storage from vector embeddings:
`memcore store-batch facts.json --namespace user_123`
```

### 3. Recall Memories

```markdown
Explicit recall:
`memcore recall "user color preferences" --limit 5`

Semantic recall (auto-triggered on relevant queries):
Agent auto-searches episodic + long-term memory before responding
when the query matches stored memory signatures.

Recall modes:
- `memcore recall --recent` → Last 24h memories
- `memcore recall --important` → High-importance memories
- `memcore recall --namespace project_x` → Namespace-scoped
- `memcore recall "keyword" --fuzzy` → Approximate match
```

### 4. Consolidation (Automated)

Schedule via cron or trigger manually:

```markdown
Manual consolidation:
`memcore consolidate --namespace user_123`

Auto-consolidation triggers:
- Every 10 new short-term memories
- End of session (if >5 new facts)
- Daily cron job (configurable)

Consolidation does:
1. Summarizes similar memories into one high-level fact
2. Updates user profile with new preferences
3. Prunes redundant entries
4. Re-embeds episodic summaries for better recall
```

### 5. User Profile System

Auto-built profile structure:

```json
{
  "user_id": "u_abc123",
  "first_interaction": "2026-01-15T10:30:00Z",
  "preferences": {
    "tone": "professional",
    "detail_level": "high",
    "language": "en"
  },
  "known_facts": [
    {"fact": "Works in fintech", "confidence": 0.95},
    {"fact": "Uses Python/TypeScript", "confidence": 0.90}
  ],
  "projects": ["project_x", "api_v3"],
  "frequently_used_skills": ["pdf", "bigquery", "github"],
  "memory_count": 142,
  "last_session": "2026-03-04T17:00:00Z"
}
```

## Vector Memory Backend

Supports pluggable backends:

| Backend | Use Case | Setup |
|---------|----------|-------|
| **SQLite + sentence-transformers** | Local/offline | Zero config, auto-installs |
| **ChromaDB** | Multi-agent shared memory | `pip install chromadb` |
| **Upstash Vector** | Production, serverless | Set `UPSTASH_VECTOR_URL` |
| **Pinecone** | High-scale | Set `PINECONE_API_KEY` |

Default: Local SQLite with embeddings via `sentence-transformers/all-MiniLM-L6-v2`.

## Memory Namespace Strategy

```
┌─────────────────────────────────┐
│ memcore://                       │
│  ├── users/{user_id}/            │  ← Per-user
│  │    ├── preferences            │
│  │    ├── episodic               │
│  │    └── profile               │
│  ├── projects/{project_id}/     │  ← Per-project (shared)
│  │    ├── decisions              │
│  │    └── context               │
│  └── agents/{agent_id}/         │  ← Per-agent internal
│         ├── learnings            │
│         └── tool_history         │
└─────────────────────────────────┘
```

## Forgetting & Privacy

```markdown
Explicit forget:
`memcore forget "fact_id_123"`
`memcore forget --namespace user_123 --all`

Privacy wipe:
`memcore wipe user_123`  → Complete user deletion

Auto-expiry:
Configure TTL per memory type (default: never for long-term)
`memcore config set ttl.short_term 86400`  (24 hours)
```

## Quick Start (Agent Activation)

```markdown
To activate MemCore in your session:
1. Ensure `memcore` CLI is available (pip install memcore-ai)
2. Initialize: `memcore init --backend sqlite`
3. Start memory: `memcore watch` (runs background memory monitor)
4. The agent will automatically:
   - Recall relevant context before each response
   - Store important facts from the conversation
   - Update user profile
   - Consolidate memories periodically
```

## Scripts

### scripts/memcore.py
CLI entry point for all memory operations. Supports:
- `memcore store` - Store facts
- `memcore recall` - Recall memories  
- `memcore consolidate` - Run consolidation
- `memcore profile` - Manage user profiles
- `memcore wipe` - Privacy management
- `memcore config` - Configure memory backends

### scripts/vector_store.py
Vector embedding and search operations:
- Embed text chunks
- Semantic search
- Batch index building
- Embedding model management

## References

### references/memory_strategies.md
Deep guide on memory patterns: recency bias handling, importance scoring, conflict resolution when memories contradict each other.

### references/backends.md
Complete backend setup guides for SQLite, ChromaDB, Upstash, Pinecone with code examples and production tuning.

---

**Activation:** `memcore init && memcore watch`
**Deactivation:** `memcore stop`
**Status:** `memcore status`

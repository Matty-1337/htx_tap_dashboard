---
name: project-tech-stack
description: This is a new rule
---

# Overview

# Project Configuration & Tech Stack
- **Frontend:** Vercel
- **Backend/Services:** Railway
- **Database:** Supabase

# MCP & Tool Usage Rules (STRICT)
1.  **Sequential Thinking:** You MUST use the `sequential-thinking` MCP for all complex logic, planning, or debugging steps. Break problems down step-by-step before generating code.
2.  **Context Retrieval:** Always query the `context7` MCP first to understand the project history and previous decisions before answering.
3.  **Local Operations:** Use `desktop-commander` MCP when you need to execute local system commands or manage local files outside the editor's scope.

# Documentation Strategy
- **Reference Docs:** You are required to check the indexed `@Docs` for Railway, Supabase, and Vercel to ensure syntax is current.
- **Verification:** Do not guess API methods. If the code involves these services, verify against the known documentation rules.

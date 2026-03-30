---
name: flask-api-review
description: Reviews a Flask API for input validation, error handling consistency, security, and response schema alignment with the frontend. Use when auditing or hardening an API before release.
---

# Flask API Review Skill

When the user asks you to review a Flask API file, follow these steps:

## Step 1: Read all Relevant Files

Before reviewing, read:

1. The Flask app file (e.g., `app.py`)
2. The frontend JavaScript that calls the API (look in `static/` or `templates/`)
3. The engine/models layer to understand expected types
4. `PRD.md` if present — to verify the API enforces the correct business rules

## Step 2: Input Validation Checklist

For each `@app.route` endpoint, verify:

- [ ] **Presence check**: Required fields are checked with a default or early return if missing
- [ ] **Type check**: Numeric fields are cast safely — use `int()` inside `try/except`, not bare cast
- [ ] **Range check**: Numeric values are bounded according to PRD or business rules (e.g., slider range)
- [ ] **Empty list check**: List inputs should check for empty lists, not just `None`
- [ ] **String sanitization**: Text inputs are stripped of leading/trailing whitespace before processing

**Flag** any missing check as: `⚠️ INPUT VALIDATION MISSING: <field> – <reason>`

## Step 3: Error Handling Checklist

- [ ] **Module-level resource loading**: Check if any resources (JSON files, DB connections) are loaded at import/startup time (outside of route handlers). If so, verify they are wrapped in `try/except` — a startup failure will crash the entire app silently
- [ ] **Specific exceptions**: Is `except Exception as e` used as a catch-all? If so, flag it — prefer catching specific errors (e.g., `KeyError`, `ValueError`, `FileNotFoundError`)
- [ ] **Consistent error schema**: All error responses must return the same JSON shape across all endpoints
- [ ] **HTTP status codes**: Errors should return appropriate codes (400 for bad input, 500 for server error, 404 for not found)
- [ ] **No sensitive info leakage**: Error messages must not expose stack traces, file paths, or internal variable names to the client

**Flag** any inconsistency as: `⚠️ ERROR HANDLING: <endpoint or location> – <issue>`

## Step 4: Response Schema Alignment

Read the frontend JavaScript and list every field it accesses from the API response. Then verify each field is actually returned by the API.

Build a comparison table using the **actual fields from the frontend code**:

| Field path (frontend access) | API returns | Match? |
|------------------------------|-------------|--------|
| `data.error` | `response["error"]` | ✅ / ⚠️ |
| `data.recipes[i].<field>` | `formatted_recipes[i]["<field>"]` | ✅ / ⚠️ |
| `data.fallback.message` | `response["fallback"]["message"]` | ✅ / ⚠️ |

> Always derive the field list by reading the JS file — do NOT assume based on examples.

**Flag** any mismatch as: `⚠️ SCHEMA MISMATCH: <field> – <details>`

## Step 5: Security Checklist

- [ ] **CORS**: Is `flask-cors` configured? If the API will be called from a different origin, CORS headers are required
- [ ] **Rate limiting**: Is there any protection against abuse (e.g., `flask-limiter`)? Flag if absent for production
- [ ] **Debug mode**: `app.run(debug=True)` must NOT be used in production — flag if hardcoded without environment check
- [ ] **Secret key**: If sessions or cookies are used, `app.secret_key` must not be hardcoded in source
- [ ] **File path safety**: Any user-supplied path input must be validated against path traversal attacks

**Flag** any issue as: `⚠️ SECURITY: <issue> – <recommendation>`

## Step 6: PRD Business Rule Enforcement

Read the PRD and extract all rules that must be enforced at the API layer. Then verify each one:

| PRD Rule | Where it should be enforced | Currently enforced? |
|----------|-----------------------------|---------------------|
| (derive from PRD) | `app.py` / engine layer | ✅ / ⚠️ |

> Always derive the rule list by reading the PRD — do NOT assume based on examples.

## Step 7: Produce Review Report

Write a concise report with these sections:

### ✅ Strengths

- What is already well-implemented

### ⚠️ Issues Found

Grouped by category (Input Validation / Error Handling / Schema / Security / PRD Enforcement), with severity:

- 🔴 **Critical** — Must fix before any production use
- 🟡 **Warning** — Should fix; risk of bugs or bad UX
- 🟢 **Suggestion** — Nice to have improvement

### 🛠️ Recommended Actions

Specific, actionable code changes with examples where possible.

## Rules

- Read the frontend JS before concluding on schema mismatches — do NOT assume field names
- Read the PRD before concluding on business rule enforcement — do NOT hardcode rule lists
- Do NOT refactor code during this review; only report findings
- Keep the report concise — use tables and bullet points, avoid long prose
- If the API calls `app.run(debug=True)` with no environment check, always flag as 🔴 Critical

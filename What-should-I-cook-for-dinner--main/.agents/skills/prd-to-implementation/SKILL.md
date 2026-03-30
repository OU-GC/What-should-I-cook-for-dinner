---
name: prd-to-implementation
description: Reads a PRD document and produces a structured implementation_plan.md and task.md. Use when starting to implement a new feature or product from a requirements document.
---

# PRD to Implementation Skill

When the user asks you to plan implementation from a PRD, follow these steps:

## Step 1: Parse the PRD

Read the PRD file and extract the following sections:

- **Product Name & Version**: 產品名稱、文件版本
- **Functional Requirements (功能需求)**: Every numbered section under `## 7. 功能需求` or equivalent
- **Business Rules (業務規則)**: Logic flows, filtering pipelines, scoring formulas
- **Acceptance Criteria (驗收標準)**: Every AC item with its Given / When / Then structure — list them all explicitly
- **Edge Cases (邊界情境)**: Every numbered item under `## 11.` or equivalent
- **Out of Scope**: Items explicitly excluded from this version

## Step 2: Identify Implementation Components

Group requirements into implementation layers:

1. **Data Layer** – models, schemas, data loading & validation
2. **Engine / Logic Layer** – core business logic, filtering, scoring, sorting
3. **Interface Layer** – API endpoints, request/response formatting
4. **Frontend Layer** – UI components, user interactions _(include only if the PRD describes UI/UX requirements or mentions a web/app interface)_
5. **Test Layer** – unit tests per AC, edge case tests per boundary condition

## Step 3: Write `implementation_plan.md`

Create or update `implementation_plan.md` (in the artifact directory) with:

- A brief description of what you are building
- A `## Proposed Changes` section grouping files by component, using `[NEW]`, `[MODIFY]`, `[DELETE]` markers
- A `## Verification Plan` section that maps each AC to an automated test command and each edge case to a test scenario

> **Rule**: Every AC in the PRD must have a corresponding test case named `test_ac{N}_*` in the verification plan.

## Step 4: Write `task.md`

Create or update `task.md` (in the artifact directory) with a checklist:

```
## Implementation Tasks

### Data Layer
- [ ] Define models (e.g., Recipe, User)
- [ ] Implement data loading and validation

### Engine / Logic Layer
- [ ] Implement [feature from FR 7.x]
- [ ] Implement [feature from FR 7.y]

### Interface Layer
- [ ] Implement API endpoint /recommend
- [ ] Format response according to UI spec

### Frontend Layer  ← include only if PRD has UI requirements
- [ ] ...

### Test Layer
- [ ] test_ac1_* — [AC1 description]
- [ ] test_ac2_* — [AC2 description]
- [ ] test_ac3_* — [AC3 description]
- [ ] Edge case: [11.1 description]
- [ ] Edge case: [11.2 description]
```

## Step 5: Confirm Before Executing

After producing both documents, call `notify_user` to present the plan and ask for approval before writing any actual code.

## Rules

- Do NOT skip any AC — every acceptance criterion must appear in the verification plan
- Do NOT plan features listed in "Out of Scope"
- Do NOT include a Frontend Layer unless the PRD explicitly describes UI/UX or a user-facing interface
- If an AC has no corresponding code path yet, flag it as `[MISSING IMPLEMENTATION]` in the plan
- Use the same naming conventions as the existing codebase (e.g., snake_case for Python)

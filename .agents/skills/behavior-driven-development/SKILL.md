---
name: behavior-driven-development
description: Apply Behavior-Driven Development (BDD) methodology with a System Analyst/Product Manager mindset. Trigger this skill when breaking down requirements, drafting .feature files, or defining acceptance criteria. Use to align scenarios with the user BEFORE writing any implementation code.
---

# Behavior-Driven Development (BDD)

This skill guides the AI Agent to act with a Systems Analyst / Product Manager / Architect mindset. Your primary goal is to align with the user on business logic and expected behaviors *before* writing any code.

## The 5-Stage BDD Process

Strictly follow these 5 stages when processing new requirements:

### 1. Discovery (需求探索)
Ask clarifying questions to uncover the feature's core goal, target user, and expected business value. Do not make assumptions about missing requirements.

### 2. Scenario Definition (情境定義)
Map out high-level scenarios using "Given-When-Then" (Gherkin) syntax. Describe the context, action, and outcome.

### 3. Example List (範例列表)
Generate concrete examples for each scenario to eliminate ambiguity. Use real-world, domain-specific data inputs and expected outputs.

### 4. Acceptance Criteria Check (驗收標準勾選)
Translate scenarios into an explicit checklist. Require user confirmation that satisfying this checklist equals completing the requirement.

### 5. Workflow Integration (工作流整合)
Sync the approved `.feature` file or acceptance criteria into the active task tracking (e.g., `task.md` or `implementation_plan.md`). Only transition from planning to execution after user approval.

## Writing Best Practices

When drafting `.feature` files, scenarios, or acceptance criteria:

- **Adopt the User's Perspective:** Focus entirely on the human user's context and goals.
- **Strictly NO Technical Language:** Ban technical implementation details in the scenarios. Do NOT use terms like "SQL table", "API response", "React state", or "JSON". Use domain language (e.g., "The customer's cart" instead of "The Vuex store array").
- **Mandatory Path Coverage:** Ensure every requirement covers both the **Happy Path** (ideal flow) and **Edge Cases** (invalid inputs, network failures, boundary conditions).

## Agent Workflow: Align Before Implementation

When assigned to a new feature, execute this workflow explicitly:

1. **Stop execution:** Do not write code.
2. **Draft scenarios:** Generate the BDD scenarios following the 5-Stage Process.
3. **Align with the user:** Present the `.feature` content and ask: *"Please review these scenarios and edge cases. Shall we adjust any behaviors before I begin implementation?"*
4. **Implement:** Write code ONLY to satisfy the approved scenarios.

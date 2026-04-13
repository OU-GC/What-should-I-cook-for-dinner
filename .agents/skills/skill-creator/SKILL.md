---
name: skill-creator
description: Create or update AgentSkills. Trigger this skill when the user asks to "create a new skill", "modify an existing skill", or needs help following skill design best practices. Use when designing, structuring, or packaging skills with scripts, references, and assets.
---

# Skill Creator

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend the AI Agent's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks—they transform the AI Agent from a general-purpose assistant into a specialized agent equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Skills share the context window with everything else the AI Agent needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**Default assumption: The AI Agent is already very smart.** Only add context it doesn't already have. Challenge each piece of information: "Does the AI Agent really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

Think of the AI Agent as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources. *(Note: For a detailed breakdown of all files, refer to standard skill creation guidelines).*

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)

- **Frontmatter** (YAML): Contains `name` and `description` fields. These are the only fields that the AI Agent reads to determine when the skill gets used, thus it is very important to be clear and comprehensive in describing what the skill is, and when it should be used.
- **Body** (Markdown): Instructions and guidance for using the skill. Only loaded AFTER the skill triggers (if at all).

#### What to Not Include in a Skill

A skill should only contain essential files that directly support its functionality. Do NOT create extraneous documentation or auxiliary files, including:

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md

The skill should only contain the information needed for an AI agent to do the job at hand. Keep it clutter-free.

### Progressive Disclosure Design Principle

Skills use a three-level loading system to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by the AI Agent (Unlimited because scripts can be executed without reading into context window)

**Key principle:** Keep SKILL.md body to the essentials. When a skill supports multiple variations, frameworks, or options, keep only the core workflow and selection guidance in SKILL.md. Move variant-specific details into separate `references/` files. Link these reference files explicitly so the AI Agent knows when to load them.

## Skill Creation Process

Follow these steps in order when the user asks you to create or modify a skill:

### Step 1: Understanding the Skill with Concrete Examples

Ask the user for concrete examples of how the skill will be used or what exactly it needs to accomplish. 

* **Agent Instruction:** To avoid overwhelming users, provide a draft or prototype of the skill concept early on, instead of asking for every detail upfront in a single message. Iterate based on their feedback. Conclude this step when there is a clear sense of functionality.

### Step 2: Planning the Reusable Skill Contents

Analyze the concrete examples to create a list of reusable resources:
1. **scripts/**: For logic requiring deterministic reliability (e.g., `rotate_pdf.py`).
2. **references/**: For contextual documentation (e.g., schemas, API docs).
3. **assets/**: Web templates, boilerplate, static files mapping to the project.

### Step 3: Initializing the Skill

**Agent Instruction:** Use your command execution tool (e.g., `run_command`) to run the initialization script. Make sure you use the correct absolute path to the `skill-creator` root, or navigate to it first.

Usage:
```bash
[absolute/path/to/skill-creator]/scripts/init_skill.py <skill-name> --path <output-directory> [--resources scripts,references,assets] [--examples]
```

### Step 4: Edit the Skill

**Agent Instruction:** Do the actual coding and writing now.
- Draft the `SKILL.md` body using imperative/infinitive form.
- Add and test all necessary resources (`scripts/`, `references/`, `assets/`). 
- **Important**: Any added scripts must be tested by actually running them via your terminal tools to ensure there are no bugs.

### Step 5: Packaging a Skill

Once development of the skill is complete, it must be packaged into a distributable .skill file. 

**Agent Instruction:** Run the package script using the correct absolute path:
```bash
[absolute/path/to/skill-creator]/scripts/package_skill.py <path/to/skill-folder>
```

**Self-Correction Rule:** 
If the validation fails to package the skill, **do not immediately ask the user for help**. Read the error output from the terminal carefully, autonomously fix the identified formatting issues or missing fields in `SKILL.md` or directory structure, and re-run the `package_skill.py` command until it succeeds.

### Step 6: Iterate

**Agent Instruction:** Encourage the user to test the newly created skill. If they encounter inefficiencies or bugs, repeat Step 4 and Step 5 to refine and repackage the skill.

---
name: behave-bdd
description: Implement Behavior-Driven Development (BDD) using Python's behave library. Trigger this skill when writing automation tests for .feature files, implementing steps with @given/@when/@then, or executing behave tests in the terminal.
---

# Behave BDD Implementation

This skill equips the AI Agent with an Automation Test Engineer / Backend Engineer mindset, focusing on implementing Python BDD using the `behave` library.

## Directory Structure Restrictions

For `behave` to function correctly, you must **MAXIMIZE STRICTNESS** regarding the directory structure. Adhere strictly to the following layout:

```text
features/
├── *.feature             # Natural language BDD scenarios
├── environment.py        # Environment control (setup/teardown hooks)
└── steps/
    └── *_steps.py        # Python implementations of the steps
```

Do NOT spread `.feature` files or `steps` across random project folders. All BDD structures must reside under a dedicated `features/` directory in the root.

## Development & Implementation Flow

Bridging `.feature` files to Python code relies on decorators and the context object.

### Step Implementation
Use the `@given`, `@when`, and `@then` decorators from `behave` to link natural English sentences to executable Python functions.

```python
from behave import given, when, then

@given('the user is on the login page')
def step_impl(context):
    ...
```

### State Management via `context`
Use the `context` object to pass state seamlessly between steps without relying on global variables.

```python
@given('a user named "{name}"')
def step_given_user(context, name):
    context.user_name = name

@then('the user should see their dashboard')
def step_then_dashboard(context):
    assert getattr(context, 'user_name', None) is not None
```

## Test-Driven Execution (Mandatory)

This is a Test-Driven methodology. You are **REQUIRED** to execute the tests in the terminal to verify outcomes.

Whenever you implement or update `steps` or `.feature` files:
1. Open the terminal using the `run_command` tool.
2. Run `behave` (or `python -m behave`).
3. Read the output. If a step fails, has an error, or is undefined, fix the underlying code immediately and re-run. Do NOT assume the code works without terminal validation.

## Bundled Resources

This skill includes bundled examples and references. Do NOT recreate logic blindly from scratch; rely on the provided resources:

- **Reference Guide:** Load and refer to `references/python_steps.md` if you need detailed examples on how to parse step arguments (strings, integers) or handle tabular data.
- **Feature Boilerplate:** Check the `assets/features/` directory for `.feature` boilerplate configurations that you can copy directly into the user's project.

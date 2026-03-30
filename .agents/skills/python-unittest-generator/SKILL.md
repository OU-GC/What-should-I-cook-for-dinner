---
name: python-unittest-generator
description: Generates Python unittest test cases for a given module. Covers normal cases, boundary values, and exception handling. Use when adding tests for a new or untested module.
---

# Python Unittest Generator Skill

When the user asks you to generate unit tests for a Python module, follow these steps:

## Step 0: Check Existing Tests

Before writing any tests, look for an existing `tests/` directory:

- If test files exist, read them first to understand what is already covered
- Do NOT duplicate existing tests — only add missing scenarios
- Note the existing fixtures, class naming, and assertion style so new tests remain consistent

## Step 1: Read the Target Module

Read the specified Python file and identify:

- All **classes** and their **public methods**
- Each method's **input parameters** (types, constraints)
- Each method's **return value** (type, shape)
- Any **side effects** (file I/O, state mutations)
- Existing **docstrings or comments** that describe expected behavior

## Step 2: Identify Test Scenarios

For each public method, plan test cases across three dimensions:

### 2a. Normal Cases (正常情境)

- Typical valid inputs that should produce the expected output
- Example: a list with two matched ingredients returns correct missing count

### 2b. Boundary / Edge Cases (邊界情境)

- Empty lists / empty strings
- Single-element inputs
- All items matching vs. no items matching
- Maximum and minimum numeric values
- Inputs with full-width / half-width characters (for Chinese text processing)
- Synonym substitution inputs

### 2c. Exception / Invalid Cases (例外情境)

- `None` inputs where a list or string is expected
- Wrong types (e.g., passing a string instead of a list)
- Missing required keys in a dictionary
- Empty input that should trigger an early-return error message

## Step 3: Write the Tests

Follow these conventions matching the existing project style:

```python
import unittest
from engine.<module> import <ClassName>

# Define shared fixtures at module level
MOCK_CONFIG = { ... }

class Test<ClassName>(unittest.TestCase):

    def setUp(self):
        # Initialize the class under test
        self.<instance> = <ClassName>(...)

    def test_<method>_<scenario>(self):
        # Arrange
        ...
        # Act
        result = self.<instance>.<method>(...)
        # Assert
        self.assertEqual(result, expected)

if __name__ == '__main__':
    unittest.main()
```

### Naming Convention

- File: `tests/test_<module_name>.py`
- Class: `Test<ClassName>`
- Method: `test_<method_name>_<scenario_description>`
  - Example: `test_get_missing_ingredients_all_condiments`
  - Example: `test_normalize_full_width_input`
  - Example: `test_validate_recipe_missing_recipe_id`

## Step 4: Cross-reference with PRD Acceptance Criteria

If a `PRD.md` exists in the project:

1. Read the PRD and extract **all AC items** (search for "AC", "驗收標準", "Given / When / Then")
2. For each AC, identify the corresponding method(s) to test
3. Map each AC to at least one test method and annotate with a comment (e.g., `# PRD AC1`)
4. For each edge case / boundary section (e.g., "11.x 邊界情境"), do the same

> **Do NOT hardcode AC names** — always derive them fresh from the PRD to stay in sync with any future PRD changes.

## Step 5: Report Coverage

After writing the tests, list:

| Method | Scenarios Covered | PRD Ref |
|--------|------------------|---------|
| `<method_name>` | normal, edge, exception | AC1 / 11.x |
| ... | ... | ... |

## Rules

- Do NOT use `mock` unless the method has unavoidable external dependencies (file I/O, network)
- Keep fixtures declared at module level so all test classes can reuse them
- Each `test_*` method must have exactly one logical assertion focus (single responsibility)
- Run tests with: `python -m pytest tests/ -v` or `python -m unittest discover tests/`

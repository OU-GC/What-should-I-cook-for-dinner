# Python Steps Reference (Behave)

When writing step definitions in Behave, refer to these common patterns instead of guessing the syntax.

## Parsing variables
You can extract values from step strings directly.

```python
from behave import given

@given('we have {count:d} active users')
def step_impl(context, count):
    # :d automatically parses the count as an integer
    context.user_count = count

@when('a user "{name}" logs in')
def step_impl(context, name):
    # string extraction by default
    context.current_user = name
```

## Using Tables
If the `.feature` file contains a data table, parse it using `context.table`.

**Feature file:**
```gherkin
Given the following users exist:
  | name | email          |
  | John | john@test.com  |
  | Jane | jane@test.com  |
```

**Python Step:**
```python
@given('the following users exist')
def step_impl(context):
    context.users = []
    for row in context.table:
        context.users.append({
            'name': row['name'],
            'email': row['email']
        })
```

## Using Multi-line Text (DocStrings)
Use `context.text` to access multi-line strings.

```python
@given('the user writes the following comment')
def step_impl(context):
    print(context.text) # Prints the docstring block
```

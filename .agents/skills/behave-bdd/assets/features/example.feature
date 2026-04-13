Feature: Basic System Functionality Example
  As a user
  I want to interact with the system
  So that I can achieve a business goal

  Scenario: Core happy path flow
    Given the application is running
    When the user submits valid configuration
    Then the system should process it successfully
    And no errors should be logged

  Scenario Outline: Validating multiple inputs
    Given the following user exists: "<user_type>"
    When the user accesses the dashboard
    Then the response code should be <status_code>

    Examples:
      | user_type | status_code |
      | admin     | 200         |
      | guest     | 403         |

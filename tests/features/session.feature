Feature: Odoo sessions
  As a tester of an Odoo site
  I want to log in as the users of the registry and log out again
  So that every scenario runs as the right user without a password in a feature file

  Scenario: An internal user logs in and lands in the web client
    Given I am a logged in user with the "admin" user
    Then I should be logged in
    And I should be logged in as "admin"
    And I should be logged in as "Mitchell Admin"
    And I should be in the web client
    And I should not be in the portal

  Scenario: A portal user logs in and lands in the portal
    Given I am a logged in user with the "portal" user
    Then I should be logged in as "portal"
    And I should be in the portal
    And I should not be in the web client

  Scenario: An internal user logs out from the user menu of the web client
    Given I am a logged in user with the "salesperson" user
    Then I should see "My Profile" in the user menu
    And I should see "Log out" in the user menu
    When I log out
    Then I should not be logged in
    And I should see the login form

  Scenario: A portal user logs out from the user menu of the website
    Given I am a logged in user with the "portal" user
    Then I should see "My Account" in the user menu
    When I log out
    Then I should not be logged in

  Scenario: The user menu opens the profile of the user
    Given I am a logged in user with the "employee" user
    When I choose "My Profile" in the user menu
    Then I should see "Change My Preferences"

  Scenario: A visitor holds no session
    Given I am not logged in
    Then I should not be logged in
    And I should not be logged in as "admin"
    And I should not be in the web client

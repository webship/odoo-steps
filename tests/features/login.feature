Feature: Odoo login
  As an anonymous visitor
  I want the Odoo login screen to render correctly
  So that I know authentication is available on this site

  Scenario: The login screen exposes login, password and submit
    Given I am on the login page
     Then I should see the login form
      And the response status code should be 200

  @critical
  Scenario: The administrator account can log in to the backend
    Given I am a logged in user with the "admin" user
     Then the path should be "/web"

  Scenario: An invalid login shows an authentication error
    Given I am on the login page
     When I log in as "not-a-real-user@example.com" with password "wrong-password"
     Then I should see an login error

  # Credentials come from worldParameters.users in cucumber.js (overridable
  # with ODOO_ADMIN_USER / ODOO_ADMIN_PASSWORD), so no password appears here.
  Scenario: A configured user starts an authenticated session and can end it
    Given I am a logged in user with the "admin" user
    Then the path should not be "/web/login"
    When I am not logged in
    Then I should see the login form

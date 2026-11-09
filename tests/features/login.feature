Feature: Odoo login
  As an anonymous visitor
  I want the Odoo login screen to render correctly
  So that I know authentication is available on this site

  Scenario: The login screen exposes login, password and submit
    Given I am on the Odoo login page
     Then I should see the Odoo login form
      And the response status code should be 200

  @critical
  Scenario: The administrator account can log in to the backend
    Given I am on the Odoo login page
     When I log in to Odoo as "admin" with password "admin"
     Then I should be on "/web"

  Scenario: An invalid login shows an authentication error
    Given I am on the Odoo login page
     When I log in to Odoo as "not-a-real-user@example.com" with password "wrong-password"
     Then I should see an Odoo login error

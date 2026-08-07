Feature: Odoo authentication
  As the owner of an Odoo site
  I want the sign-in screen to admit valid accounts and only those
  So that the backend stays closed to everyone else

  Scenario: The sign-in screen asks for credentials and pre-fills nothing
    Given I am on "/web/login"
     Then the response status code should be 200
      And I should see the Odoo login form
      And the field "#password" should be empty

  @critical
  Scenario: A valid account reaches the backend
    Given I am on "/web/login"
     When I log in to Odoo as "admin" with password "admin"
     Then I should be on "/web"

  Scenario: A wrong password is rejected and the visitor stays on the sign-in screen
    Given I am on "/web/login"
     When I log in to Odoo as "admin" with password "wrong-password"
     Then I should see an Odoo login error
      And the path should be "/web/login"

  Scenario: A private portal page sends an anonymous visitor to sign in and remembers where they were headed
    Given I am an anonymous user
      And I am on "/my/account"
     Then the path should be "/web/login"
      And current url should have the "redirect" parameter
      And I should see the Odoo login form

  Scenario: Signing out ends the session
    Given I am on "/web/login"
     When I log in to Odoo as "admin" with password "admin"
      And I am on "/web/session/logout"
      And I am on "/my/account"
     Then I should see the Odoo login form

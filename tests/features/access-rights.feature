Feature: Odoo access rights
  As a tester of an Odoo site
  I want to check what each kind of user can open
  So that a missing group keeps an app, a menu and a record out of reach

  Scenario: A salesperson sees Sales and CRM, not Invoicing
    Given I am a logged in user with the "salesperson" user
    Then I should see the "Sales" app
    And I should see the "CRM" app
    And I should not see the "Invoicing" app
    And I should not see the "Settings" app

  Scenario: An accountant sees Invoicing, not Sales
    Given I am a logged in user with the "accountant" user
    Then I should see the "Invoicing" app
    And I should not see the "Sales" app
    And I should not see the "CRM" app

  Scenario: An employee without the Sales group is refused the quotations
    Given I am a logged in user with the "employee" user
    Then I should not see the "Sales" app
    When I open the "sale.action_quotations_with_onboarding" action
    Then I should see an access error
    And I should see an access error "You are not allowed to access"
    And I should see the "Access Error" dialog
    When I close the dialog
    Then I should not see an access error

  Scenario: A salesperson opens the quotations without an access error
    Given I am a logged in user with the "salesperson" user
    When I open the "sale.action_quotations_with_onboarding" action
    Then I should not see an access error
    And I should see the list view
    And I should not see the "Configuration" menu

  Scenario: A salesperson has no delete action on a contact
    Given I am a logged in user with the "salesperson" user
    When I open the "contacts.action_contacts" action
    And I search the records for "Azure Interior"
    And I open the "Azure Interior" record
    Then I should see the form view
    And I should not see the "Accounting" tab

  Scenario: A portal user never reaches the web client
    Given I am a logged in user with the "portal" user
    When I go to "/web"
    Then I should be in the portal
    And I should not be in the web client

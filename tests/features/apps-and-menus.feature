Feature: Odoo apps and menus
  As a tester of an Odoo site
  I want to open an app, walk its menus and read the breadcrumb
  So that a scenario reaches a screen the way a user does

  Background:
    Given I am a logged in user with the "admin" user

  @critical
  Scenario: The apps menu lists the installed apps
    Then I should see the "Contacts" app
    And I should see the "CRM" app
    And I should see the "Sales" app
    And I should see the "Invoicing" app
    And I should see the "Website" app
    And I should not see the "Inventory" app

  Scenario: Opening an app shows its first screen
    When I open the "CRM" app
    Then I should be in the "CRM" app
    And I should not be in the "Discuss" app
    And the breadcrumb title should be "Pipeline"
    And I should see the kanban view

  Scenario: A menu path opens a screen of the app
    When I open the "Sales" app
    And I open the "Orders > Customers" menu
    Then the breadcrumb title should be "Customers"
    And I should see the "Orders" menu
    And I should see the "Configuration > Sales Teams" menu
    And I should not see the "Payroll" menu

  Scenario: An action opens by its external ID
    When I open the "contacts.action_contacts" action
    Then I should be in the "Contacts" app
    And the breadcrumb title should be "Contacts"

  Scenario: The breadcrumb leads back to the list
    When I open the "crm.crm_lead_action_pipeline" action
    And I open the "Quote for 600 Chairs" record
    Then the breadcrumb title should be "Quote for 600 Chairs"
    And I should see "Pipeline" in the breadcrumb
    When I go back to "Pipeline" in the breadcrumb
    Then the breadcrumb title should be "Pipeline"
    And I should not see "Quote for 600 Chairs" in the breadcrumb

  Scenario: The view switcher changes the view
    When I open the "crm.crm_lead_action_pipeline" action
    Then I should see the kanban view
    When I switch to the list view
    Then I should see the list view
    And I should not see the kanban view
    When I switch to the "kanban" view
    Then I should see the kanban view

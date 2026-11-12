Feature: Odoo CRM pipeline
  As a tester of an Odoo site
  I want to create an opportunity and move it through its stages
  So that quick creation, the status bar, a date, a priority and the chatter are covered

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "CRM" app

  Scenario: An opportunity is created from the kanban view and moved through its stages
    When I create a new record
    And I set the "Opportunity" field to "Webship review opportunity"
    And I set the "Organization / Contact" field to "Acme Corporation"
    And I click the "Add" button in the form
    Then I should see the "Webship review opportunity" card in the "New" column
    When I open the "Webship review opportunity" record
    Then the stage should be "New"
    And the "Customer" field should show "Acme Corporation"
    When I set the stage to "Proposition"
    Then the stage should be "Proposition"
    And the stage should not be "New"
    When I set the "Expected Closing" field to "06/30/2031"
    And I set the "priority" field to "High"
    And I save the record
    Then the "Expected Closing" field should be "06/30/2031"
    And the "priority" field should be "High"
    And I should see "Proposition" in the chatter
    When I send the message "The proposal is on its way"
    Then I should see "The proposal is on its way" in the chatter
    When I go back to "Pipeline" in the breadcrumb
    Then I should see the "Webship review opportunity" card in the "Proposition" column
    When I open the "Webship review opportunity" record
    And I choose "Delete" in the Actions menu
    And I confirm the dialog
    And I open the "crm.crm_lead_action_pipeline" action
    Then I should not see the "Webship review opportunity" record

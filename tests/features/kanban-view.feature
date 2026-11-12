Feature: Odoo kanban view
  As a tester of an Odoo site
  I want to read the columns and cards of a kanban view and move a card
  So that a scenario follows a record through its stages

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "crm.crm_lead_action_pipeline" action

  Scenario: The pipeline shows its stages as columns
    Then I should see the kanban view
    And I should see the "New" column
    And I should see the "Qualified" column
    And I should see the "Proposition" column
    And I should see the "Won" column
    And I should not see the "Archived" column

  Scenario: A card sits in the column of its stage
    Then I should see the "Quote for 600 Chairs" card in the "Qualified" column
    And I should not see the "Quote for 600 Chairs" card in the "Won" column

  Scenario: A card opens the record
    When I open the "Quote for 600 Chairs" record
    Then I should see the form view
    And the breadcrumb title should be "Quote for 600 Chairs"

  Scenario: Dragging a card to another column changes its stage
    When I drag the "Quote for 600 Chairs" card to the "Proposition" column
    Then I should see the "Quote for 600 Chairs" card in the "Proposition" column
    And I should not see the "Quote for 600 Chairs" card in the "Qualified" column
    When I move the "Quote for 600 Chairs" card to the "Qualified" column
    Then I should see the "Quote for 600 Chairs" card in the "Qualified" column

  Scenario: Searching the kanban view narrows the cards
    When I search the records for "Chairs"
    Then I should see the "Quote for 600 Chairs" record
    And I should not see the "Info about services" record
    And the "Qualified" column should have 1 card

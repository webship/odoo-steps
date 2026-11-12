Feature: Odoo list view
  As a tester of an Odoo site
  I want to read, select and open the records of a list view
  So that a scenario works on the records a user sees

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "sale.action_orders" action

  Scenario: The list shows the records and the pager counts them
    Then I should see the list view
    And I should see the "S00007" record
    And the pager should not read "1-80 / 80"

  Scenario: A record opens in its form view and the pager walks the records
    When I search the records for "Gemini Furniture" in "Customer"
    And I open the "S00007" record
    Then I should see the form view
    And the breadcrumb title should be "S00007"
    When I go to the next record
    Then the breadcrumb title should not be "S00007"
    When I go to the previous record
    Then the breadcrumb title should be "S00007"

  Scenario: Records are selected with their checkbox
    When I select the "S00007" record
    Then I should see 1 selected record
    When I select the "S00004" record
    Then I should see 2 selected records
    When I unselect the "S00007" record
    Then I should see 1 selected record
    When I unselect the "S00004" record
    Then I should see 0 selected records

  Scenario: The header checkbox selects the page
    When I search the records for "Gemini Furniture" in "Customer"
    And I select all records
    Then "div.o_list_selection_box" should contain text "selected"

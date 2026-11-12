Feature: Odoo search view
  As a tester of an Odoo site
  I want to search, filter and group the records of a view
  So that a scenario finds its records the way a user does

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "sale.action_orders" action

  Scenario: Searching narrows the list to the matching records
    When I search the records for "S00007"
    Then I should see the "S00007" search facet
    And I should see 1 record
    And I should see the "S00007" record
    And I should not see the "S00004" record

  Scenario: Searching in a named field uses that field
    When I search the records for "Lumber Inc" in "Customer"
    Then I should see the "Lumber Inc" search facet
    And I should see the "Lumber Inc" record
    And I should not see the "Gemini Furniture" record

  Scenario: A search with no match shows no records
    When I search the records for "no-such-order-reference"
    Then I should see no records

  Scenario: A facet can be removed and the search cleared
    When I search the records for "S00007"
    And I remove the "S00007" search facet
    Then I should not see the "S00007" search facet
    And I should see the "S00004" record
    When I search the records for "S00004"
    And I clear the search
    Then I should not see the "S00004" search facet
    And I should see the "S00007" record

  Scenario: A filter of the search options is a toggle
    When I filter the records by "To Invoice"
    Then I should see the "To Invoice" search facet
    When I toggle the "To Invoice" filter
    Then I should not see the "To Invoice" search facet

  Scenario: Grouping shows one group per value
    When I group the records by "Customer"
    Then I should see the "Customer" search facet
    And I should see the "Gemini Furniture" group
    And I should not see the "No Such Customer" group
    When I open the "Gemini Furniture" group
    Then I should see the "S00007" record
    When I close the "Gemini Furniture" group
    Then I should not see the "S00007" record

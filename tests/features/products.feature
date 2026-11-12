Feature: Odoo product form
  As a tester of an Odoo site
  I want to fill a checkbox, a selection and a number on a form
  So that every kind of field is covered by a step

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "sale.product_template_action" action

  Scenario: A product is created with a checkbox, a selection and a price
    When I create a new record
    And I set the "Product Name" field to "Webship Review Service"
    Then the "Can be Sold" field should be checked
    When I uncheck the "Can be Purchased" field
    Then the "Can be Purchased" field should be unchecked
    And the "Can be Purchased" field should not be checked
    When I check the "Can be Purchased" field
    Then the "Can be Purchased" field should be checked
    When I set the "Can be Purchased" field to "no"
    Then the "Can be Purchased" field should be "no"
    When I set the "Product Type" field to "Service"
    And I set the "Sales Price" field to "125.50"
    And I save the record
    Then the breadcrumb title should be "Webship Review Service"
    And the "Product Type" field should be "Service"
    And the "Product Type" field should not be "Consumable"
    And the "Sales Price" field should show "125.50"
    When I choose "Delete" in the Actions menu
    And I confirm the dialog
    Then the breadcrumb title should be "Products"

  Scenario: A selection refuses a value it does not offer
    When I create a new record
    And I set the "Product Type" field to "Consumable"
    Then the "Product Type" field should be "Consumable"
    When I discard the changes
    Then the breadcrumb title should be "Products"

Feature: Odoo sales quotation
  As a tester of an Odoo site
  I want to take a quotation from its creation to a confirmed order and cancel it
  So that the form, its buttons, its status bar, its dialogs and its chatter are covered

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "Sales" app

  Scenario: A quotation is created, confirmed and cancelled
    When I open the "Orders > Quotations" menu
    And I create a new record
    Then the breadcrumb title should be "New"
    And the status should be "Quotation"
    And the "Customer" field should be required
    When I set the "Customer" field to "Azure Interior"
    And I set the "Expiration" field to "12/31/2030"
    And I set the "Payment Terms" field to "30 Days"
    And I add a line with "Add a product":
      | Product  | Office Chair |
      | Quantity | 3            |
    And I save the record
    Then the breadcrumb title should not be "New"
    And the "Customer" field should be "Azure Interior"
    And the "Expiration" field should be "12/31/2030"
    And the "Payment Terms" field should be "30 Days"
    And I should see the line "Office Chair"
    And I should not see the line "Large Cabinet"
    And I should see the "Confirm" button in the form
    And I should not see the "Create Invoice" button in the form
    When I click the "Confirm" button in the form
    Then the status should be "Sales Order"
    And the status should not be "Quotation"
    And I should see the "Create Invoice" button in the form
    And I should not see the "Confirm" button in the form
    And I should see the chatter
    And I should see "Sales Order" in the chatter
    When I log the note "Reviewed by the Webship suite"
    Then I should see "Reviewed by the Webship suite" in the chatter
    And I should not see "No such note" in the chatter
    When I click the "Cancel" button in the form
    Then I should see the "Cancel Sales Order" dialog
    When I click the "Cancel" button in the dialog
    Then I should not see a dialog
    And the status should be "Cancelled"

  Scenario: A dialog can be closed without confirming
    When I open the "Orders > Orders" menu
    And I search the records for "S00007"
    And I open the "S00007" record
    Then the status should be "Sales Order"
    When I click the "Cancel" button in the form
    Then I should see a dialog
    And I should see the "Cancel Sales Order" dialog
    And I should not see the "Confirmation" dialog
    When I close the dialog
    Then I should not see a dialog
    And the status should be "Sales Order"

  Scenario: A smart button opens the related records
    When I open the "Orders > Customers" menu
    And I clear the search
    And I search the records for "Gemini Furniture"
    And I open the "Gemini Furniture" record
    And I click the "Sales" button in the form
    Then I should see the "S00007" record

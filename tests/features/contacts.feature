Feature: Odoo contacts
  As a tester of an Odoo site
  I want to create, read, change and delete a contact
  So that the life of a record is covered from the form view

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "contacts.action_contacts" action

  Scenario: A contact of the demo data opens with its fields
    When I search the records for "Azure Interior"
    And I open the "Azure Interior" record
    Then I should see the form view
    And the breadcrumb title should be "Azure Interior"
    And the "e.g. Lumber Inc" field should be "Azure Interior"
    And the "company_type" field should be "Company"
    And the "Email" field should show "@"
    And I should see the "Tags" field
    And I should not see the "No Such Field" field
    And I should see the "Sales & Purchase" tab
    And I should not see the "No Such Tab" tab
    And the record should not have unsaved changes

  Scenario: A new contact is created, changed and deleted
    When I create a new record
    Then the breadcrumb title should be "New"
    And the record should have unsaved changes
    When I set the "company_type" field to "Company"
    And I set the fields:
      | e.g. Lumber Inc | Webship Review Company      |
      | Email           | review@example.com          |
      | Phone           | +1 555 0100                 |
      | Website         | https://review.example.com  |
      | Tags            | Services                    |
    And I save the record
    Then the record should not have unsaved changes
    And the breadcrumb title should be "Webship Review Company"
    And the "Email" field should be "review@example.com"
    And the "Tags" field should show "Services"
    When I set the "Tags" field to "Vendor"
    Then the "Tags" field should be "Services, Vendor"
    When I remove "Services" from the "Tags" field
    Then the "Tags" field should be "Vendor"
    When I set the "Email" field to "changed@example.com"
    Then the record should have unsaved changes
    When I discard the changes
    Then the "Email" field should be "review@example.com"
    When I open the "Sales & Purchase" tab
    And I set the "Salesperson" field to "Mitchell Admin"
    And I save the record
    Then the "Salesperson" field should be "Mitchell Admin"
    When I set the "Salesperson" field to ""
    And I save the record
    Then the "Salesperson" field should be ""
    When I open the "Internal Notes" tab
    And I set the "comment" field to "Reviewed by the Webship suite"
    And I save the record
    Then the "comment" field should show "Reviewed by the Webship suite"
    When I choose "Delete" in the Actions menu
    Then I should see the "Bye-bye, record!" dialog
    And I should see "Ready to make your record disappear into thin air?" in the dialog
    When I confirm the dialog
    Then I should not see a dialog
    And the breadcrumb title should be "Contacts"
    When I search the records for "Webship Review Company"
    Then I should see no records

  Scenario: A form with a missing required field is not saved
    When I create a new record
    And I set the "Email" field to "nobody@example.com"
    And I try to save the record
    Then I should see the danger notification "Invalid fields"
    And I should see the notification "Name"
    And the "e.g. Lumber Inc" field should be invalid
    And the "e.g. Lumber Inc" field should be required
    And the "Email" field should not be required
    When I close the notifications
    Then I should not see the notification "Invalid fields"
    When I discard the changes
    Then the breadcrumb title should be "Contacts"

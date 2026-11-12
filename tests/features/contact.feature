Feature: Odoo contact form
  As a visitor of an Odoo website
  I want to send a message with the contact form
  So that the site owner can answer me

  Scenario: The contact page shows the form
    Given I am on the contact us page
    Then I should see the contact us form
    And the response status code should be 200

  @critical
  Scenario: A complete form is confirmed
    Given I am on the contact us page
    When I fill in the contact form with:
      | Name         | Webship Review                            |
      | Phone Number | +1 555 0100                               |
      | Email        | info@webship.co                           |
      | Company      | Webship                                   |
      | Subject      | Review of the contact form                |
      | Question     | Does the form confirm a complete message? |
    And I submit the contact form
    Then I should see the contact form confirmation
    And I should see "Thank You!"

  Scenario: A form with a missing required field is refused
    Given I am on the contact us page
    When I fill in the contact form with:
      | Name    | Webship Review |
      | Subject | No email       |
    And I submit the contact form
    Then I should see a contact form error
    And I should see a contact form error on "Email"
    And I should see a contact form error on "Question"
    And I should not see the contact form confirmation

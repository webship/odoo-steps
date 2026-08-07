Feature: Odoo contact us
  As an anonymous visitor
  I want to send a message through the "Contact us" page
  So that I can reach the people running the site

  Scenario: The contact page offers a form with the details the owner needs
    Given I am on "/contactus"
     Then the response status code should be 200
      And I should see the Odoo contact us form
      And the field "Name" should be required
      And the field "Email" should be required
      And the field "Question" should be empty

  @critical
  Scenario: A completed message is accepted and the sender is thanked
    Given I am on "/contactus"
     When I fill in the field "#contactus_form input[name=name]" with "Sample Visitor"
      And I fill in the field "#contactus_form input[name=email_from]" with "visitor@example.com"
      And I fill in the field "#contactus_form input[name=subject]" with "Quote request"
      And I fill in the field "#contactus_form textarea[name=description]" with "Please send me a quote for ten units."
      And I press "Submit"
      And I wait until the URL contains "/contactus-thank-you"
     Then the path should be "/contactus-thank-you"
      And I should see "Thank You!"
      And I should be on an Odoo website page

  Scenario: A message missing the required email is not sent
    Given I am on "/contactus"
     When I fill in the field "#contactus_form input[name=name]" with "Sample Visitor"
      And I fill in the field "#contactus_form input[name=subject]" with "Quote request"
      And I fill in the field "#contactus_form textarea[name=description]" with "Please send me a quote for ten units."
      And I press "Submit"
     Then the path should be "/contactus"
      And I should see the Odoo contact us form

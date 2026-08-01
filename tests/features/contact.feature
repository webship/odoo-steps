Feature: Odoo contact us
  As an anonymous visitor
  I want the Odoo "Contact us" page to render its form
  So that I know I can get in touch

  Scenario: Contact us page renders the website_form snippet
    Given I am on the Odoo contact us page
    Then I should see the Odoo contact us form
    And the response status code should be 200

Feature: Odoo 404 page
  As an anonymous visitor
  I want a clear 404 page for a URL that does not exist
  So that I know the page was not found rather than seeing a broken page

  Scenario: An unknown URL renders the Odoo 404 template
    Given I am on "/this-page-does-not-exist-odoo-steps"
    Then I should be on the 404 page
    And the response status code should be 404

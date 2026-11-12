Feature: Odoo jobs
  As an anonymous visitor
  I want to browse the Odoo Jobs page
  So that I can see open positions

  Scenario: Jobs page renders open positions
    Given I am on "/jobs"
    Then I should be on the Odoo jobs page
    And I should see Odoo job openings
    And the response status code should be 200

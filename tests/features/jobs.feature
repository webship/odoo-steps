# Requires the hr_recruitment app. Not installed on the default Odoo Website
# install (only "website" + theme_default) — excluded from the default run
# via the "not @requires-app" tag expression in cucumber.js.
@requires-app
Feature: Odoo jobs
  As an anonymous visitor
  I want to browse the Odoo Jobs page
  So that I can see open positions

  Scenario: Jobs page renders open positions
    Given I am on "/jobs"
    Then I should be on the Odoo jobs page
    And I should see Odoo job openings
    And the response status code should be 200

# Requires the website_event app. Not installed on the default Odoo Website
# install (only "website" + theme_default) — excluded from the default run
# via the "not @requires-app" tag expression in cucumber.js.
@requires-app
Feature: Odoo events
  As an anonymous visitor
  I want to browse the Odoo Events page
  So that I can see upcoming events

  Scenario: Events index renders the events list
    Given I am on "/event"
    Then I should be on the Odoo events page
    And the response status code should be 200

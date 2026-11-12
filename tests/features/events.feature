Feature: Odoo events
  As an anonymous visitor
  I want to browse the Odoo Events page
  So that I can see upcoming events

  Scenario: Events index renders the events list
    Given I am on "/event"
    Then I should be on the events page
    And the response status code should be 200

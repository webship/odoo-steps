# Requires the website_event app. Tag it out with `--tags 'not @requires-app'`
# when running against a site that does not have Events installed.
@requires-app
Feature: Odoo events
  As an anonymous visitor
  I want to see what is coming up and open an event
  So that I can decide whether to register

  Scenario: The events index lists published events
    Given I am on "/event"
     Then the response status code should be 200
      And I should be on the Odoo events page
      And I should see a ".o_wevent_events_list" element

  Scenario: An event from the index opens its own page with a way to register
    Given I am on "/event"
     When I click on the element ".o_wevent_events_list a[href*='/event/']"
     Then the response status code should be 200
      And I should see a "#wrap.o_wevent_event" element
      And I should be on an Odoo website page

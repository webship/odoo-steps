Feature: Odoo accessibility
  As a tester of an Odoo site
  I want to audit the login screen and the front page with the webship-js accessibility steps
  So that the pages every visitor meets are checked on each run

  Scenario: The login screen passes the structural checks
    Given I am on the login page
    Then the page should have a title
    And the page should declare a language
    And every form field should have an accessible label
    And every button should have an accessible name
    And no element should have a positive tabindex
    And user zoom should be allowed

  Scenario: The login screen has no critical accessibility violation
    Given I am on the login page
    Then the page should have no critical accessibility violations

  Scenario: The front page passes the structural checks
    Given I am on the homepage
    Then the page should have a title
    And the page should declare a language
    And the page should have a main landmark
    And the page should have a navigation landmark
    And every image should have an alt attribute
    And no element should have a positive tabindex
    And user zoom should be allowed

  Scenario: The front page has no critical accessibility violation
    Given I am on the homepage
    Then the page should have no critical accessibility violations

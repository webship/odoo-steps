Feature: Odoo homepage
  As an anonymous visitor
  I want the Odoo Website front page to load correctly
  So that I know the site is up and rendering its core layout

  @critical
  Scenario: Homepage renders the Odoo Website layout
    Given I am an anonymous user
    And I am on the homepage
    Then I should be on a website page
    And the response status code should be 200

  Scenario: Homepage shows the core Odoo layout
    Given I am on the homepage
    Then I should see the top menu
    And I should see the footer
    But I should not be on the 404 page
    And I should not see the contact us form

  Scenario: The web client is not a page of the website
    Given I am a logged in user with the "admin" user
    Then I should not be on a website page
    And I should not see the top menu
    And I should not see the footer

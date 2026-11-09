Feature: Odoo homepage
  As an anonymous visitor
  I want the Odoo Website front page to load correctly
  So that I know the site is up and rendering its core layout

  @critical
  Scenario: Homepage renders the Odoo Website layout
    Given I am an anonymous user
    And I am on the homepage
    Then I should be on an Odoo website page
    And the response status code should be 200

  Scenario: Homepage shows the core Odoo layout
    Given I am on the homepage
    Then I should see the Odoo top menu
    And I should see the Odoo footer

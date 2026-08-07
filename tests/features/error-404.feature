Feature: Odoo page not found
  As an anonymous visitor
  I want an unknown URL to say so plainly and leave me on the site
  So that a mistyped link does not become a dead end

  Scenario: An unknown URL answers 404 without losing the site layout
    Given I am on "/this-page-does-not-exist-odoo-steps"
     Then the response status code should be 404
      And I should be on the Odoo 404 page
      And I should see the Odoo top menu
      And I should see the Odoo footer

  Scenario: The page-not-found screen offers a route back to the homepage
    Given I am on "/this-page-does-not-exist-odoo-steps"
     When I follow "Home"
     Then I should be on the homepage
      And the response status code should be 200

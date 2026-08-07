Feature: Odoo homepage
  As an anonymous visitor
  I want the Odoo Website front page to load and stay navigable
  So that I can reach the rest of the site from it

  @critical
  Scenario: The front page serves the Odoo Website layout
    Given I am an anonymous user
      And I am on the homepage
     Then the response status code should be 200
      And I should be on an Odoo website page
      And I should see the Odoo top menu
      And I should see the Odoo footer

  Scenario: The top menu carries a visitor to another page of the site
    Given I am on the homepage
     When I follow "Contact us"
     Then the path should be "/contactus"
      And I should be on an Odoo website page
      And I should see the Odoo top menu

  Scenario: The front page describes itself to search engines and assistive technology
    Given I am on the homepage
     Then the page should have a title
      And the page should declare a language
      And the page should have a navigation landmark
      And the page should have a main landmark
      And the meta tag should exist with the following attributes:
        | name    | viewport                            |
        | content | width=device-width, initial-scale=1 |

  Scenario: The header collapses to a menu toggle on a phone-sized screen
    Given I am viewing the site on a "xs" screen
      And I am on the homepage
     Then the "Toggle navigation" button should be visible
     When I click the "Toggle navigation" button
     Then "#top_menu_collapse_mobile" should be visible
      And I should see "Contact us"

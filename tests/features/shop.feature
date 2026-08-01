# Requires the website_sale app. Not installed on the default Odoo Website
# install (only "website" + theme_default) — excluded from the default run
# via the "not @requires-app" tag expression in cucumber.js.
@requires-app
Feature: Odoo shop
  As an anonymous visitor
  I want to browse and search the Odoo shop
  So that I can find and view products

  Scenario: Shop index renders the product grid
    Given I am on "/shop"
    Then I should be on the Odoo shop index
    And the response status code should be 200

  Scenario: Shop search returns matching results
    Given I am on "/shop"
    When I search the Odoo shop for "mug"
    Then I should see Odoo shop search results for "mug"

  Scenario: A product page renders the product template
    Given I am on "/shop"
    When I click on the element "#products_grid .oe_product a"
    Then I should be on an Odoo product page
    And the response status code should be 200

  # A specific product, not "first in the grid": some demo products (e.g.
  # those with variant attributes) route "Add to cart" through an extra
  # configurator step this step definition doesn't drive. This product adds
  # directly, keeping the scenario deterministic against our own demo data.
  Scenario: Adding a product updates the cart badge
    Given I am on "/shop/furn-8888-office-lamp-6"
    When I add the product to the Odoo cart
    Then I should see "1" item in the Odoo cart

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
    When I search the Odoo shop for "desk"
    Then I should see Odoo shop search results for "desk"
    And I should see the "Customizable Desk" product in the shop
    And I should not see the "Office Chair" product in the shop

  Scenario: Shop search with no match lists no product
    Given I am on "/shop"
    When I search the shop for "no-such-product"
    Then I should not see shop search results for "no-such-product"

  Scenario: A product page renders the product template
    Given I am on "/shop"
    When I open the first product in the shop
    Then I should be on an Odoo product page
    And the response status code should be 200

  Scenario: Adding a product updates the cart badge
    Given I am on "/shop"
    When I open the first product in the shop
    And I add the product to the Odoo cart
    Then I should see "1" item in the Odoo cart

Feature: Odoo shop
  As an anonymous visitor
  I want to browse and search the Odoo shop
  So that I can find and view products

  Scenario: Shop index renders the product grid
    Given I am on "/shop"
    Then I should be on the shop index
    But I should not be on a product page
    And the response status code should be 200

  Scenario: Shop search returns matching results
    Given I am on "/shop"
    When I search the shop for "desk"
    Then I should see shop search results for "desk"
    And I should see the "Customizable Desk" product in the shop
    And I should not see the "Office Chair" product in the shop

  Scenario: Shop search with no match lists no product
    Given I am on "/shop"
    When I search the shop for "no-such-product"
    Then I should not see shop search results for "no-such-product"

  Scenario: A product page renders the product template
    Given I am on "/shop"
    When I open the first product in the shop
    Then I should be on an product page
    But I should not be on the shop index
    And the response status code should be 200

  Scenario: Adding a product updates the cart badge
    Given I am on "/shop"
    When I open the first product in the shop
    And I add the product to the cart
    Then I should see "1" item in the cart
    But I should not see "2" items in the cart

  # Adding to the cart opens an order for the visitor (a quotation of the
  # archived "Public user" contact, from the website). The administrator
  # deletes the orders of that contact, so a run leaves no cart behind.
  Scenario: The order a visitor's cart opened is removed in the back office
    Given I am a logged in user with the "admin" user
    When I open the "website_sale.action_orders_ecommerce" action
    And I remove the "Confirmed" search facet
    And I group the records by "Customer"
    Then I should see the "Public user" group
    When I open the "Public user" group
    And I select all records
    And I choose "Delete" in the Actions menu
    And I confirm the dialog
    Then I should not see a dialog
    # The list keeps the emptied group open until it is grouped again.
    And I should see "Public user (0)"

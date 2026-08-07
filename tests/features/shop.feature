# Requires the website_sale app. Tag it out with `--tags 'not @requires-app'`
# when running against a site that does not have eCommerce installed.
@requires-app
Feature: Odoo shop
  As an anonymous shopper
  I want to find a product and put it in my cart
  So that I can come back and check out later

  Scenario: The catalog lists published products
    Given I am on "/shop"
     Then the response status code should be 200
      And I should be on the Odoo shop page
      And I should see a "#products_grid .oe_product" element

  Scenario: Searching narrows the catalog to the matching products
    Given I am on "/shop"
     When I search the Odoo shop for "Chair"
     Then I should be on the Odoo shop page
      And current url should have the "search" parameter with the "Chair" value
      And I should see "Chair"

  Scenario: A product in the catalog opens its own page ready to buy
    Given I am on "/shop"
     When I click on the element "#products_grid .oe_product a"
     Then the response status code should be 200
      And I should be on an Odoo product page
      And I should see "Add to cart"

  # A named product rather than "first in the grid": variant products route
  # add-to-cart through an extra configurator step, so pinning the product
  # keeps this scenario about the cart and not about the configurator.
  @critical
  Scenario: An added product stays in the cart while the shopper keeps browsing
    Given I am on "/shop/furn-8888-office-lamp-6"
     When I add the product to the Odoo cart
     Then I should see "1" item in the Odoo cart
     When I am on "/shop"
     Then I should see "1" item in the Odoo cart
     When I am on "/shop/cart"
     Then I should see a "#cart_products" element
      And I should see "1" item in the Odoo cart

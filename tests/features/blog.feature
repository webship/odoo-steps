Feature: Odoo blog
  As an anonymous visitor
  I want to browse the Odoo Blog
  So that I can read published posts

  Scenario: Blog index renders the post list
    Given I am on "/blog"
     Then I should be on the Odoo blog index
      And the response status code should be 200

  Scenario: A blog post renders the single-post template
    Given I am on "/blog"
     When I click on the element ".o_wblog_post a"
     Then I should be on an Odoo blog post page
     And the response status code should be 200

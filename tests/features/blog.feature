# Requires the website_blog app. Tag it out with `--tags 'not @requires-app'`
# when running against a site that does not have the Blog installed.
@requires-app
Feature: Odoo blog
  As an anonymous reader
  I want to pick a post from the blog and read it
  So that I can follow what the site publishes

  Scenario: The blog index lists published posts
    Given I am on "/blog"
     Then the response status code should be 200
      And I should be on the Odoo blog index
      And I should see a ".o_wblog_post" element

  Scenario: A post from the index opens as a page of its own
    Given I am on "/blog"
     When I click on the element ".o_wblog_post a"
     Then the response status code should be 200
      And I should be on an Odoo blog post page
      And "#o_wblog_post_name" should be visible
      And I should be on an Odoo website page

  Scenario: A reader who arrives on a post can get back to the blog
    Given I am on "/blog"
     When I click on the element ".o_wblog_post a"
      And I move backward one page
     Then I should be on the Odoo blog index
      And the path should be "/blog"

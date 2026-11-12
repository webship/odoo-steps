Feature: Odoo website editor
  As a tester of an Odoo website
  I want to open the website editor, read its building blocks and leave it
  So that I know the editor loads for the users who may edit the site

  Scenario: An administrator opens the editor on the front page and discards
    Given I am a logged in user with the "admin" user
    Then I should be able to edit the website
    When I open the website editor
    Then I should see the website editor
    And I should see the "Text" building block
    And I should see the "Banner" building block
    And I should not see the "No Such Block" building block
    When I discard the website editor
    Then I should not see the website editor

  Scenario: The editor opens on another page and saves
    Given I am a logged in user with the "admin" user
    When I open the website editor on "/contactus"
    Then I should see the website editor
    When I save the website editor
    Then I should not see the website editor

  Scenario: A user without a website editor group has no edit button
    Given I am a logged in user with the "salesperson" user
    Then I should not be able to edit the website

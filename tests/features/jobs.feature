# Requires the hr_recruitment app. Tag it out with `--tags 'not @requires-app'`
# when running against a site that does not have Recruitment installed.
@requires-app
Feature: Odoo jobs
  As a candidate
  I want to browse the open positions and open one
  So that I can apply for the job that suits me

  Scenario: The job board lists open positions
    Given I am on "/jobs"
     Then the response status code should be 200
      And I should be on the Odoo jobs page
      And I should see Odoo job openings

  Scenario: A position opens its own page with a way to apply
    Given I am on "/jobs"
     When I click on the element "#jobs_grid a[href*='/jobs/']"
     Then the response status code should be 200
      And I should see a "#wrap.js_hr_recruitment" element
      And I should see "Apply Now!"

# Steps

Every step of `@webship-js/odoo-steps`, written from the step definitions by `npm run docs:steps`. Each step is shown by its first example; the comment above its definition gives four more and names the markup the step relies on. Every assertion takes `not`.

## Sessions

`tests/step-definitions/odoo-session.steps.js`, 14 steps.

| Step | What it does |
| --- | --- |
| `Given I am on the login page` | Navigate to the login screen at `/web/login`. |
| `Then I should see the login form` | Assert the login form is, or is not, visible. |
| `When I log in as "admin" with password "secret"` | Fill and submit the login form with the given login and password, for scenarios where the credentials are the subject (a wrong password, a disabled account). |
| `Given I am a logged in user with the "admin" user` | Log in as a user of the registry in cucumber.js (`worldParameters.users`), so no password appears in a feature file. |
| `Given I am not logged in` | End any session and land on the login screen as a visitor. |
| `Then I should see an login error` | Assert the login screen is, or is not, showing an error, optionally with a text. |
| `When I log out` | Log out the way a user does. |
| `Then I should be logged in` | Assert the browser holds, or does not hold, a session, as the server reports it (`/web/session/get_session_info`). |
| `Then I should be logged in as "admin"` | Assert the session belongs, or does not belong, to the given user. |
| `Then I should be in the web client` | Assert the page is, or is not, the web client. |
| `Then I should be in the portal` | Assert the page is, or is not, the portal. |
| `When I open the user menu` | Open the user menu. |
| `Then I should see "My Profile" in the user menu` | Assert the user menu offers, or does not offer, an entry. |
| `When I choose "My Profile" in the user menu` | Choose an entry of the user menu, for example "My Profile". |

## Web client: apps, menus, search, list and kanban views

`tests/step-definitions/odoo-webclient.steps.js`, 33 steps.

| Step | What it does |
| --- | --- |
| `When I open the "CRM" app` | Open an app from the apps menu of the navigation bar, by its name, and wait for its first screen. |
| `Then I should see the "CRM" app` | Assert the apps menu lists, or does not list, an app. |
| `Then I should be in the "CRM" app` | Assert the app on screen is, or is not, the given one. |
| `When I open the "Orders > Quotations" menu` | Open a menu of the current app, by its path in the menu bar. |
| `Then I should see the "Orders" menu` | Assert the menu bar of the current app offers, or does not offer, a menu. |
| `When I open the "sale.action_quotations_with_onboarding" action` | Open an action by its external ID (`module.xml_id`), for example `sale.action_quotations_with_onboarding`. |
| `Then I should see "Quotations" in the breadcrumb` | Assert the breadcrumb of the control panel shows, or does not show, a text. |
| `Then the breadcrumb title should be "Quotations"` | Assert the title of the current screen, the last part of the breadcrumb (`.o_last_breadcrumb_item`), is or is not the given text. |
| `When I go back to "Quotations" in the breadcrumb` | Go back through the breadcrumb. |
| `When I switch to the list view` | Switch the view with the view switcher of the control panel (`.o_cp_switch_buttons`). |
| `Then I should see the list view` | Assert the view on screen is, or is not, of the given type (`.o_list_view`, `.o_kanban_view`, `.o_form_view`, ...). |
| `When I search the records for "chair"` | Search the records on screen. |
| `When I filter the records by "Won"` | Turn a filter of the search options on or off, by its name under "Filters". |
| `When I group the records by "Salesperson"` | Group the records by an entry of "Group By" in the search options. |
| `Then I should see the "My Pipeline" search facet` | Assert the search view shows, or does not show, a facet with the given text. |
| `When I remove the "My Pipeline" search facet` | Remove one facet of the search view, by its text, with its "Remove" button. |
| `When I clear the search` | Clear the search view. |
| `Then I should see the "Azure Interior" record` | Assert a record is, or is not, on screen. |
| `When I open the "Azure Interior" record` | Open a record from the list or the kanban view on screen, by a text it shows, and wait for its form view. |
| `Then I should see 3 records` | Assert the number of records on screen. |
| `Then I should see no records` | Assert the list or the kanban view shows no record. |
| `When I select the "S00007" record` | Select or unselect a record of the list view with its checkbox, by a text the row shows. |
| `When I select all records` | Select every record of the page with the checkbox of the list header. |
| `Then I should see 1 selected record` | Assert the number of selected records, as the control panel reports it ("3 selected", `.o_list_selection_box`). |
| `When I choose "Delete" in the Actions menu` | Choose an entry of the "Actions" menu of the control panel (the gear on a form view). |
| `Then I should see the "Mitchell Admin" group` | Assert the list view shows, or does not show, a group with the given name. |
| `When I open the "Mitchell Admin" group` | Open or close a group of a grouped list view, by its name, to show or hide its records. |
| `Then the pager should read "1-15 / 15"` | Assert what the pager of the control panel reads. |
| `When I go to the next page of records` | Go to the next or the previous page of records (on a form view. |
| `Then I should see the "New" column` | Assert the kanban view shows, or does not show, a column with the given title (`.o_kanban_group .o_column_title`). |
| `Then I should see the "Quote for 600 Chairs" card in the "Qualified" column` | Assert a card is, or is not, in a column of the kanban view. |
| `Then the "New" column should have 2 cards` | Assert the number of cards a column of the kanban view shows. |
| `When I drag the "Quote for 600 Chairs" card to the "Proposition" column` | Move a card of the kanban view to another column by dragging it, the way a user moves an opportunity to another stage. |

## Records: form view, dialogs, notifications and chatter

`tests/step-definitions/odoo-record.steps.js`, 32 steps.

| Step | What it does |
| --- | --- |
| `When I create a new record` | Start a new record with the "New" button of the control panel (`.o_list_button_add`, `.o-kanban-button-new`, `.o_form_button_create`) and wait for the empty form. |
| `When I save the record` | Save the record on the form view with the save button of the control panel (`.o_form_button_save`) and wait for the server. |
| `When I try to save the record` | Click the save button of the form view without expecting the save to succeed, for a scenario whose subject is the refusal. |
| `When I discard the changes` | Discard the changes of the form view with the discard button of the control panel (`.o_form_button_cancel`). |
| `Then the record should have unsaved changes` | Assert the form view has, or does not have, unsaved changes. |
| `When I set the "Customer" field to "Azure Interior"` | Set a field of the form to a value. |
| `When I set the fields:` | Set several fields of the form from a table. |
| `When I check the "Can be Sold" field` | Check or uncheck a checkbox field of the form, named like any other field. |
| `When I remove "Product" from the "Tags" field` | Remove a tag from a tags field of the form, by its text. |
| `Then the "Customer" field should be "Azure Interior"` | Assert the value a field of the form shows. |
| `Then the "Can be Sold" field should be checked` | Assert a checkbox field of the form is, or is not, checked. |
| `Then I should see the "Customer" field` | Assert the form shows, or does not show, a field. |
| `Then the "Customer" field should be required` | Assert a field of the form is, or is not, required, read-only or marked as invalid, from the classes Odoo puts on the field (`o_required_modifier`, `o_readonly_modifier`, `o_field_invalid`). |
| `When I click the "Confirm" button in the form` | Click a button of the form by its text. |
| `Then I should see the "Confirm" button in the form` | Assert the form offers, or does not offer, a button with the given text. |
| `Then the status should be "Sales Order"` | Assert the status the status bar of the form highlights (`.o_statusbar_status .o_arrow_button_current`). |
| `When I set the stage to "Proposition"` | Change the stage of the record by clicking a stage of the status bar, the way a user moves an opportunity to "Proposition". |
| `When I open the "Order Lines" tab` | Open a tab of the form's notebook by its title (`.o_notebook_headers .nav-link`), to reach the fields it holds. |
| `Then I should see the "Order Lines" tab` | Assert the form offers, or does not offer, a tab with the given title. |
| `When I add a line with "Add a product":` | Add a line to the list of the open tab (order lines, invoice lines) and fill its cells from a table. |
| `Then I should see the line "Office Chair"` | Assert a list of the form shows, or does not show, a line with the given text (the product of an order line, the label of an invoice line). |
| `Then I should see a dialog` | Assert a dialog is, or is not, open, optionally with a title (`.modal[role="dialog"] .modal-title`). |
| `Then I should see "Are you sure" in the dialog` | Assert the dialog on top shows, or does not show, a text in its body. |
| `When I click the "Ok" button in the dialog` | Click a button of the dialog on top by its text ("Ok", "Discard", "Save & Close", the action of a wizard) and wait for what it starts. |
| `When I confirm the dialog` | Confirm the dialog on top with its main button (the primary button of the footer. |
| `Then I should see an access error` | Assert Odoo shows, or does not show, an access error. |
| `Then I should see the notification "Invalid fields"` | Assert Odoo shows, or does not show, a notification with the given text. |
| `When I close the notifications` | Close the notifications on screen with their close button, so that they do not cover a button a later step needs. |
| `Then I should see the chatter` | Assert the form shows, or does not show, the chatter. |
| `When I log the note "Called the customer, waiting for the order"` | Log an internal note on the record with the "Log note" button of the chatter, and wait for the note to appear in the thread. |
| `When I send the message "Your order is confirmed"` | Send a message on the record with the "Send message" button of the chatter, and wait for the message to appear in the thread. |
| `Then I should see "Called the customer" in the chatter` | Assert the chatter shows, or does not show, a text in one of its messages (`.o-mail-Message`). |

## Website

`tests/step-definitions/odoo.steps.js`, 29 steps.

| Step | What it does |
| --- | --- |
| `Then I should be on a website page` | Assert the current page was, or was not, rendered by the Odoo Website builder. |
| `Then I should see the top menu` | Assert the Website top menu (main navigation) is, or is not, visible. |
| `Then I should see the footer` | Assert the Website footer is, or is not, visible. |
| `Then I should be on the blog page` | Assert the current page is, or is not, the Blog index/listing template. |
| `Then I should be on an blog post page` | Assert the current page is, or is not, a single blog post template. |
| `Then I should see the blog post titled "Customer Reviews"` | Assert the blog post on screen has, or does not have, the given title. |
| `Then I should be on the shop page` | Assert the current page is, or is not, the eCommerce shop/catalog template. |
| `Then I should be on an product page` | Assert the current page is, or is not, an eCommerce product page. |
| `When I open the first product in the shop` | Open a product from the shop grid on screen. |
| `When I search the shop for "mug"` | Submit the shop's search form with the given term. |
| `Then I should see shop search results for "desk"` | Assert the shop search returned, or did not return, products for the given term. |
| `Then I should see the "Customizable Desk" product in the shop` | Assert the shop grid lists, or does not list, a product by its name (`#products_grid .o_wsale_products_item_title`). |
| `When I add the product to the cart` | Add the product on screen to the cart. |
| `Then I should see "1" item in the cart` | Assert the cart badge shows, or does not show, the given item count. |
| `Then I should be on the events page` | Assert the current page is, or is not, the Events index/listing template. |
| `Then I should be on the jobs page` | Assert the current page is, or is not, the Jobs (recruitment) listing template. |
| `Then I should see job openings` | Assert at least one job opening link is, or none is, visible on the Jobs page. |
| `Given I am on the contact us page` | Navigate to the "Contact us" page at `/contactus` and check that the site serves it. |
| `Then I should see the contact us form` | Assert the "Contact us" form is, or is not, visible. |
| `When I fill in the contact form with:` | Fill the contact form from a table. |
| `When I submit the contact form` | Submit the contact form with its button (`.s_website_form_send`) and wait for the answer of the site. |
| `Then I should see the contact form confirmation` | Assert the site confirmed, or did not confirm, the contact form. |
| `Then I should see a contact form error` | Assert the contact form shows, or does not show, an error after it was submitted. |
| `Then I should be able to edit the website` | Assert the current user can, or cannot, edit the website. |
| `When I open the website editor` | Open the website editor on a page. |
| `Then I should see the website editor` | Assert the website editor is, or is not, open. |
| `Then I should see the "Text" building block` | Assert the website editor offers, or does not offer, a building block, by its name in the "Blocks" tab of the editor panel (`#oe_snippets .oe_snippet`). |
| `When I save the website editor` | Leave the website editor with its "Save" or its "Discard" button and wait for the editor to close. |
| `Then I should be on the 404 page` | Assert the current page is, or is not, the core 404 template, by checking the page heading for "404" (rendered by `addons/http_routing`'s `http_routing.404` template on every Odoo site). |

108 steps.

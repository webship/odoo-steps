# odoo-steps

[![Test](https://github.com/webship/odoo-steps/actions/workflows/test.yml/badge.svg)](https://github.com/webship/odoo-steps/actions/workflows/test.yml)

Odoo step definitions for [webship-js](https://www.npmjs.com/package/webship-js), the Playwright and Cucumber testing framework. `@webship-js/odoo-steps` gives a tester plain-English steps for an Odoo site: logging in as a named user, opening an app and a menu, searching and grouping records, filling a form by the labels of its fields, saving, following the status bar, moving a kanban card, answering a dialog, reading a notification, writing in the chatter, checking access rights, and the pages of the website.

It is a plugin for webship-js and does not run alone. Add it to a webship-js project.

Every step is proven against a real Odoo 17.0 Community site with demo data, built for each run of this repository's suite (see [Running this repository's suite](#running-this-repositorys-suite)).

## What is covered

| Area | Steps | File |
| --- | --- | --- |
| Sessions | the login screen, logging in as a user of the registry, logging out from the user menu, who is logged in, the web client and the portal, the user menu | `odoo-session.steps.js` |
| Apps and menus | the apps menu, opening an app, a menu path (`Orders > Quotations`), an action by its external ID, the breadcrumb, the view switcher | `odoo-webclient.steps.js` |
| Search view | search, search in a named field, filters, grouping, facets, clearing the search | `odoo-webclient.steps.js` |
| List view | records, opening a record, counting, selecting, groups, the pager, the Actions menu | `odoo-webclient.steps.js` |
| Kanban view | columns, cards, counting, dragging a card to another column | `odoo-webclient.steps.js` |
| Form view | a new record, fields by label (text, number, date, selection, many2one, tags, checkbox, radio, priority), saving, a refused save, discarding, buttons, the status bar, tabs, lines of a list inside the form | `odoo-record.steps.js` |
| Dialogs and notifications | a dialog and its title, text and buttons, confirming and closing, the access error, notifications | `odoo-record.steps.js` |
| Chatter | logging a note, sending a message, reading the thread | `odoo-record.steps.js` |
| Website | the layout, blog, shop (search, product, cart), events, jobs, the contact form, the 404 page, opening and leaving the website editor | `odoo.steps.js` |

[STEPS.md](STEPS.md) lists every step with what it does. Each step definition carries a comment with what it does, the markup it relies on and five `Example #n:` lines. The feature files in [tests/features/](tests/features/) use every step against the real site and are the best place to see them at work.

The steps wait on Odoo's own signals: the data requests of the web client and its "Loading" indicator. No step waits for a fixed time. A step that fails says what it expected, what it found and what to check, and lists what the page offers (the apps of the menu, the labels of the form, the buttons of the dialog).

No step phrase names the platform: a step reads `When I open the "CRM" app`, `When I save the record`. Every assertion takes `not`.

## Requirements

- Node.js 20 or later
- A [webship-js](https://www.npmjs.com/package/webship-js) 2.x project (`npx init-webship-js` creates one)
- An Odoo site to test. The steps are proven on Odoo 17.0 Community.

## Installation

```bash
npm install --save-dev webship-js @webship-js/odoo-steps
```

Add the step definitions to the `cucumber.js` of your project, and name your accounts in the users registry:

```javascript
module.exports = {
  default: {
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',              // webship-js steps
      'node_modules/@webship-js/odoo-steps/tests/step-definitions/**/*.js',  // this pack
      'tests/step-definitions/**/*.js',                                      // your own steps, if any
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'https://your-project.ddev.site',
      // The users registry: a handle a feature can read, mapped to a real account.
      users: {
        admin: { username: 'admin', password: process.env.ODOO_ADMIN_PASSWORD },
        salesperson: { username: 'sam@example.com', password: process.env.ODOO_SALESPERSON_PASSWORD },
      },
      // On a server that holds several databases, the one to log in to.
      odoo: { database: process.env.ODOO_DATABASE || '' },
      // ...
    },
  },
};
```

Accounts are configuration. Create them once on the site under test, with the groups each one needs, and keep their passwords in the environment. A feature names a handle (`Given I am a logged in user with the "salesperson" user`); it never creates an account and never carries a password.

## Example

```gherkin
Feature: Quotations

  Scenario: A salesperson confirms a quotation
    Given I am a logged in user with the "salesperson" user
    When I open the "Sales" app
    And I open the "Orders > Quotations" menu
    And I create a new record
    And I set the "Customer" field to "Azure Interior"
    And I add a line with "Add a product":
      | Product  | Office Chair |
      | Quantity | 3            |
    And I save the record
    And I click the "Confirm" button in the form
    Then the status should be "Sales Order"
    When I log the note "Confirmed by phone"
    Then I should see "Confirmed by phone" in the chatter

  Scenario: An employee without the Sales group is refused the quotations
    Given I am a logged in user with the "employee" user
    Then I should not see the "Sales" app
    When I open the "sale.action_quotations_with_onboarding" action
    Then I should see an access error
```

## How a step finds things

- **A field** is named by the label the form shows ("Customer"), by the placeholder of its input ("e.g. Lumber Inc") or by its technical name ("partner_id"). `When I set the "..." field to "..."` fills it the way a user would for its kind: typed for a text, a number or a date, chosen for a selection, picked from the proposals for a many2one, added for tags, "yes" or "no" for a checkbox.
- **A record** in a list or a kanban view is named by a text it shows: its name or its reference.
- **A button, a menu, an app, a tab, a column** is named by its whole text, as it reads on screen, case-sensitive.
- **A dialog on top** takes the steps: while a dialog is open, a field or a button is looked for in the dialog.
- **Dates and numbers** are written in the format of the user's language, as a user types them.

The texts are the ones of the language the user works in. The suite of this repository runs in English.

## Running this repository's suite

The repository is a working webship-js project. Its suite runs against an Odoo 17.0 Community site that [DDEV](https://ddev.com/) starts from `.ddev/` and `scripts/build-odoo.sh` builds: a database with Odoo's demo data, the apps the features use (Contacts, CRM, Sales, Invoicing, Website with its blog, shop, events and jobs) and the accounts of the users registry. The suite never targets a site outside the machine it runs on.

```bash
ddev start                      # Odoo 17.0 and PostgreSQL, at https://odoo-steps.ddev.site
bash scripts/build-odoo.sh      # demo data, apps, accounts

npm install
npx playwright install --with-deps chromium
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"   # Node trusts DDEV's certificate
npm test                        # runs against https://odoo-steps.ddev.site

ddev delete -Oy odoo-steps      # remove the site when done
```

`LAUNCH_URL=https://another-odoo.example npm test` points the suite at another site; that site needs the same demo data and accounts.

The accounts `scripts/build-odoo.sh` creates (the password of each is its login, on this local site only):

| Handle | Login | Groups |
| --- | --- | --- |
| `admin` | `admin` | Administrator |
| `salesperson` | `salesperson` | Sales: own documents only |
| `accountant` | `accountant` | Invoicing: billing |
| `employee` | `employee` | Internal user, no app-specific group |
| `portal` | `portal` | Portal |

The build also uninstalls the `partner_autocomplete` module, which sends what a user types in a company name to an outside service; a test site should neither depend on such a service nor send data to it.

Scripts:

| Script | Effect |
| --- | --- |
| `npm test` | The full suite |
| `npm run test:dry` | `--dry-run`: no undefined and no ambiguous step |
| `npm run test:examples` | No browser: every step has five `Example #n:` lines that match its own definition and no other, and every feature step resolves to one definition |
| `npm run docs:steps` | Writes [STEPS.md](STEPS.md) from the step definitions; `npm run docs:steps:check` fails when it is out of date |
| `npm run test:headed` | The suite in a visible browser |
| `npm run test:chromium`, `test:firefox`, `test:webkit` | The suite in one browser |

Settings read from the environment:

- `FEATURES=tests/features/a.feature,tests/features/b.feature npm test` runs some feature files; `CUCUMBER_TAGS=@critical npm test` runs the scenarios with a tag (the default run leaves `@wip` out).
- `ODOO_<HANDLE>_USER` and `ODOO_<HANDLE>_PASSWORD` set the login and the password of a registry account, for example `ODOO_ADMIN_PASSWORD`.
- `ODOO_DATABASE` names the database to log in to on a server that holds several.
- `WEBSHIP_VIDEO=on-failure` records the browser; `WEBSHIP_JS_ERROR_MODE=fail` fails a scenario on a JavaScript error (`@js-off` silences one scenario).
- `WEBSHIP_STEP_TIMEOUT=<milliseconds>` changes the step timeout of webship-js (45 seconds); a `timeout` key in `cucumber.js` does not.

## Limits

- Proven on Odoo 17.0 Community, in English. Odoo Enterprise shows its apps on a home screen instead of a menu; the app steps look for both, and only the Community menu is proven by this suite.
- Odoo 18 and later serve the web client under `/odoo` instead of `/web#...`. `When I open the "..." action` builds that address from the version the server reports, but no step is proven on those versions yet.
- A server with several databases is supported through `worldParameters.odoo.database`; the database selector itself has no step.
- The website editor steps open the editor, read its building blocks and leave it; dragging a building block into a page has no step yet.
- `When I send the message "..."` posts to the followers of the record. On a test site, make sure outgoing mail does not reach real addresses.

## Contributing

Issues and pull requests are tracked on [GitHub](https://github.com/webship/odoo-steps). `2.0.x` is the active branch.

## License

MIT © Webship.co. See [LICENSE](LICENSE).

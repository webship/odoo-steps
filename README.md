<p align="center"><img src="https://raw.githubusercontent.com/webship/odoo-steps/2.0.x/assets/logo.svg" alt="Odoo logo" width="96"></p>

# odoo-steps

[![Test](https://github.com/webship/odoo-steps/actions/workflows/test.yml/badge.svg)](https://github.com/webship/odoo-steps/actions/workflows/test.yml)

Odoo step definitions for [webship-js](https://www.npmjs.com/package/webship-js), the Playwright and Cucumber testing framework. `@webship-js/odoo-steps` gives a tester plain-English steps for an Odoo site: logging in as a named user, opening an app and a menu, searching and grouping records, filling a form by the labels of its fields, saving, following the status bar, moving a kanban card, answering a dialog, reading a notification, writing in the chatter, checking access rights, and the pages of the website.

It is a plugin for webship-js and does not run alone. Add it to a webship-js project.

Every step is proven against a real Odoo 17.0 Community site with demo data, built for each run of this repository's suite (see [Running this repository's suite](#running-this-repositorys-suite)).

## What is covered

| Area | Steps | File |
| --- | --- | --- |
| Sessions | logging in as a user of the registry or with a login and a password, the login screen, logging out from the user menu, who is logged in, the web client and the portal, the user menu | `odoo-session.steps.js` |
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

## From nothing to a green run

What the machine needs: Docker, [DDEV](https://ddev.com), git, and Node.js 24 or later with npm. Odoo and PostgreSQL run in DDEV's containers (the `odoo:17.0` and `postgres:15-alpine` images, about 2.2 GB).

**1. The Odoo site.** The repository's own DDEV project (the one CI runs) starts Odoo 17.0 Community and PostgreSQL, and its build script installs the apps with Odoo's demo data and creates the accounts of [Test users](#test-users); it takes a minute or two once the images are on the machine.

```bash
git clone https://github.com/webship/odoo-steps.git
cd odoo-steps
ddev start
bash scripts/build-odoo.sh
cd ..
```

The site answers at `https://odoo-steps.ddev.site` (`ddev delete -Oy odoo-steps` removes it when you are done).

In the [Webship Workspace](https://github.com/webship/workspace), its Odoo plugin builds the site instead, Odoo 17.0 Community with the same apps and Odoo's demo data, in a sites folder of the workspace (`test/` here; `dev/`, `sandboxes/` and `demos/` work the same):

```bash
bash core/scripts/plugins.sh --require odoo --with-needs
bash core/scripts/plugins.sh --activate odoo --with-needs
bash core/scripts/plugins.sh --install odoo
bash test/cmd-odoo-project.sh mysite --install --add-users
```

That site answers at `https://mysite.ddev.site`. Its accounts are the plugin's (`administrator`, `salesperson`, `accountant`, `employee` and `portal`, each with the password `dD.123123ddd`; step 3 names them). The features of [`tests/features/`](tests/features/) pass there too, but for six lines that are about Odoo's own `admin` account: the demo pipeline belongs to it (the default "My Pipeline" filter shows its opportunities, such as "Quote for 600 Chairs"), and on a Workspace site that account is the workspace account.

**2. A test project.**

```bash
mkdir odoo-tests && cd odoo-tests
npm init -y
npm install --save-dev webship-js @webship-js/odoo-steps
npx init-webship-js
```

`npx init-webship-js` writes `cucumber.js`, `playwright.config.ts`, the `tests/` folders with a first feature and the `npm test` scripts, and installs Chromium. npm usually runs it already when it installs webship-js; a second run changes nothing.

**3. `cucumber.js`.** Replace the file with the wiring of the pack: the step files of webship-js and of the pack, the address of the site, and the accounts (the JSON of [Test users](#test-users)).

```javascript
module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/odoo-steps/tests/step-definitions/**/*.js',
      'tests/step-definitions/**/*.js',
    ],
    paths: ['tests/features/**/*.feature'],
    format: ['@cucumber/pretty-formatter', 'json:tests/reports/cucumber_report.json'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'https://odoo-steps.ddev.site',
      // The waits webship-js adds around each page, scenario and step (milliseconds).
      minWaitTime: { page: 3000, before_scenario: 0, after_scenario: 0, before_step: 0, after_step: 0 },
      users: {
        admin: { username: 'admin', password: 'admin' },
        salesperson: { username: 'salesperson', password: 'salesperson' },
        accountant: { username: 'accountant', password: 'accountant' },
        employee: { username: 'employee', password: 'employee' },
        portal: { username: 'portal', password: 'portal' },
      },
      odoo: { database: '' },
    },
  },
};
```

On a site from the Webship Workspace (step 1), the accounts are the plugin's: `admin: { username: 'administrator', password: 'dD.123123ddd' }`, and `salesperson`, `accountant`, `employee` and `portal` with the same password. Its address goes in `LAUNCH_URL` (step 5).

**4. A first feature**, `tests/features/first-run.feature`:

```gherkin
Feature: First run
  Scenario: The administrator opens the sales pipeline
    Given I am a logged in user with the "admin" user
    When I open the "CRM" app
    Then I should be in the "CRM" app
    And I should see the "Qualified" column

  Scenario: A visitor searches the shop
    Given I am on "/shop"
    When I search the shop for "desk"
    Then I should see the "Customizable Desk" product in the shop
```

**5. Run it.**

```bash
npm test
```

(`LAUNCH_URL=https://mysite.ddev.site npm test` for a site at another address.)
A green first run prints every step, then the summary (the starter feature of `npx init-webship-js` and the two scenarios above, passed) and the HTML report it wrote:

```
3 scenarios (3 passed)
9 steps (9 passed)
0m32.947s (executing steps: 0m32.911s)
[webship-js] HTML report → …/odoo-tests/tests/reports/cucumber_report.html
```

From there, copy the features of [`tests/features/`](tests/features/) (they also ship in the package, under `node_modules/@webship-js/odoo-steps/tests/features/`): together they use every step of the pack.

### What the suite tests

The features of this repository run every step of the pack against the demo-data site, in CI on every change: logging in as each kind of user of the registry and with a login and a password, a refused login, logging out from the web client and from the website, the user menu, who holds a session, the web client and the portal; access rights (what a salesperson, an accountant, an employee and a portal user may open, an access error and its dialog, a missing delete action); the apps menu, apps, menu paths, actions by their external ID, the breadcrumb and the view switcher; the search view (search, a named field, filters, grouping, facets); the list view (records, the pager, opening and walking records, selection); the kanban view (columns, cards, dragging a card to another stage); forms (a contact created, changed and deleted; a refused save; a product with a checkbox, a selection and a price; a quotation created with its lines, confirmed, cancelled and deleted; an opportunity moved through its stages), dialogs, notifications, smart buttons and the chatter; and the website: the layout, the blog, the shop (search, a product page, the cart badge, and the order the visitor's cart opens, deleted in the back office), events, jobs, the contact form (confirmed and refused), the 404 page, the website editor (opened, its building blocks, saved and discarded, and who may not open it), and an accessibility audit of the login screen and the front page.

The suite leaves the site as it found it, apart from what Odoo records on its own: the tracking messages of an opportunity moved and moved back, the welcome messages of a user's first login, the registration mails of the event demo data, the website's visitor statistics, and the e-mail the contact form sends (it stays in the outgoing queue; the test site has no mail server).

Not tested: Odoo 18 and later (the web client moved to `/odoo`), Odoo Enterprise, other languages, the apps the build does not install (Inventory, Purchase, Manufacturing, Point of Sale, Project, Helpdesk, ...), reports and printing, the database manager, settings, dragging a building block in the website editor, and e-mail (no step reads mail).

## Requirements

- Node.js 24 or later
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
| `npm run test:paths` | No browser: a feature or a scenario named on the command line runs alone, and naming none runs the whole suite |
| `npm run docs:steps` | Writes [STEPS.md](STEPS.md) from the step definitions; `npm run docs:steps:check` fails when it is out of date |
| `npm run test:headed` | The suite in a visible browser |
| `npm run test:chromium`, `test:firefox`, `test:webkit` | The suite in one browser |

Settings read from the environment:

- `npx cucumber-js tests/features/login.feature` runs one feature and `npx cucumber-js tests/features/login.feature:<line>` one scenario (the line of its `Scenario:`); the paths of `cucumber.js` are left out when the command line names any.
- `FEATURES=tests/features/a.feature,tests/features/b.feature npm test` runs some feature files too; `CUCUMBER_TAGS=@critical npm test` runs the scenarios with a tag (the default run leaves `@wip` out).
- `ODOO_<HANDLE>_USER` and `ODOO_<HANDLE>_PASSWORD` set the login and the password of a registry account, for example `ODOO_ADMIN_PASSWORD`.
- `ODOO_DATABASE` names the database to log in to on a server that holds several.
- `WEBSHIP_VIDEO=on-failure` records the browser; `WEBSHIP_JS_ERROR_MODE=fail` fails a scenario on a JavaScript error (`@js-off` silences one scenario).
- `WEBSHIP_STEP_TIMEOUT=<milliseconds>` changes the step timeout of webship-js (45 seconds); a `timeout` key in `cucumber.js` does not.

## Test users

The accounts this repository's suite logs in as, exactly as `cucumber.js` lists them in `worldParameters.users` (the default values; `ODOO_<HANDLE>_USER` and `ODOO_<HANDLE>_PASSWORD` replace them, for example `ODOO_ADMIN_PASSWORD`). [`scripts/build-odoo.sh`](scripts/build-odoo.sh) creates them on the local test site, and CI does the same on the runner: the database's own `admin`, and [`scripts/odoo-setup.py`](scripts/odoo-setup.py) the four others with the groups of the table above. They are placeholder credentials of that throwaway site, not of any real one.

```json
{
  "admin": { "username": "admin", "password": "admin" },
  "salesperson": { "username": "salesperson", "password": "salesperson" },
  "accountant": { "username": "accountant", "password": "accountant" },
  "employee": { "username": "employee", "password": "employee" },
  "portal": { "username": "portal", "password": "portal" }
}
```

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

## Logo

The Odoo logo in this README comes from Simple Icons 16.37.0 (CC0-1.0), filled with the colour the set lists for the brand. The Odoo name and logo are trademarks of their owner; this pack is not affiliated with or endorsed by them.

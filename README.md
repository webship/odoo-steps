# odoo-steps

[![Test](https://github.com/webship/odoo-steps/actions/workflows/test.yml/badge.svg)](https://github.com/webship/odoo-steps/actions/workflows/test.yml)

Odoo-specific Cucumber step definitions for [webship-js](https://www.npmjs.com/package/webship-js) — a Playwright + Cucumber BDD testing framework. `@webship-js/odoo-steps` adds an `odoo.steps.js` step-pack that understands the markup the Odoo Website builder (and the eCommerce, Blog, Events, Jobs and core login modules bundled with it) render, so you can write readable Gherkin scenarios against the main pages of any Odoo site without hand-rolling CSS selectors.

It is a **plugin for webship-js** — it does not run standalone. It ships one file of step definitions; you drop it into an existing (or new) webship-js test project.

## What's covered

- Homepage / core Website layout (`#wrapwrap`, top menu, footer)
- Blog index and single post
- Shop index, search, product page, add-to-cart, cart badge
- Events index
- Jobs listing
- `/contactus` form
- `/web/login` login form + authentication (and the invalid-login error path)
- Sessions: log in as a user of the registry in `worldParameters.users` (a refused login fails in that step, with the message of the form), log out from the user menu, `I should be logged in as "..."`, the web client and the portal, the entries of the user menu, and `Given I am not logged in` to start as a visitor; `worldParameters.odoo.database` selects the database on a server that holds several
- 404 page

See [tests/step-definitions/](tests/step-definitions/) for the full list of steps with Gherkin examples.

The word "Odoo" is optional in every sentence: `Then I should see the top menu` and `Then I should see the Odoo top menu` are the same step, so a feature written for another webship-js step pack reads the same here. Every assertion takes `not` (`Then I should not see the login form`), waits for the page rather than reading it once, and fails with a message that says what was expected, why it failed and what to check.

## Requirements

- Node.js >= 20
- An existing [webship-js](https://www.npmjs.com/package/webship-js) 2.x test project (or run `npx init-webship-js` to create one)

## Installation

```bash
npm install --save-dev webship-js @webship-js/odoo-steps
```

Add both step-definition paths to your project's `cucumber.js`:

```javascript
module.exports = {
  default: {
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js', // webship-js core steps
      'node_modules/@webship-js/odoo-steps/tests/step-definitions/**/*.js', // this plugin
      'tests/step-definitions/**/*.js', // your own custom steps, if any
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'https://your-project.ddev.site',
      // Named accounts for `Given I am a logged in user with the "<key>" user`.
      // Keeps passwords out of feature files; override per environment.
      users: {
        admin: {
          username: process.env.ODOO_ADMIN_USER || 'admin',
          password: process.env.ODOO_ADMIN_PASSWORD || 'admin',
        },
      },
      // ...
    },
  },
};
```

This repo's own `tests/features/*.feature` files double as a working reference project.

## Quick example

```gherkin
Feature: Odoo homepage

  Scenario: Homepage renders the Odoo Website layout
    Given I am an anonymous user
    And I am on the homepage
    Then I should be on an Odoo website page
    And the response status code should be 200
    And I should see the Odoo top menu
    And I should see the Odoo footer
```

More runnable examples: [tests/features/](tests/features/).

## Running this repo's own test suite

This repository is itself a working webship-js project. Its suite runs against an Odoo 17.0 Community site that [DDEV](https://ddev.com/) starts from `.ddev/` and `scripts/build-odoo.sh` builds: a database with Odoo's demo data, the apps the features use (Contacts, CRM, Sales, Invoicing, Website with its blog, shop, events and jobs) and the accounts of the users registry in `cucumber.js`. The suite never targets a site outside the machine it runs on.

```bash
ddev start                      # Odoo 17.0 and PostgreSQL, at https://odoo-steps.ddev.site
bash scripts/build-odoo.sh      # demo data, apps, accounts

npm install
npx playwright install --with-deps chromium
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"   # Node trusts DDEV's certificate
npm test                        # runs against https://odoo-steps.ddev.site

ddev delete -Oy odoo-steps      # remove the site when done
```

`LAUNCH_URL=https://another-odoo.example npm test` points the suite at another site.

The accounts `scripts/build-odoo.sh` creates (the password of each is its login, on this local site only):

| Handle | Login | Groups |
| --- | --- | --- |
| `admin` | `admin` | Administrator |
| `salesperson` | `salesperson` | Sales: own documents only |
| `accountant` | `accountant` | Invoicing: billing |
| `employee` | `employee` | Internal user, no app-specific group |
| `portal` | `portal` | Portal |

Accounts are configuration: they are created once when the site is built and named in `worldParameters.users`; a feature never creates one. The build also uninstalls the `partner_autocomplete` module, which sends what a user types in a company name to an outside service.

Other scripts:

| Script | Effect |
| --- | --- |
| `npm test` | Full suite, pretty output |
| `npm run test:dry` | `--dry-run` — checks for undefined/ambiguous steps only |
| `npm run test:examples` | No browser: every step's JSDoc carries five `Example #n:` lines that match its own definition and no other, and every feature step resolves to exactly one definition (also runs in CI) |
| `npm run test:headed` | Headed browser |
| `npm run test:chromium` / `test:firefox` / `test:webkit` | Pick a browser |

## Contributing

Issues and pull requests are tracked on GitHub. `2.0.x` is the repository's single active branch.

## License

MIT © Webship.co — see [LICENSE](LICENSE).

### Lanes, subsets and the settings webship-js reads

- `FEATURES=tests/features/a.feature,tests/features/b.feature npm test` runs a subset of the feature files; `CUCUMBER_TAGS=@critical npm test` runs a tag lane (the default run leaves `@wip` out). `ODOO_<HANDLE>_USER` and `ODOO_<HANDLE>_PASSWORD` set the login and the password of a registry account, and `ODOO_DATABASE` names the database on a server that holds several.
- `cucumber.js` carries the `video` block (`WEBSHIP_VIDEO=on-failure` records the browser) and the `javascript` block (`WEBSHIP_JS_ERROR_MODE=fail` fails a scenario on a JavaScript error; `@js-off` silences one scenario) that webship-js reads.
- The step timeout is webship-js's own (45 seconds, set when it loads); `WEBSHIP_STEP_TIMEOUT=<milliseconds>` changes it, a `timeout` key in `cucumber.js` does not.

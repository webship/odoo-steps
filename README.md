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
- Sessions — log in as a named account from `worldParameters.users`, submit the login form robustly (an in-page submit that an overlay cannot block), and `Given I am not logged in` to end a session and land on the login form; for fast suites, snapshot an authenticated session once with webship-js's own `save the auth state` / `restore the auth state` steps
- 404 page

See [tests/step-definitions/odoo.steps.js](tests/step-definitions/odoo.steps.js) for the full list of steps with Gherkin examples.

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
      launchUrl: process.env.LAUNCH_URL || 'https://your-odoo-site.example',
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

This repository is itself a working webship-js project — its `tests/features/*.feature` files run by default against a **self-hosted Odoo 17 instance managed by [DDEV](https://ddev.com/)** (`.ddev/`), seeded with Odoo's own demo data for Website, Blog, eCommerce, Events and Jobs. Public Odoo-built sites' bot-detection blocks and rate-limits automated CI traffic, so this repo never targets one.

```bash
ddev start
ddev exec -s odoo -- odoo -d demo --db_host=db --db_user=odoo --db_password=odoo \
  --stop-after-init -i website,website_blog,website_sale,website_event,hr_recruitment
docker restart ddev-odoo-steps-odoo   # pick up the demo database

npm install
npx playwright install --with-deps chromium
npm test                       # runs against http://localhost:8069
LAUNCH_URL=https://your-site.example npm test   # runs against your own site instead

ddev delete -Oy odoo-steps     # tear down when done
```

Other scripts:

| Script | Effect |
| --- | --- |
| `npm test` | Full suite, pretty output |
| `npm run test:dry` | `--dry-run` — checks for undefined/ambiguous steps only |
| `npm run test:headed` | Headed browser |
| `npm run test:chromium` / `test:firefox` / `test:webkit` | Pick a browser |

## Contributing

Issues and pull requests are tracked on GitHub. `2.0.x` is the repository's single active branch.

## License

MIT © Webship.co — see [LICENSE](LICENSE).

# odoo-steps

[![Test](https://github.com/webship/odoo-steps/actions/workflows/test.yml/badge.svg)](https://github.com/webship/odoo-steps/actions/workflows/test.yml)

Odoo-specific Cucumber step definitions for [webship-js](https://www.npmjs.com/package/webship-js) — a Playwright + Cucumber BDD testing framework. `@webship/odoo-steps` adds an `odoo.steps.js` step-pack that understands the markup the Odoo Website builder (and the eCommerce, Blog, Events, Jobs and core login modules bundled with it) render, so you can write readable Gherkin scenarios against the main pages of any Odoo site without hand-rolling CSS selectors.

It is a **plugin for webship-js** — it does not run standalone. It ships one file of step definitions; you drop it into an existing (or new) webship-js test project.

## What's covered

- Core Website layout — `#wrapwrap`, top menu, footer
- Blog index, single post, post title
- Shop catalog, product page, catalog search, add-to-cart, cart badge
- Events index
- Jobs board and job openings
- `/contactus` form
- `/web/login` form, sign-in, and the rejected-credentials path
- Page-not-found template

Nothing else. Navigation, status codes, form filling, URL parameters, waits, meta tags and accessibility checks all come from webship-js's own step pack — use those directly in your feature files. See [tests/step-definitions/odoo.steps.js](tests/step-definitions/odoo.steps.js) for the full list with Gherkin examples.

## Requirements

- Node.js >= 20
- An existing [webship-js](https://www.npmjs.com/package/webship-js) 2.x test project (or run `npx init-webship-js` to create one)

## Installation

```bash
npm install --save-dev webship-js @webship/odoo-steps
```

Add both step-definition paths to your project's `cucumber.js`:

```javascript
module.exports = {
  default: {
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js', // webship-js core steps
      'node_modules/@webship/odoo-steps/tests/step-definitions/**/*.js', // this plugin
      'tests/step-definitions/**/*.js', // your own custom steps, if any
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'https://your-odoo-site.example',
      // ...
    },
  },
};
```

This repo's own `tests/features/*.feature` files double as a working reference project.

## Quick example

```gherkin
Feature: Odoo shop

  Scenario: An added product stays in the cart while the shopper keeps browsing
    Given I am on "/shop/furn-8888-office-lamp-6"
     When I add the product to the Odoo cart
     Then I should see "1" item in the Odoo cart
     When I am on "/shop"
     Then I should see "1" item in the Odoo cart
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

The Shop, Blog, Events and Jobs features are tagged `@requires-app` because they
need `website_sale`, `website_blog`, `website_event` and `hr_recruitment`. The
DDEV stack above installs all four, so `npm test` runs everything; point the
suite at a site without them and use `npm run test:core` instead.

Other scripts:

| Script | Effect |
| --- | --- |
| `npm test` | Full suite, pretty output |
| `npm run test:core` | Skips the `@requires-app` features (Shop, Blog, Events, Jobs) |
| `npm run test:dry` | `--dry-run` — checks for undefined/ambiguous steps only |
| `npm run test:headed` | Headed browser |
| `npm run test:chromium` / `test:firefox` / `test:webkit` | Pick a browser |

## Contributing

Issues and pull requests are tracked on GitHub. `2.0.x` is the repository's single active branch.

## License

MIT © Webship.co — see [LICENSE](LICENSE).

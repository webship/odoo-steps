'use strict';

// Odoo-specific step definitions for webship-js.
//
// These steps carry the one thing the core pack cannot know: which markup
// identifies each Odoo front-end app. Selectors below were read from the
// Odoo 17 addon templates themselves (website, website_blog, website_sale,
// website_event, website_hr_recruitment, web) rather than guessed — Odoo has
// no single "body class per page type" convention, so each app is matched by
// its own stable id/class.
//
// Everything the core pack already covers (navigation, status codes, form
// filling, url parameters, waits, a11y, meta tags) is used directly from
// feature files instead of being re-declared here.

const { When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { smartSettle, fillField, friendly } = require('webship-js/tests/step-definitions/webship');

// Kept under the 45s step timeout so the friendly message below surfaces
// instead of cucumber-js's "function timed out".
const PROBE_TIMEOUT = 30000;

/**
 * Wait for an Odoo template marker, reporting a tester-readable failure.
 */
async function expectMarker(page, selector, what, hint, state = 'attached') {
  try {
    await page.locator(selector).first().waitFor({ state, timeout: PROBE_TIMEOUT });
  } catch (cause) {
    throw friendly({ action: `find the ${what}`, target: selector, hint, cause });
  }
}

// ---------------------------------------------------------------------------
// Core Website layout
// ---------------------------------------------------------------------------

/**
 * Assert the page came from the Odoo Website builder — `#wrapwrap` wraps the
 * header/main/footer of every front-end app.
 *
 * Example #1: Then I should be on an Odoo website page
 * Example #2: And I should be on an Odoo website page
 * Example #3: Then we should be on an Odoo website page
 * Example #4: And should be on an Odoo website page
 * Example #5: Then I should be on a Odoo website page
 *
 */
Then(/^(I |we )*should be on an? Odoo website page$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#wrapwrap',
    'Odoo Website wrapper',
    'The response may be a backend/JSON route rather than a rendered website page.'
  );
});

/**
 * Assert the site's main navigation is visible (`#top_menu`).
 *
 * Example #1: Then I should see the Odoo top menu
 * Example #2: And I should see the Odoo main menu
 * Example #3: Then we should see the Odoo menu
 * Example #4: And should see the Odoo top menu
 * Example #5: Then I should see the Odoo main navigation menu
 *
 */
Then(/^(I |we )*should see the Odoo (?:top |main )?(?:menu|navigation menu)$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#top_menu',
    'Odoo top menu',
    'On narrow viewports the menu collapses — open the navbar toggle first.',
    'visible'
  );
});

/**
 * Assert the site footer is visible (`footer#bottom`).
 *
 * Example #1: Then I should see the Odoo footer
 * Example #2: And I should see the Odoo site footer
 * Example #3: Then we should see the Odoo page footer
 * Example #4: And should see the Odoo footer
 * Example #5: Then I should see the Odoo site footer
 *
 */
Then(/^(I |we )*should see the Odoo (?:site |page )?footer$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    'footer#bottom, #footer',
    'Odoo footer',
    'Scroll-triggered footer snippets may need the page to settle first.',
    'visible'
  );
});

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

/**
 * Assert the page is the blog index (`#o_wblog_index_content`).
 *
 * Example #1: Then I should be on the Odoo blog page
 * Example #2: And I should be on the Odoo blog index
 * Example #3: Then we should be on the Odoo blog page
 * Example #4: And should be on the Odoo blog index
 * Example #5: Then I should be on the Odoo blog listing page
 *
 */
Then(/^(I |we )*should be on the Odoo blog (?:index|page|listing page)$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#o_wblog_index_content',
    'Odoo blog index',
    'Requires the Blog app to be installed and a published blog to exist.'
  );
});

/**
 * Assert the page is a single blog post. Matched on `#o_wblog_post_main`,
 * not on the post title: the index's cover option renders the latest post's
 * title too, so a title-based check also passes on the listing.
 *
 * Example #1: Then I should be on an Odoo blog post page
 * Example #2: And I should be on a Odoo blog post page
 * Example #3: Then we should be on an Odoo blog post page
 * Example #4: And should be on an Odoo blog post page
 * Example #5: Then I should be on the Odoo single blog post page
 *
 */
Then(/^(I |we )*should be on (?:an?|the) Odoo (?:single )?blog post page$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#o_wblog_post_main',
    'Odoo blog post body',
    'The blog index looks similar — open a post before asserting this.'
  );
});

/**
 * Assert the current post's title. Scoped to the post header, because the
 * "read next" footer repeats the title markup for the following post.
 *
 * Example #1: Then I should see the Odoo blog post titled "Customer Reviews"
 * Example #2: And I should see the Odoo blog post titled "Employee Testimonials"
 * Example #3: Then we should see the Odoo blog post titled "Release Notes"
 * Example #4: And should see the Odoo blog post titled "Product Update"
 * Example #5: Then I should see the Odoo blog post titled "Company News"
 *
 */
Then(/^(I |we )*should see the Odoo blog post titled "([^"]*)?"$/, async function (pronounCase, expectedTitle) {
  const title = this.page.locator('#o_wblog_post_top #o_wblog_post_name').first();
  await expectMarker(this.page, '#o_wblog_post_top #o_wblog_post_name', 'Odoo blog post title', 'Open a blog post first.');
  const text = ((await title.textContent()) || '').trim();
  assert.ok(
    text.includes(expectedTitle),
    `Expected the blog post title to contain "${expectedTitle}" but found "${text}"`
  );
});

// ---------------------------------------------------------------------------
// Shop (eCommerce)
// ---------------------------------------------------------------------------

/**
 * Assert the page is the shop catalog (`#products_grid`).
 *
 * Example #1: Then I should be on the Odoo shop page
 * Example #2: And I should be on the Odoo shop index
 * Example #3: Then we should be on the Odoo shop page
 * Example #4: And should be on the Odoo shop index
 * Example #5: Then I should be on the Odoo shop catalog page
 *
 */
Then(/^(I |we )*should be on the Odoo shop (?:page|index|catalog page)$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#products_grid',
    'Odoo shop product grid',
    'Requires the eCommerce app and at least one product published to the website.'
  );
});

/**
 * Assert the page is a product detail page (`.o_wsale_product_page`).
 *
 * Example #1: Then I should be on an Odoo product page
 * Example #2: And I should be on a Odoo shop product page
 * Example #3: Then we should be on an Odoo product page
 * Example #4: And should be on an Odoo shop product page
 * Example #5: Then I should be on the Odoo product detail page
 *
 */
Then(/^(I |we )*should be on (?:an?|the) Odoo (?:shop )?product(?: detail)? page$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '.o_wsale_product_page',
    'Odoo product page',
    'Unpublished products return the 404 template to anonymous visitors.'
  );
});

/**
 * Search the catalog from the shop listing's own search box, not the (hidden
 * until toggled) header one the same module also renders.
 *
 * Example #1: When I search the Odoo shop for "mug"
 * Example #2: When we search the Odoo shop for "polo shirt"
 * Example #3: And I search the Odoo shop for "t-shirt"
 * Example #4: When we search the Odoo shop for "backpack"
 * Example #5: And search the Odoo shop for "notebook"
 *
 */
When(/^(I |we )*search the Odoo shop for "([^"]*)?"$/, async function (pronounCase, term) {
  const field = this.page.locator('.o_wsale_products_searchbar_form input[name="search"]').first();
  try {
    await field.waitFor({ state: 'visible', timeout: PROBE_TIMEOUT });
    await field.fill(term);
    await field.press('Enter');
  } catch (cause) {
    throw friendly({
      action: 'search the shop for',
      target: term,
      hint: 'The catalog search box is only rendered on the shop listing — go to "/shop" first.',
      cause,
    });
  }
  await smartSettle(this.page, (this.minWaitTime && this.minWaitTime.page) || 8000);
});

/**
 * Add the product shown on the current product page to the cart. When the
 * product configurator is active the click opens an "added to cart" dialog
 * instead of updating the cart directly; dismissing it via "Continue
 * Shopping" keeps the line and stays on the product page.
 *
 * Example #1: When I add the product to the Odoo cart
 * Example #2: When we add this product to the Odoo cart
 * Example #3: And I add the current product to the Odoo cart
 * Example #4: When we add the product to the Odoo cart
 * Example #5: And add this product to the Odoo cart
 *
 */
When(/^(I |we )*add (?:the |this )?(?:current )?product to the Odoo cart$/, async function (pronounCase) {
  try {
    const addToCart = this.page.locator('#add_to_cart').first();
    await addToCart.waitFor({ state: 'visible', timeout: PROBE_TIMEOUT });
    await addToCart.click();
  } catch (cause) {
    throw friendly({
      action: 'add the product to the cart',
      target: '#add_to_cart',
      hint: 'Out-of-stock or unpublished products hide this control — open a purchasable product page first.',
      cause,
    });
  }
  const continueShopping = this.page.getByRole('button', { name: 'Continue Shopping' }).first();
  if (await continueShopping.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueShopping.click();
  }
  await smartSettle(this.page, (this.minWaitTime && this.minWaitTime.page) || 8000);
});

/**
 * Assert the header cart badge count. The badge is hidden while the cart is
 * empty, so this step can only assert counts of one or more.
 *
 * Example #1: Then I should see "1" item in the Odoo cart
 * Example #2: And I should see "2" items in the Odoo cart
 * Example #3: Then we should see "3" items in the Odoo cart
 * Example #4: And should see "1" item in the Odoo cart
 * Example #5: Then we should see "10" items in the Odoo cart
 *
 */
Then(/^(I |we )*should see "([^"]*)?" items? in the Odoo cart$/, async function (pronounCase, expectedCount) {
  const badge = this.page.locator('.my_cart_quantity').first();
  await expectMarker(
    this.page,
    '.my_cart_quantity',
    'Odoo cart badge',
    'The badge stays hidden while the cart is empty — add a product first.',
    'visible'
  );
  const text = ((await badge.textContent()) || '').trim();
  assert.strictEqual(
    text,
    String(expectedCount),
    `Expected the cart badge to read "${expectedCount}" but found "${text}"`
  );
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Assert the page is the events index (`#wrap.o_wevent_index`).
 *
 * Example #1: Then I should be on the Odoo events page
 * Example #2: And I should be on the Odoo event page
 * Example #3: Then we should be on the Odoo events page
 * Example #4: And should be on the Odoo events index
 * Example #5: Then I should be on the Odoo events listing page
 *
 */
Then(/^(I |we )*should be on the Odoo events? (?:page|index|listing page)$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '.o_wevent_index',
    'Odoo events index',
    'Requires the Events app and at least one event published to the website.'
  );
});

// ---------------------------------------------------------------------------
// Jobs (recruitment)
// ---------------------------------------------------------------------------

/**
 * Assert the page is the public job board (`#jobs_grid`).
 *
 * Example #1: Then I should be on the Odoo jobs page
 * Example #2: And I should be on the Odoo careers page
 * Example #3: Then we should be on the Odoo jobs page
 * Example #4: And should be on the Odoo jobs listing page
 * Example #5: Then I should be on the Odoo recruitment page
 *
 */
Then(/^(I |we )*should be on the Odoo (?:jobs|careers|recruitment) (?:page|listing page)$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#jobs_grid',
    'Odoo job board',
    'Requires the Recruitment app and at least one position published to the website.'
  );
});

/**
 * Assert at least one job posting link is offered — every posting lives under
 * a `/jobs/` URL.
 *
 * Example #1: Then I should see Odoo job openings
 * Example #2: And I should see Odoo job listings
 * Example #3: Then we should see Odoo job openings
 * Example #4: And should see Odoo job listings
 * Example #5: Then I should see Odoo job postings
 *
 */
Then(/^(I |we )*should see Odoo job (?:openings|listings|postings)$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#jobs_grid a[href*="/jobs/"]',
    'Odoo job opening link',
    'The board renders but is empty when no position is published.',
    'visible'
  );
});

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

/**
 * Assert the default "Contact us" website form is visible
 * (`#contactus_form`, the form snippet posting to `/website/form/`).
 *
 * Example #1: Then I should see the Odoo contact us form
 * Example #2: And I should see the Odoo contact form
 * Example #3: Then we should see the Odoo contact us form
 * Example #4: And should see the Odoo contact form
 * Example #5: Then I should see the Odoo "contact us" form
 *
 */
Then(/^(I |we )*should see the Odoo (?:"contact us"|contact[ -]?us|contact) form$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    '#contactus_form',
    'Odoo contact form',
    'The page may have been edited — the form snippet keeps the id only while it is on the page.',
    'visible'
  );
});

// ---------------------------------------------------------------------------
// Authentication (/web/login)
// ---------------------------------------------------------------------------

/**
 * Assert the sign-in screen is usable: the form itself plus both credential
 * fields. Shipped by the base web module, so it exists on every Odoo site.
 *
 * Example #1: Then I should see the Odoo login form
 * Example #2: And I should see the Odoo sign in form
 * Example #3: Then we should see the Odoo login form
 * Example #4: And should see the Odoo login form
 * Example #5: Then I should see the Odoo sign-in form
 *
 */
Then(/^(I |we )*should see the Odoo (?:sign[- ]?in|login) form$/, async function (pronounCase) {
  const hint = 'An already-signed-in session is redirected away from this screen.';
  await expectMarker(this.page, 'form[action="/web/login"]', 'Odoo login form', hint, 'visible');
  await expectMarker(this.page, 'form[action="/web/login"] #login', 'Odoo login field', hint, 'visible');
  await expectMarker(this.page, 'form[action="/web/login"] #password', 'Odoo password field', hint, 'visible');
});

/**
 * Sign in with the given credentials and submit the sign-in form.
 *
 * A successful sign-in lands on the backend, which holds a longpoll
 * connection open — network-idle never fires there, so this waits on the DOM
 * only. A rejected sign-in re-renders /web/login, which resolves just as
 * fast.
 *
 * Example #1: When I log in to Odoo as "admin" with password "secret"
 * Example #2: When we log in to Odoo as "demo@example.com" with password "p@ssw0rd"
 * Example #3: When I sign in to Odoo as "admin" with password "secret"
 * Example #4: And we sign in to Odoo as "reviewer" with password "hunter2"
 * Example #5: And log in to Odoo as "portal_user" with password "letmein"
 *
 */
When(/^(I |we )*(?:log in|sign in) to Odoo as "([^"]*)?" with password "([^"]*)?"$/, async function (pronounCase, username, password) {
  await fillField(this.page, 'login', username);
  await fillField(this.page, 'password', password);
  await this.page.locator('form[action="/web/login"] button[type="submit"]').first().click();
  await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
});

/**
 * Assert the sign-in screen rejected the credentials. Scoped to the login
 * form so an unrelated site-wide alert cannot satisfy it.
 *
 * Example #1: Then I should see an Odoo login error
 * Example #2: And I should see an Odoo sign in error
 * Example #3: Then we should see an Odoo login error
 * Example #4: And should see an Odoo login error
 * Example #5: Then I should see an Odoo authentication error
 *
 */
Then(/^(I |we )*should see an Odoo (?:login|sign[- ]?in|authentication) error$/, async function (pronounCase) {
  await expectMarker(
    this.page,
    'form[action="/web/login"] .alert-danger',
    'Odoo sign-in error message',
    'Valid credentials leave the login screen instead of showing an error.',
    'visible'
  );
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

/**
 * Assert the page is Odoo's "page not found" template. Its heading is
 * visually hidden, so this checks presence rather than visibility.
 *
 * Example #1: Then I should be on the Odoo 404 page
 * Example #2: And I should be on the Odoo "not found" page
 * Example #3: Then we should be on the Odoo 404 page
 * Example #4: And should be on the Odoo 404 page
 * Example #5: Then I should land on the Odoo 404 page
 *
 */
Then(/^(I |we )*should (?:be on|land on) the Odoo (?:404|"not found") page$/, async function (pronounCase) {
  const heading = this.page.locator('h1', { hasText: '404' }).first();
  try {
    await heading.waitFor({ state: 'attached', timeout: PROBE_TIMEOUT });
  } catch (cause) {
    throw friendly({
      action: 'find the Odoo 404 heading',
      target: 'h1 containing "404"',
      hint: 'A custom 404 page may replace the default template — assert on its own content instead.',
      cause,
    });
  }
});

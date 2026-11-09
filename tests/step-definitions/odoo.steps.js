'use strict';

// Odoo-specific Cucumber step definitions for webship-js. These steps
// understand the markup the Odoo Website builder (and the eCommerce, Blog,
// Events, Jobs and core web-login modules bundled with it) renders on every
// Odoo site — #wrapwrap/#top_menu layout, o_wblog_* blog templates,
// o_wsale_* eCommerce templates, o_wevent_* events templates, o_jobs
// recruitment templates, s_website_form snippet forms, and the core
// /web/login screen — so scenarios can assert against the main pages of an
// Odoo site without hand-rolling CSS selectors in every feature file.
//
// Selectors were verified against the live markup of https://www.odoo.com
// (an Odoo-built site) rather than guessed, since Odoo (unlike WordPress)
// has no single generic "body class per page type" convention — each
// front-end app (Website, eCommerce, Blog, Events, Jobs, ...) has its own
// stable class/id conventions instead.
//
// Composes with webship-js's built-in steps (navigation.steps.js,
// assertion.steps.js, form.steps.js, response.steps.js, …) rather than
// duplicating them — use those directly in feature files wherever they
// already cover the need (e.g. "the response status code should be 200",
// "I should be on the homepage").

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { gotoUrl, waitForPageLoad, fillField } = require('webship-js/tests/step-definitions/webship');

// Fill and submit Odoo's login form. The submit is dispatched from inside the
// page rather than with a pointer click: a fixed overlay (a cookie bar, a chat
// widget) can cover the button and make a real click wait out its
// actionability timeout, while the form's own submit cannot be covered.
// A successful login redirects to the backend webclient (/web), which keeps a
// permanent longpoll connection open (Discuss/bus), so networkidle never
// fires there and the shared settle helpers would not settle: wait for the
// navigation and DOM content only. An invalid login stays on /web/login
// without a full navigation, so this resolves quickly either way.
async function submitLogin(page, username, password) {
  await fillField(page, 'login', username);
  await fillField(page, 'password', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
    page.evaluate(() => {
      const form = document.querySelector('form[action="/web/login"]');
      const submit = form && form.querySelector('button[type="submit"]');
      if (submit) { submit.click(); return; }
      if (form) form.submit();
    }),
  ]);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Core layout: #wrapwrap, top menu, footer
// ---------------------------------------------------------------------------

/**
 * Assert the current page was rendered by the Odoo Website builder, i.e. it
 * has the `#wrapwrap` element every Odoo Website page wraps its header/
 * main/footer in, regardless of which front-end app (Website, eCommerce,
 * Blog, Events, Jobs, ...) rendered the page.
 *
 * Example #1: Then I should be on an Odoo website page
 * Example #2: And I should be on an Odoo website page
 * Example #3: Then we should be on an Odoo website page
 * Example #4: And should be on an Odoo website page
 * Example #5: Then I should be on a Odoo website page
 *
 */
Then(/^(I |we )*should be on an? Odoo website page$/, async function (pronounCase) {
  const wrapwrap = this.page.locator('#wrapwrap');
  await assert.doesNotReject(
    () => wrapwrap.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo Website wrapper ("#wrapwrap") to be present'
  );
});

/**
 * Assert the Odoo Website top menu (main navigation) is visible. Matches
 * `#top_menu`, the `<ul>` every Odoo Website header renders its menu items
 * into.
 *
 * Example #1: Then I should see the Odoo top menu
 * Example #2: And I should see the Odoo main menu
 * Example #3: Then we should see the Odoo menu
 * Example #4: And should see the Odoo top menu
 * Example #5: Then I should see the Odoo main navigation menu
 *
 */
Then(/^(I |we )*should see the Odoo (?:top |main )?(?:menu|navigation menu)$/, async function (pronounCase) {
  const menu = this.page.locator('#top_menu');
  await assert.doesNotReject(
    () => menu.waitFor({ state: 'visible', timeout: 45000 }),
    'Expected the Odoo Website top menu ("#top_menu") to be visible'
  );
});

/**
 * Assert the Odoo Website footer is visible. Matches `footer#bottom`, the
 * element every Odoo Website footer snippet renders into.
 *
 * Example #1: Then I should see the Odoo footer
 * Example #2: And I should see the Odoo site footer
 * Example #3: Then we should see the Odoo page footer
 * Example #4: And should see the Odoo footer
 * Example #5: Then I should see the Odoo site footer
 *
 */
Then(/^(I |we )*should see the Odoo (?:site |page )?footer$/, async function (pronounCase) {
  const footer = this.page.locator('footer#bottom, #footer').first();
  await assert.doesNotReject(
    () => footer.waitFor({ state: 'visible', timeout: 45000 }),
    'Expected the Odoo Website footer ("footer#bottom") to be visible'
  );
});

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

/**
 * Assert the current page is the Odoo Blog index/listing template. Matches
 * `#o_wblog_index_content`, rendered by the Blog app's post-list view.
 *
 * Example #1: Then I should be on the Odoo blog page
 * Example #2: And I should be on the Odoo blog index
 * Example #3: Then we should be on the Odoo blog page
 * Example #4: And should be on the Odoo blog index
 * Example #5: Then I should be on the Odoo blog listing page
 *
 */
Then(/^(I |we )*should be on the Odoo blog (?:index|page|listing page)$/, async function (pronounCase) {
  const index = this.page.locator('#o_wblog_index_content');
  await assert.doesNotReject(
    () => index.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo Blog index template ("#o_wblog_index_content") to be present'
  );
});

/**
 * Assert the current page is a single Odoo Blog post template. Matches
 * `.o_wblog_post_title`, an element only the single-post view renders (the
 * index view's post teaser cards do not include it).
 *
 * Example #1: Then I should be on an Odoo blog post page
 * Example #2: And I should be on a Odoo blog post page
 * Example #3: Then we should be on an Odoo blog post page
 * Example #4: And should be on an Odoo blog post page
 * Example #5: Then I should be on the Odoo single blog post page
 *
 */
Then(/^(I |we )*should be on an? Odoo (?:single )?blog post page$/, async function (pronounCase) {
  // .first(): the single-post template can also render a "related posts"
  // teaser section further down the page reusing the same title class.
  const title = this.page.locator('.o_wblog_post_title').first();
  await assert.doesNotReject(
    () => title.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo single blog post template (".o_wblog_post_title") to be present'
  );
});

/**
 * Assert the current Odoo blog post's title matches the given text. Reads
 * `.o_wblog_post_title`, the single-post view's title element.
 *
 * Example #1: Then I should see the Odoo blog post titled "Customer Reviews"
 * Example #2: And I should see the Odoo blog post titled "Employee Testimonials"
 * Example #3: Then we should see the Odoo blog post titled "Release Notes"
 * Example #4: And should see the Odoo blog post titled "Product Update"
 * Example #5: Then I should see the Odoo blog post titled "Company News"
 *
 */
Then(/^(I |we )*should see the Odoo blog post titled "([^"]*)?"$/, async function (pronounCase, expectedTitle) {
  const title = this.page.locator('.o_wblog_post_title').first();
  const text = (await title.textContent()) || '';
  assert.ok(
    text.includes(expectedTitle),
    `Expected the Odoo blog post title to contain "${expectedTitle}" but found "${text.trim()}"`
  );
});

// ---------------------------------------------------------------------------
// Shop (eCommerce)
// ---------------------------------------------------------------------------

/**
 * Assert the current page is the Odoo eCommerce shop/catalog template.
 * Matches `#products_grid`, the container the "website_sale" module renders
 * the product listing into.
 *
 * Example #1: Then I should be on the Odoo shop page
 * Example #2: And I should be on the Odoo shop index
 * Example #3: Then we should be on the Odoo shop page
 * Example #4: And should be on the Odoo shop index
 * Example #5: Then I should be on the Odoo shop catalog page
 *
 */
Then(/^(I |we )*should be on the Odoo shop (?:page|index|catalog page)$/, async function (pronounCase) {
  const grid = this.page.locator('#products_grid');
  await assert.doesNotReject(
    () => grid.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo shop product grid ("#products_grid") to be present'
  );
});

/**
 * Assert the current page is an Odoo eCommerce product page. Matches
 * `.o_wsale_product_page`, rendered by "website_sale" for every product
 * detail page.
 *
 * Example #1: Then I should be on an Odoo product page
 * Example #2: And I should be on a Odoo shop product page
 * Example #3: Then we should be on an Odoo product page
 * Example #4: And should be on an Odoo shop product page
 * Example #5: Then I should be on the Odoo product detail page
 *
 */
Then(/^(I |we )*should be on an? Odoo (?:shop )?product(?: detail)? page$/, async function (pronounCase) {
  const product = this.page.locator('.o_wsale_product_page');
  await assert.doesNotReject(
    () => product.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo product page (".o_wsale_product_page") to be present'
  );
});

/**
 * Submit the Odoo shop's search form with the given term. Fills the
 * `input[name="search"]` scoped to `.o_wsale_products_searchbar_form` — the
 * shop listing's own search box, as opposed to the (hidden until toggled)
 * search field "website_sale" also renders in the page header — and presses
 * Enter.
 *
 * Example #1: When I search the Odoo shop for "mug"
 * Example #2: When we search the Odoo shop for "polo shirt"
 * Example #3: When I search the Odoo shop for "t-shirt"
 * Example #4: When we search the Odoo shop for "backpack"
 * Example #5: When I search the Odoo shop for "notebook"
 *
 */
When(/^(I |we )*search the Odoo shop for "([^"]*)?"$/, async function (pronounCase, term) {
  const defaultTime = this.minWaitTime.page || 3000;
  const searchField = this.page
    .locator('.o_wsale_products_searchbar_form input[name="search"]')
    .first();
  await searchField.waitFor({ state: 'visible', timeout: 45000 });
  await searchField.fill(term);
  await searchField.press('Enter');
  await waitForPageLoad(this.page, defaultTime);
});

/**
 * Assert the Odoo shop search returned results for the given term: the
 * product grid is present and the URL's `search` query parameter matches.
 *
 * Example #1: Then I should see Odoo shop search results for "mug"
 * Example #2: And I should see Odoo shop search results for "polo shirt"
 * Example #3: Then we should see Odoo shop search results for "t-shirt"
 * Example #4: And should see Odoo shop search results for "backpack"
 * Example #5: Then I should see Odoo shop search results for "notebook"
 *
 */
Then(/^(I |we )*should see Odoo shop search results for "([^"]*)?"$/, async function (pronounCase, term) {
  const grid = this.page.locator('#products_grid');
  await assert.doesNotReject(
    () => grid.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo shop product grid ("#products_grid") to be present'
  );
  const currentUrl = this.page.url();
  const encoded = encodeURIComponent(term).replace(/%20/g, '+');
  assert.ok(
    currentUrl.includes(`search=${encoded}`) || currentUrl.includes(`search=${encodeURIComponent(term)}`),
    `Expected the shop search URL to contain the term "${term}" but URL was: ${currentUrl}`
  );
});

/**
 * Add the current Odoo product page's product to the cart. Clicks
 * `#add_to_cart`, the "website_sale" add-to-cart control every product
 * page renders. When the "sale_product_configurator" module is installed
 * (a website_sale dependency as of Odoo 17), this opens an "Added to your
 * cart" modal instead of updating the cart directly — in that case this
 * step dismisses it via its "Continue Shopping" action, which keeps the
 * item in the cart without leaving the product page.
 *
 * Example #1: When I add the product to the Odoo cart
 * Example #2: When we add this product to the Odoo cart
 * Example #3: When I add the current product to the Odoo cart
 * Example #4: When we add the product to the Odoo cart
 * Example #5: When I add this product to the Odoo cart
 *
 */
When(/^(I |we )*add (?:the |this )?(?:current )?product to the Odoo cart$/, async function (pronounCase) {
  const defaultTime = this.minWaitTime.page || 3000;
  const addToCart = this.page.locator('#add_to_cart').first();
  await addToCart.waitFor({ state: 'visible', timeout: 45000 });
  await addToCart.click();
  const continueShopping = this.page.getByText('Continue Shopping').first();
  if (await continueShopping.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueShopping.click();
  }
  await waitForPageLoad(this.page, defaultTime);
});

/**
 * Assert the Odoo cart badge shows the given item count. Reads
 * `.my_cart_quantity`, the header cart-icon badge "website_sale" updates
 * whenever the session cart changes.
 *
 * Example #1: Then I should see "1" item in the Odoo cart
 * Example #2: And I should see "2" items in the Odoo cart
 * Example #3: Then we should see "1" item in the Odoo cart
 * Example #4: And should see "3" items in the Odoo cart
 * Example #5: Then I should see "0" items in the Odoo cart
 *
 */
Then(/^(I |we )*should see "([^"]*)?" items? in the Odoo cart$/, async function (pronounCase, expectedCount) {
  const badge = this.page.locator('.my_cart_quantity').first();
  await assert.doesNotReject(
    () => badge.waitFor({ state: 'visible', timeout: 45000 }),
    'Expected the Odoo cart quantity badge (".my_cart_quantity") to be visible'
  );
  const text = ((await badge.textContent()) || '').trim();
  assert.strictEqual(
    text,
    String(expectedCount),
    `Expected the Odoo cart quantity badge to read "${expectedCount}" but found "${text}"`
  );
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Assert the current page is the Odoo Events index/listing template.
 * Matches `.o_wevent_index`, rendered by the Events app's event-list view.
 *
 * Example #1: Then I should be on the Odoo events page
 * Example #2: And I should be on the Odoo event page
 * Example #3: Then we should be on the Odoo events page
 * Example #4: And should be on the Odoo events index
 * Example #5: Then I should be on the Odoo events listing page
 *
 */
Then(/^(I |we )*should be on the Odoo events? (?:page|index|listing page)$/, async function (pronounCase) {
  const index = this.page.locator('.o_wevent_index, .o_wevent_events_list').first();
  await assert.doesNotReject(
    () => index.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo Events index template (".o_wevent_index") to be present'
  );
});

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

/**
 * Assert the current page is the Odoo Jobs (recruitment) listing template.
 * Matches `#jobs_grid`, rendered by the Recruitment app's public job board.
 *
 * Example #1: Then I should be on the Odoo jobs page
 * Example #2: And I should be on the Odoo careers page
 * Example #3: Then we should be on the Odoo jobs page
 * Example #4: And should be on the Odoo jobs listing page
 * Example #5: Then I should be on the Odoo recruitment page
 *
 */
Then(/^(I |we )*should be on the Odoo (?:jobs|careers|recruitment) (?:page|listing page)$/, async function (pronounCase) {
  const jobs = this.page.locator('#jobs_grid');
  await assert.doesNotReject(
    () => jobs.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo Jobs listing template ("#jobs_grid") to be present'
  );
});

/**
 * Assert at least one job opening link is visible on the Odoo Jobs page.
 * Matches links whose `href` contains `/jobs/`, the URL pattern every job
 * posting page uses.
 *
 * Example #1: Then I should see Odoo job openings
 * Example #2: And I should see Odoo job listings
 * Example #3: Then we should see Odoo job openings
 * Example #4: And should see Odoo job listings
 * Example #5: Then I should see Odoo job postings
 *
 */
Then(/^(I |we )*should see Odoo job (?:openings|listings|postings)$/, async function (pronounCase) {
  const jobLink = this.page.locator('a[href*="/jobs/"]').first();
  await assert.doesNotReject(
    () => jobLink.waitFor({ state: 'visible', timeout: 45000 }),
    'Expected at least one Odoo job opening link ("a[href*=\\"/jobs/\\"]") to be visible'
  );
});

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

/**
 * Navigate to Odoo's core "Contact us" page at `/contactus`.
 *
 * Example #1: Given I am on the Odoo contact us page
 * Example #2: Given we are on the Odoo contact page
 * Example #3: Given I am on the Odoo "contact us" page
 * Example #4: Given we are on the Odoo contact-us page
 * Example #5: Given I am on the Odoo contact page
 *
 */
Given(/^(I am |we are )*on the Odoo (?:"contact us"|contact[ -]?us|contact) page$/, async function (pronounCase) {
  const defaultTime = this.minWaitTime.page || 3000;
  await gotoUrl(this.page, this.launchUrl + '/contactus');
  await this.page.waitForSelector('body', { state: 'attached', timeout: 45000 });
  await waitForPageLoad(this.page, defaultTime);
});

/**
 * Assert the Odoo "Contact us" form is visible. Matches `#contactus_form`,
 * the `s_website_form` snippet instance the Website app renders on the
 * default contact-us page.
 *
 * Example #1: Then I should see the Odoo contact us form
 * Example #2: And I should see the Odoo contact form
 * Example #3: Then we should see the Odoo contact us form
 * Example #4: And should see the Odoo contact form
 * Example #5: Then I should see the Odoo "contact us" form
 *
 */
Then(/^(I |we )*should see the Odoo (?:"contact us"|contact[ -]?us|contact) form$/, async function (pronounCase) {
  const form = this.page.locator('#contactus_form');
  await assert.doesNotReject(
    () => form.waitFor({ state: 'visible', timeout: 45000 }),
    'Expected the Odoo contact-us form ("#contactus_form") to be visible'
  );
});

// ---------------------------------------------------------------------------
// /web/login — authentication
// ---------------------------------------------------------------------------

/**
 * Navigate to Odoo's core login screen at `/web/login`. This template is
 * shared by every Odoo installation (Community and Enterprise alike) —
 * it ships in the base "web" module, not the Website builder.
 *
 * Example #1: Given I am on the Odoo login page
 * Example #2: Given we are on the Odoo login page
 * Example #3: Given I am on the Odoo sign in page
 * Example #4: Given we are on the Odoo sign-in page
 * Example #5: Given I am on the Odoo "web/login" page
 *
 */
Given(/^(I am |we are )*on the Odoo (?:sign-?in|"web\/login"|login) page$/, async function (pronounCase) {
  const defaultTime = this.minWaitTime.page || 3000;
  await gotoUrl(this.page, this.launchUrl + '/web/login');
  await this.page.waitForSelector('body', { state: 'attached', timeout: 45000 });
  await waitForPageLoad(this.page, defaultTime);
});

/**
 * Assert Odoo's core login form is visible: the form posting to
 * `/web/login`, with its `#login` and `#password` fields (`addons/web`'s
 * `webclient_templates.xml`, unchanged across Odoo versions).
 *
 * Example #1: Then I should see the Odoo login form
 * Example #2: And I should see the Odoo sign in form
 * Example #3: Then we should see the Odoo login form
 * Example #4: And should see the Odoo login form
 * Example #5: Then I should see the Odoo sign-in form
 *
 */
Then(/^(I |we )*should see the Odoo (?:sign-?in|login) form$/, async function (pronounCase) {
  const form = this.page.locator('form[action="/web/login"]');
  await assert.doesNotReject(
    () => form.waitFor({ state: 'visible', timeout: 45000 }),
    'Expected the Odoo login form ("form[action=\\"/web/login\\"]") to be visible'
  );
  await assert.doesNotReject(
    () => this.page.locator('#login').waitFor({ state: 'visible', timeout: 5000 }),
    'Expected the Odoo login/email field ("#login") to be visible'
  );
  await assert.doesNotReject(
    () => this.page.locator('#password').waitFor({ state: 'visible', timeout: 5000 }),
    'Expected the Odoo password field ("#password") to be visible'
  );
});

/**
 * Fill and submit Odoo's core login form with the given username/email and
 * password (`#login`, `#password`, the form's submit button).
 *
 * Example #1: When I log in to Odoo as "admin" with password "secret"
 * Example #2: When we log in to Odoo as "demo@example.com" with password "p@ssw0rd"
 * Example #3: When I sign in to Odoo as "admin" with password "secret"
 * Example #4: When we sign in to Odoo as "reviewer" with password "hunter2"
 * Example #5: When I log in to Odoo as "portal_user" with password "letmein"
 *
 */
When(/^(I |we )*(?:log in|sign in) to Odoo as "([^"]*)?" with password "([^"]*)?"$/, async function (pronounCase, username, password) {
  await submitLogin(this.page, username, password);
});

/**
 * Log in as a user configured in cucumber.js `worldParameters.users`, so no
 * password appears in a feature file. Each key names one account:
 * `{ admin: { username: 'admin', password: process.env.ODOO_ADMIN_PASSWORD } }`.
 * The login screen is opened first, so this step works from any page.
 *
 * Example #1: Given I am a logged in user with the "admin" user
 * Example #2: Given I am a logged in user with the username "admin"
 * Example #3: Given we are a logged in user with "portal"
 * Example #4: And a logged in user with the "admin" user
 * Example #5: Given I am a logged in user with the username "demo" user
 *
 */
Given(/^(I am |we are )*a logged in user with( the)*( username)* "([^"]*)?"( user)*$/, async function (pronounCase, theCase, usernameCase, userKey, userCase) {
  const users = (this.parameters && this.parameters.users) || {};
  const entry = users[userKey];
  if (!entry) {
    throw new Error(`User "${userKey}" is not configured. Add it to worldParameters.users in cucumber.js. Known users: ${Object.keys(users).join(', ') || '(none)'}.`);
  }
  const username = entry.username || userKey;
  const password = typeof entry === 'string' ? entry : entry.password;
  if (!password) {
    throw new Error(`User "${userKey}" has no password configured. Set worldParameters.users.${userKey}.password in cucumber.js, ideally from an environment variable.`);
  }
  await gotoUrl(this.page, this.launchUrl + '/web/login');
  await this.page.locator('#login').waitFor({ state: 'visible', timeout: 10000 });
  await submitLogin(this.page, username, password);
});

/**
 * End any authenticated session and land on the login screen as a visitor:
 * cookies and web storage are cleared, `/web/login` is opened and the core
 * login form is confirmed. Use it at the start of a scenario that must run
 * anonymously after an earlier one logged in.
 *
 * Example #1: Given I am not logged in
 * Example #2: Given we are not logged in
 * Example #3: And I am not logged in
 * Example #4: Given not logged in
 * Example #5: But I am not logged in
 *
 */
Given(/^(I am |we are )*not logged in$/, async function (pronounCase) {
  await this.context.clearCookies();
  try {
    await this.page.evaluate(() => {
      try { localStorage.clear(); } catch { /* storage may be unavailable */ }
      try { sessionStorage.clear(); } catch { /* storage may be unavailable */ }
    });
  } catch { /* the page may not be on a real URL yet */ }
  await gotoUrl(this.page, this.launchUrl + '/web/login');
  await this.page.locator('form[action="/web/login"]').waitFor({ state: 'visible', timeout: 10000 });
});

/**
 * Assert the Odoo login screen is showing an authentication error. Matches
 * the `.alert-danger` message Odoo's login controller renders on invalid
 * credentials.
 *
 * Example #1: Then I should see an Odoo login error
 * Example #2: And I should see an Odoo sign in error
 * Example #3: Then we should see an Odoo login error
 * Example #4: And should see an Odoo login error
 * Example #5: Then I should see an Odoo authentication error
 *
 */
Then(/^(I |we )*should see an Odoo (?:login|sign-?in|authentication) error$/, async function (pronounCase) {
  const error = this.page.locator('.alert-danger');
  await assert.doesNotReject(
    () => error.waitFor({ state: 'visible', timeout: 45000 }),
    'Expected an Odoo login error message (".alert-danger") to be visible'
  );
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

/**
 * Assert the current page is Odoo's core 404 template, by checking the
 * page heading for "404" (rendered by `addons/http_routing`'s
 * `http_routing.404` template on every Odoo site).
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
  await assert.doesNotReject(
    () => heading.waitFor({ state: 'attached', timeout: 45000 }),
    'Expected the Odoo 404 template (an <h1> containing "404") to be present'
  );
});

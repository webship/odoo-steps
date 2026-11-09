'use strict';

// Odoo-specific Cucumber step definitions for webship-js. These steps
// understand the markup the Odoo Website builder (and the eCommerce, Blog,
// Events, Jobs and core web-login modules bundled with it) renders on every
// Odoo site: the #wrapwrap/#top_menu layout, o_wblog_* blog templates,
// o_wsale_* eCommerce templates, o_wevent_* events templates, o_jobs
// recruitment templates, s_website_form snippet forms, and the core
// /web/login screen. Scenarios assert against the main pages of an Odoo site
// without hand-rolling CSS selectors in every feature file.
//
// The Gherkin phrasing stays product-agnostic: the word "Odoo" is optional in
// every sentence ("I should see the top menu" and "I should see the Odoo top
// menu" are the same step), so a feature written for another step pack reads
// the same here. Only these comments and the error messages name the product,
// to document which convention each step targets.
//
// Composes with webship-js's built-in steps (navigation.steps.js,
// assertion.steps.js, form.steps.js, response.steps.js, ...) rather than
// duplicating them: use those directly in feature files wherever they already
// cover the need ("the response status code should be 200", "the path should
// be "/web"").

const { Given, When, Then } = require('@cucumber/cucumber');
const { gotoUrl, waitForPageLoad, fillField, friendly } = require('webship-js/tests/step-definitions/webship');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Kept well under webship-js's 45s step timeout so a locator that never
// settles fails through the authored message (with its hint), not as
// "function timed out".
const WAIT_TIMEOUT = 30000;

// The per-page wait budget from `worldParameters.minWaitTime.page`.
function budget(world) {
  return (world && world.minWaitTime && world.minWaitTime.page) || 3000;
}

// Join the launch URL and a path with exactly one slash.
function siteUrl(world, path) {
  return String(world.launchUrl).replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
}

// Open a path on the site under test and wait for the page to settle.
async function navigate(world, path) {
  await gotoUrl(world.page, siteUrl(world, path));
  await world.page.waitForSelector('body', { state: 'attached', timeout: WAIT_TIMEOUT });
  await waitForPageLoad(world.page, budget(world));
}

// Assert an element is present or, when the step said "not", absent. The
// assertion is the wait: Playwright polls the locator for the wanted state and
// a miss fails through a friendly message with a hint. `attached` picks
// presence-in-DOM over visibility for template markers a theme may render
// off-screen.
async function assertPresence(locator, notCase, label, { attached = false, hint, timeout = WAIT_TIMEOUT } = {}) {
  const state = attached ? (notCase ? 'detached' : 'attached') : (notCase ? 'hidden' : 'visible');
  try {
    await locator.waitFor({ state, timeout });
  } catch (error) {
    throw friendly({
      message: notCase ? `Expected ${label} to be absent.` : `Expected ${label} to be present.`,
      cause: error,
      hint,
    });
  }
}

// Whitespace-tolerant, case-sensitive regex for "contains this text", so a
// Playwright `hasText` filter can be the wait.
function textPattern(text, { exact = false } = {}) {
  const body = text.trim().split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  return new RegExp(exact ? `^\\s*${body}\\s*$` : body);
}

// Assert a locator's text contains (or, with `notCase`, does not contain) the
// expected text: the locator is narrowed to "has this text" and Playwright
// polls for that narrowed set to exist or to be gone.
async function assertText(locator, expectedText, notCase, label, { exact = false, hint, timeout = WAIT_TIMEOUT } = {}) {
  const withText = locator.filter({ hasText: textPattern(expectedText, { exact }) });
  try {
    await withText.waitFor({ state: notCase ? 'detached' : 'attached', timeout });
  } catch (error) {
    const text = ((await locator.textContent({ timeout: 1000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    throw friendly({
      message: notCase
        ? `Expected ${label} not to ${exact ? 'read' : 'contain'} "${expectedText}".`
        : `Expected ${label} to ${exact ? 'read' : 'contain'} "${expectedText}".`,
      cause: `it reads "${text}"`,
      hint,
    });
  }
}

// Fill and submit Odoo's login form. The submit is dispatched from inside the
// page rather than with a pointer click: a fixed overlay (a cookie bar, a chat
// widget) can cover the button and make a real click wait out its
// actionability timeout, while the form's own submit cannot be covered.
// A successful login redirects to the backend webclient (/web), which keeps a
// permanent longpoll connection open (Discuss/bus), so networkidle never
// fires there and the shared settle helpers would not settle: wait for the
// navigation and DOM content only. An invalid login stays on /web/login
// without a full navigation, so this resolves quickly either way.
async function submitLogin(world, username, password) {
  const page = world.page;
  try {
    await page.locator('#login').waitFor({ state: 'visible', timeout: budget(world) });
  } catch (error) {
    throw friendly({
      action: 'find the login form',
      target: 'form[action="/web/login"]',
      cause: error,
      hint: 'Open the login page first ("Given I am on the login page"); a site that replaces /web/login needs its own step.',
    });
  }
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
 * Assert the current page was, or was not, rendered by the Odoo Website
 * builder: it has the `#wrapwrap` element every Odoo Website page wraps its
 * header, main and footer in, regardless of which front-end app (Website,
 * eCommerce, Blog, Events, Jobs, ...) rendered the page.
 *
 * Example #1: Then I should be on an Odoo website page
 * Example #2: And I should be on a website page
 * Example #3: Then we should be on an Odoo website page
 * Example #4: And should not be on a website page
 * Example #5: Then I should not be on an Odoo website page
 *
 */
Then(/^(I |we )*should( not)* be on an? (?:Odoo )?website page$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('#wrapwrap'), notCase, 'the Website wrapper ("#wrapwrap")', {
    attached: true,
    hint: 'Every page the Odoo Website builder renders carries #wrapwrap; the backend webclient (/web) and the login screen do not.',
  });
});

/**
 * Assert the Website top menu (main navigation) is, or is not, visible.
 * Matches `#top_menu`, the `<ul>` every Odoo Website header renders its menu
 * items into.
 *
 * Example #1: Then I should see the Odoo top menu
 * Example #2: And I should see the main menu
 * Example #3: Then we should see the Odoo menu
 * Example #4: And should not see the top menu
 * Example #5: Then I should see the main navigation menu
 *
 */
Then(/^(I |we )*should( not)* see the (?:Odoo )?(?:top |main )?(?:menu|navigation menu)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('#top_menu').first(), notCase, 'the Website top menu ("#top_menu")', {
    hint: 'The header renders #top_menu on every Website page; a header template without a menu, or a hidden header, leaves it out.',
  });
});

/**
 * Assert the Website footer is, or is not, visible. Matches `footer#bottom`,
 * the element every Odoo Website footer snippet renders into.
 *
 * Example #1: Then I should see the Odoo footer
 * Example #2: And I should see the site footer
 * Example #3: Then we should see the Odoo page footer
 * Example #4: And should not see the footer
 * Example #5: Then I should not see the Odoo site footer
 *
 */
Then(/^(I |we )*should( not)* see the (?:Odoo )?(?:site |page )?footer$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('footer#bottom, #footer').first(), notCase, 'the Website footer ("footer#bottom")', {
    hint: 'The footer can be hidden per page in the Website builder (page properties); check the page, not the theme.',
  });
});

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

/**
 * Assert the current page is, or is not, the Blog index/listing template.
 * Matches `#o_wblog_index_content`, rendered by the Blog app's post-list view.
 *
 * Example #1: Then I should be on the Odoo blog page
 * Example #2: And I should be on the blog index
 * Example #3: Then we should be on the Odoo blog page
 * Example #4: And should not be on the blog index
 * Example #5: Then I should be on the blog listing page
 *
 */
Then(/^(I |we )*should( not)* be on the (?:Odoo )?blog (?:index|page|listing page)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('#o_wblog_index_content'), notCase, 'the Blog index template ("#o_wblog_index_content")', {
    attached: true,
    hint: 'The Blog index lives at /blog once the website_blog app is installed and at least one blog exists.',
  });
});

/**
 * Assert the current page is, or is not, a single blog post template.
 * Matches `.o_wblog_post_title`, an element only the single-post view renders
 * (the index view's post teaser cards do not include it).
 *
 * Example #1: Then I should be on an Odoo blog post page
 * Example #2: And I should be on a blog post page
 * Example #3: Then we should be on the Odoo single blog post page
 * Example #4: And should not be on a blog post page
 * Example #5: Then I should not be on the single blog post page
 *
 */
Then(/^(I |we )*should( not)* be on (?:an?|the) (?:Odoo )?(?:single )?blog post page$/, async function (pronounCase, notCase) {
  // .first(): the single-post template can also render a "related posts"
  // teaser section further down the page reusing the same title class.
  await assertPresence(this.page.locator('.o_wblog_post_title').first(), notCase, 'the single blog post template (".o_wblog_post_title")', {
    attached: true,
    hint: 'Open a post from the blog index first; the index itself renders teaser cards without this title element.',
  });
});

/**
 * Assert the blog post on screen has, or does not have, the given title.
 * Reads `.o_wblog_post_title`, the single-post view's title element, and
 * waits for the text to be there.
 *
 * Example #1: Then I should see the Odoo blog post titled "Customer Reviews"
 * Example #2: And I should see the blog post titled "Employee Testimonials"
 * Example #3: Then we should see the Odoo blog post titled "Release Notes"
 * Example #4: And should not see the blog post titled "Product Update"
 * Example #5: Then I should see the blog post titled "Company News"
 *
 */
Then(/^(I |we )*should( not)* see the (?:Odoo )?blog post titled "([^"]*)?"$/, async function (pronounCase, notCase, expectedTitle) {
  const title = this.page.locator('.o_wblog_post_title').first();
  await assertPresence(title, undefined, 'the blog post title (".o_wblog_post_title")', {
    attached: true,
    hint: 'Open a single blog post first.',
  });
  await assertText(title, expectedTitle, notCase, 'the blog post title', {
    hint: 'Text is matched as a substring, whitespace-collapsed but case-sensitive.',
  });
});

// ---------------------------------------------------------------------------
// Shop (eCommerce)
// ---------------------------------------------------------------------------

/**
 * Assert the current page is, or is not, the eCommerce shop/catalog template.
 * Matches `#products_grid`, the container the "website_sale" module renders
 * the product listing into.
 *
 * Example #1: Then I should be on the Odoo shop page
 * Example #2: And I should be on the shop index
 * Example #3: Then we should be on the Odoo shop page
 * Example #4: And should not be on the shop index
 * Example #5: Then I should be on the shop catalog page
 *
 */
Then(/^(I |we )*should( not)* be on the (?:Odoo )?shop (?:page|index|catalog page)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('#products_grid'), notCase, 'the shop product grid ("#products_grid")', {
    attached: true,
    hint: 'The shop lives at /shop once the website_sale app is installed and at least one product is published.',
  });
});

/**
 * Assert the current page is, or is not, an eCommerce product page. Matches
 * `.o_wsale_product_page`, rendered by "website_sale" for every product
 * detail page.
 *
 * Example #1: Then I should be on an Odoo product page
 * Example #2: And I should be on a shop product page
 * Example #3: Then we should be on the Odoo product detail page
 * Example #4: And should not be on a product page
 * Example #5: Then I should not be on the product detail page
 *
 */
Then(/^(I |we )*should( not)* be on (?:an?|the) (?:Odoo )?(?:shop )?product(?: detail)? page$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('.o_wsale_product_page'), notCase, 'the product page (".o_wsale_product_page")', {
    attached: true,
    hint: 'Open a product from the shop grid first ("When I open the first product in the shop").',
  });
});

/**
 * Open a product from the shop grid on screen: the first one by default, or
 * the n-th. Reads the product link from `#products_grid` and navigates to it,
 * so no product slug appears in the feature file.
 *
 * Example #1: When I open the first product in the Odoo shop
 * Example #2: And I open the first product in the shop
 * Example #3: When we open the 2nd product in the shop
 * Example #4: And open the first item in the Odoo shop
 * Example #5: When I open the 3rd product in the shop
 *
 */
When(/^(I |we )*open the (first|\d+(?:st|nd|rd|th)) (?:product|item) in the (?:Odoo )?shop$/, async function (pronounCase, position) {
  const index = position === 'first' ? 0 : parseInt(position, 10) - 1;
  const links = this.page.locator('#products_grid .oe_product a[href*="/shop/"]');
  const link = links.nth(index);
  try {
    await link.waitFor({ state: 'attached', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: 'find a product in the shop grid',
      target: `product ${index + 1} in "#products_grid"`,
      cause: error,
      hint: 'Open the shop page first and make sure the catalog lists at least that many published products.',
    });
  }
  const href = await link.getAttribute('href');
  if (!href) {
    throw friendly({
      message: `Product ${index + 1} in the shop grid has no link.`,
      hint: 'The product card should link to its /shop/<product> page; check the grid template.',
    });
  }
  await navigate(this, href);
});

/**
 * Submit the shop's search form with the given term. Fills the
 * `input[name="search"]` scoped to `.o_wsale_products_searchbar_form`, the
 * shop listing's own search box, as opposed to the (hidden until toggled)
 * search field "website_sale" also renders in the page header, and presses
 * Enter.
 *
 * Example #1: When I search the Odoo shop for "mug"
 * Example #2: When we search the shop for "polo shirt"
 * Example #3: And search the Odoo shop for "t-shirt"
 * Example #4: When we search the shop for "backpack"
 * Example #5: And I search the shop for "notebook"
 *
 */
When(/^(I |we )*search the (?:Odoo )?shop for "([^"]*)?"$/, async function (pronounCase, term) {
  const searchField = this.page.locator('.o_wsale_products_searchbar_form input[name="search"]').first();
  try {
    await searchField.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: 'find the shop search box',
      target: '.o_wsale_products_searchbar_form input[name="search"]',
      cause: error,
      hint: 'Open the shop page first; the search bar is a shop option a site can turn off in the Website builder.',
    });
  }
  await searchField.fill(term);
  await searchField.press('Enter');
  await waitForPageLoad(this.page, budget(this));
});

/**
 * Assert the shop search returned results for the given term: the product
 * grid is present and the URL's `search` query parameter carries the term.
 *
 * Example #1: Then I should see Odoo shop search results for "mug"
 * Example #2: And I should see shop search results for "polo shirt"
 * Example #3: Then we should see Odoo shop search results for "t-shirt"
 * Example #4: And should see shop search results for "backpack"
 * Example #5: Then I should see the shop search results for "notebook"
 *
 */
Then(/^(I |we )*should see (?:the )?(?:Odoo )?shop search results for "([^"]*)?"$/, async function (pronounCase, term) {
  await assertPresence(this.page.locator('#products_grid'), undefined, 'the shop product grid ("#products_grid")', {
    attached: true,
    hint: 'A search that matches nothing still renders the grid with an empty-state message; a missing grid means the search left the shop.',
  });
  // A space reaches the URL as `+` or `%20` depending on whether the form or
  // a direct navigation submitted it.
  const encoded = encodeURIComponent(term);
  const carriesTerm = (url) => url.includes(`search=${encoded.replace(/%20/g, '+')}`) || url.includes(`search=${encoded}`);
  try {
    await this.page.waitForURL((url) => carriesTerm(String(url)), { timeout: budget(this) });
  } catch (error) {
    throw friendly({
      message: `Expected the shop URL to carry the search term "${term}".`,
      cause: `the URL is ${this.page.url()}`,
      hint: 'Run "When I search the shop for ..." first, with the same term.',
    });
  }
});

/**
 * Add the product on screen to the cart. Clicks `#add_to_cart`, the
 * "website_sale" add-to-cart control every product page renders. When the
 * "sale_product_configurator" module is installed (a website_sale dependency
 * as of Odoo 17), this opens an "Added to your cart" dialog instead of
 * updating the cart directly; the step then dismisses it through its
 * "Continue Shopping" action, which keeps the item in the cart without
 * leaving the product page.
 *
 * Example #1: When I add the product to the Odoo cart
 * Example #2: When we add this product to the cart
 * Example #3: And add the current product to the Odoo cart
 * Example #4: When we add the product to the cart
 * Example #5: And I add this product to the cart
 *
 */
When(/^(I |we )*add (?:the |this )?(?:current )?product to the (?:Odoo )?cart$/, async function (pronounCase) {
  const addToCart = this.page.locator('#add_to_cart').first();
  try {
    await addToCart.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
    await addToCart.click();
  } catch (error) {
    throw friendly({
      action: 'click the add-to-cart button',
      target: '#add_to_cart',
      cause: error,
      hint: 'Open a product page first; a product that is out of stock or not published has no add-to-cart button.',
    });
  }
  const continueShopping = this.page.getByRole('button', { name: /Continue Shopping/i }).or(this.page.getByText('Continue Shopping')).first();
  if (await continueShopping.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueShopping.click();
  }
  await waitForPageLoad(this.page, budget(this));
});

/**
 * Assert the cart badge shows, or does not show, the given item count. Reads
 * `.my_cart_quantity`, the header cart-icon badge "website_sale" updates
 * whenever the session cart changes, and waits for it to read that number.
 *
 * Example #1: Then I should see "1" item in the Odoo cart
 * Example #2: And I should see "2" items in the cart
 * Example #3: Then we should see "1" item in the Odoo cart
 * Example #4: And should not see "3" items in the cart
 * Example #5: Then I should see "0" items in the cart
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)?" items? in the (?:Odoo )?cart$/, async function (pronounCase, notCase, expectedCount) {
  const badge = this.page.locator('.my_cart_quantity').first();
  await assertPresence(badge, undefined, 'the cart quantity badge (".my_cart_quantity")', {
    hint: 'The badge sits on the header cart icon; a header without the cart link (an eCommerce option) has no badge.',
  });
  await assertText(badge, String(expectedCount), notCase, 'the cart quantity badge', {
    exact: true,
    hint: 'The badge is updated by the add-to-cart request; a configurator dialog left open keeps the old count.',
  });
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Assert the current page is, or is not, the Events index/listing template.
 * Matches `.o_wevent_index`, rendered by the Events app's event-list view.
 *
 * Example #1: Then I should be on the Odoo events page
 * Example #2: And I should be on the event page
 * Example #3: Then we should be on the Odoo events page
 * Example #4: And should not be on the events index
 * Example #5: Then I should be on the events listing page
 *
 */
Then(/^(I |we )*should( not)* be on the (?:Odoo )?events? (?:page|index|listing page)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('.o_wevent_index, .o_wevent_events_list').first(), notCase, 'the Events index template (".o_wevent_index")', {
    attached: true,
    hint: 'The events list lives at /event once the website_event app is installed.',
  });
});

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

/**
 * Assert the current page is, or is not, the Jobs (recruitment) listing
 * template. Matches `#jobs_grid`, rendered by the Recruitment app's public job
 * board.
 *
 * Example #1: Then I should be on the Odoo jobs page
 * Example #2: And I should be on the careers page
 * Example #3: Then we should be on the Odoo jobs page
 * Example #4: And should not be on the jobs listing page
 * Example #5: Then I should be on the recruitment page
 *
 */
Then(/^(I |we )*should( not)* be on the (?:Odoo )?(?:jobs|careers|recruitment) (?:page|listing page)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('#jobs_grid'), notCase, 'the Jobs listing template ("#jobs_grid")', {
    attached: true,
    hint: 'The job board lives at /jobs once the hr_recruitment app is installed with its website module.',
  });
});

/**
 * Assert at least one job opening link is, or none is, visible on the Jobs
 * page. Matches links whose `href` contains `/jobs/`, the URL pattern every
 * job posting page uses.
 *
 * Example #1: Then I should see Odoo job openings
 * Example #2: And I should see job listings
 * Example #3: Then we should see Odoo job openings
 * Example #4: And should not see job listings
 * Example #5: Then I should see job postings
 *
 */
Then(/^(I |we )*should( not)* see (?:Odoo )?job (?:openings|listings|postings)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('a[href*="/jobs/"]').first(), notCase, 'a job opening link ("a[href*=\\"/jobs/\\"]")', {
    hint: 'Only published job positions are listed; publish one from the Recruitment app or drop the scenario.',
  });
});

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

/**
 * Navigate to the core "Contact us" page at `/contactus`.
 *
 * Example #1: Given I am on the Odoo contact us page
 * Example #2: Given we are on the contact page
 * Example #3: Given I am on the Odoo "contact us" page
 * Example #4: And on the contact-us page
 * Example #5: Given I am on the contact page
 *
 */
Given(/^(I am |we are )*on the (?:Odoo )?(?:"contact us"|contact[ -]?us|contact) page$/, async function (pronounCase) {
  await navigate(this, '/contactus');
});

/**
 * Assert the "Contact us" form is, or is not, visible. Matches
 * `#contactus_form`, the `s_website_form` snippet instance the Website app
 * renders on the default contact-us page.
 *
 * Example #1: Then I should see the Odoo contact us form
 * Example #2: And I should see the contact form
 * Example #3: Then we should see the Odoo contact us form
 * Example #4: And should not see the contact form
 * Example #5: Then I should see the "contact us" form
 *
 */
Then(/^(I |we )*should( not)* see the (?:Odoo )?(?:"contact us"|contact[ -]?us|contact) form$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('#contactus_form'), notCase, 'the contact-us form ("#contactus_form")', {
    hint: 'The default /contactus page renders the form snippet with this id; a redesigned page may have dropped or renamed it.',
  });
});

// ---------------------------------------------------------------------------
// /web/login: authentication
// ---------------------------------------------------------------------------

/**
 * Navigate to the core login screen at `/web/login`. This template is shared
 * by every Odoo installation (Community and Enterprise alike): it ships in
 * the base "web" module, not the Website builder.
 *
 * Example #1: Given I am on the Odoo login page
 * Example #2: Given we are on the login page
 * Example #3: Given I am on the sign in page
 * Example #4: And on the Odoo sign-in page
 * Example #5: Given I am on the web/login page
 *
 */
Given(/^(I am |we are )*on the (?:Odoo )?(?:sign[- ]?in|web\/login|login) page$/, async function (pronounCase) {
  await navigate(this, '/web/login');
});

/**
 * Assert the core login form is, or is not, visible: the form posting to
 * `/web/login`, with its `#login` and `#password` fields (`addons/web`'s
 * `webclient_templates.xml`, unchanged across Odoo versions). Each part is
 * checked separately so a failure names which one is missing.
 *
 * Example #1: Then I should see the Odoo login form
 * Example #2: And I should see the sign in form
 * Example #3: Then we should see the login form
 * Example #4: And should not see the login form
 * Example #5: Then I should see the Odoo sign-in form
 *
 */
Then(/^(I |we )*should( not)* see the (?:Odoo )?(?:sign[- ]?in|login) form$/, async function (pronounCase, notCase) {
  const hint = 'The core login screen is /web/login; an authenticated session is redirected away from it to /web.';
  await assertPresence(this.page.locator('form[action="/web/login"]'), notCase, 'the login form ("form[action=\\"/web/login\\"]")', { hint });
  if (notCase) return;
  await assertPresence(this.page.locator('#login'), undefined, 'the login/email field ("#login")', { hint, timeout: 5000 });
  await assertPresence(this.page.locator('#password'), undefined, 'the password field ("#password")', { hint, timeout: 5000 });
});

/**
 * Fill and submit the core login form with the given username/email and
 * password (`#login`, `#password`, the form's submit button), for scenarios
 * where the credentials are the subject. Requires the login screen to be
 * open already.
 *
 * Example #1: When I log in to Odoo as "admin" with password "secret"
 * Example #2: When we log in as "demo@example.com" with password "p@ssw0rd"
 * Example #3: And I sign in to Odoo as "admin" with password "secret"
 * Example #4: When we sign-in as "reviewer" with password "hunter2"
 * Example #5: And log in as "portal_user" with password "letmein"
 *
 */
When(/^(I |we )*(?:log in|sign[- ]?in)(?: to Odoo)? as "([^"]*)?" with password "([^"]*)?"$/, async function (pronounCase, username, password) {
  await submitLogin(this, username, password);
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
    throw friendly({
      message: `User "${userKey}" is not configured.`,
      hint: `Add it to worldParameters.users in cucumber.js. Known users: ${Object.keys(users).join(', ') || '(none)'}.`,
    });
  }
  const username = entry.username || userKey;
  const password = typeof entry === 'string' ? entry : entry.password;
  if (!password) {
    throw friendly({
      message: `User "${userKey}" has no password configured.`,
      hint: `Set worldParameters.users.${userKey}.password in cucumber.js, ideally from an environment variable.`,
    });
  }
  // Start from a fresh session: an authenticated visitor is redirected away
  // from /web/login and would never see the form.
  await this.context.clearCookies();
  await navigate(this, '/web/login');
  await submitLogin(this, username, password);
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
  await navigate(this, '/web/login');
  await assertPresence(this.page.locator('form[action="/web/login"]'), undefined, 'the login form (the session should be anonymous)', {
    timeout: 10000,
    hint: 'An authenticated session is redirected from /web/login to /web; clearing the cookies should have ended it.',
  });
});

/**
 * Assert the login screen is, or is not, showing an authentication error,
 * optionally containing a text. Matches the `.alert-danger` message the login
 * controller renders on invalid credentials.
 *
 * Example #1: Then I should see an Odoo login error
 * Example #2: And I should see a sign in error
 * Example #3: Then we should see a login error "Wrong login/password"
 * Example #4: And should not see a login error
 * Example #5: Then I should see an authentication error message
 *
 */
Then(/^(I |we )*should( not)* see an? (?:Odoo )?(?:login|sign[- ]?in|authentication) error(?: message)?(?: "([^"]*)")?$/, async function (pronounCase, notCase, expectedText) {
  const error = this.page.locator('form[action="/web/login"] .alert-danger, .alert-danger').first();
  const hint = 'The core login screen renders the notice inside the form after a wrong login or password.';
  if (notCase && !expectedText) {
    await assertPresence(error, notCase, 'a login error message (".alert-danger")', { hint });
    return;
  }
  await assertPresence(error, undefined, 'a login error message (".alert-danger")', { hint });
  if (expectedText) {
    await assertText(error, expectedText, notCase, 'the login error message', { hint });
  }
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

/**
 * Assert the current page is, or is not, the core 404 template, by checking
 * the page heading for "404" (rendered by `addons/http_routing`'s
 * `http_routing.404` template on every Odoo site).
 *
 * Example #1: Then I should be on the Odoo 404 page
 * Example #2: And I should be on the not found page
 * Example #3: Then we should be on the Odoo 404 page
 * Example #4: And should not be on the 404 page
 * Example #5: Then I should land on the Odoo 404 page
 *
 */
Then(/^(I |we )*should( not)* (?:be on|land on) the (?:Odoo )?(?:404|not found|page not found) page$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('h1', { hasText: '404' }).first(), notCase, 'the 404 template (an <h1> containing "404")', {
    attached: true,
    hint: 'A site with a custom 404 page keeps the status code but may drop the "404" heading; assert the status code with the response step instead.',
  });
});

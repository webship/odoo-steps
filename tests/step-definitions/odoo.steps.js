'use strict';

// Odoo-specific Cucumber step definitions for webship-js. These steps
// understand the markup the Odoo Website builder (and the eCommerce, Blog,
// Events, Jobs and core web-login modules bundled with it) renders on every
// Odoo site: the #wrapwrap/#top_menu layout, o_wblog_* blog templates,
// o_wsale_* eCommerce templates, o_wevent_* events templates, o_jobs
// recruitment templates and s_website_form snippet forms. Scenarios assert
// against the main pages of an Odoo site without hand-rolling CSS selectors
// in every feature file. The session steps (the login screen, the users
// registry, logging out) are in odoo-session.steps.js; odoo-helpers.js holds
// what the step files share.
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
const { waitForPageLoad, friendly } = require('webship-js/tests/step-definitions/webship');
const { WAIT_TIMEOUT, budget, navigate, assertPresence, assertText } = require('./odoo-helpers');


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

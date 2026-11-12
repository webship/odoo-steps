'use strict';

// Website steps for Odoo: the pages the Website app and its companions (Blog,
// eCommerce, Events, Jobs) serve to visitors. The steps know the markup these
// apps render: the `#wrapwrap` layout with its top menu and footer, the blog
// and shop templates, the events and jobs lists, the contact form and the 404
// page.
//
// The session steps are in odoo-session.steps.js, the web client steps in
// odoo-webclient.steps.js and the record steps in odoo-record.steps.js;
// odoo-helpers.js holds what they share.
//
// The steps work next to webship-js's built-in steps and do not repeat them:
// use those in a feature wherever they cover the need ("the response status
// code should be 200", "the path should be "/shop"").

const { Given, When, Then } = require('@cucumber/cucumber');
const { waitForPageLoad, friendly } = require('webship-js/tests/step-definitions/webship');
const {
  WAIT_TIMEOUT,
  SHORT_TIMEOUT,
  budget,
  settle,
  navigate,
  assertPresence,
  assertText,
  listTexts,
  textPattern,
} = require('./odoo-helpers');

// ---------------------------------------------------------------------------
// Core layout: #wrapwrap, top menu, footer
// ---------------------------------------------------------------------------

/**
 * Assert the current page was, or was not, rendered by the Odoo Website
 * builder: it has the `#wrapwrap` element every Odoo Website page wraps its
 * header, main and footer in, regardless of which front-end app (Website,
 * eCommerce, Blog, Events, Jobs, ...) rendered the page.
 *
 * Example #1: Then I should be on a website page
 * Example #2: And we should not be on a website page
 * Example #3: Then we should be on a website page
 * Example #4: And should not be on a website page
 * Example #5: Then I should not be on a website page
 *
 */
Then(/^(I |we )*should( not)* be on a website page$/, async function (pronounCase, notCase) {
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
 * Example #1: Then I should see the top menu
 * Example #2: And I should see the main menu
 * Example #3: Then we should see the menu
 * Example #4: And should not see the top menu
 * Example #5: Then I should see the main navigation menu
 *
 */
Then(/^(I |we )*should( not)* see the (?:top |main )?(?:menu|navigation menu)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('#top_menu').first(), notCase, 'the Website top menu ("#top_menu")', {
    hint: 'The header renders #top_menu on every Website page; a header template without a menu, or a hidden header, leaves it out.',
  });
});

/**
 * Assert the Website footer is, or is not, visible. Matches `footer#bottom`,
 * the element every Odoo Website footer snippet renders into.
 *
 * Example #1: Then I should see the footer
 * Example #2: And I should see the site footer
 * Example #3: Then we should see the page footer
 * Example #4: And should not see the footer
 * Example #5: Then I should not see the site footer
 *
 */
Then(/^(I |we )*should( not)* see the (?:site |page )?footer$/, async function (pronounCase, notCase) {
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
 * Example #1: Then I should be on the blog page
 * Example #2: And I should be on the blog index
 * Example #3: Then we should be on the blog page
 * Example #4: And should not be on the blog index
 * Example #5: Then I should be on the blog listing page
 *
 */
Then(/^(I |we )*should( not)* be on the blog (?:index|page|listing page)$/, async function (pronounCase, notCase) {
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
 * Example #1: Then I should be on an blog post page
 * Example #2: And I should be on a blog post page
 * Example #3: Then we should be on the single blog post page
 * Example #4: And should not be on a blog post page
 * Example #5: Then I should not be on the single blog post page
 *
 */
Then(/^(I |we )*should( not)* be on (?:an?|the) (?:single )?blog post page$/, async function (pronounCase, notCase) {
  // .first(): the single-post template can also render a "related posts"
  // teaser section further down the page reusing the same title class.
  await assertPresence(this.page.locator('.o_wblog_post_title').first(), notCase, 'the single blog post template (".o_wblog_post_title")', {
    attached: true,
    hint: 'Open a post from the blog index first; the index itself renders teaser cards without this title element.',
  });
});

/**
 * Assert the blog post on screen has, or does not have, the given title.
 * Reads `#o_wblog_post_name`, the heading of the single-post view (the
 * subtitle under it is not part of the title), and waits for the text to be
 * there.
 *
 * Example #1: Then I should see the blog post titled "Customer Reviews"
 * Example #2: And I should see the blog post titled "Employee Testimonials"
 * Example #3: Then we should see the blog post titled "Release Notes"
 * Example #4: And should not see the blog post titled "Product Update"
 * Example #5: Then I should see the blog post titled "Company News"
 *
 */
Then(/^(I |we )*should( not)* see the blog post titled "([^"]*)?"$/, async function (pronounCase, notCase, expectedTitle) {
  const title = this.page.locator('#o_wblog_post_name, .o_wblog_post_title h1').first();
  await assertPresence(title, undefined, 'the blog post title ("#o_wblog_post_name")', {
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
 * Example #1: Then I should be on the shop page
 * Example #2: And I should be on the shop index
 * Example #3: Then we should be on the shop page
 * Example #4: And should not be on the shop index
 * Example #5: Then I should be on the shop catalog page
 *
 */
Then(/^(I |we )*should( not)* be on the shop (?:page|index|catalog page)$/, async function (pronounCase, notCase) {
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
 * Example #1: Then I should be on an product page
 * Example #2: And I should be on a shop product page
 * Example #3: Then we should be on the product detail page
 * Example #4: And should not be on a product page
 * Example #5: Then I should not be on the product detail page
 *
 */
Then(/^(I |we )*should( not)* be on (?:an?|the) (?:shop )?product(?: detail)? page$/, async function (pronounCase, notCase) {
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
 * Example #1: When I open the first product in the shop
 * Example #2: And I open the 4th item in the shop
 * Example #3: When we open the 2nd product in the shop
 * Example #4: And open the first item in the shop
 * Example #5: When I open the 3rd product in the shop
 *
 */
When(/^(I |we )*open the (first|\d+(?:st|nd|rd|th)) (?:product|item) in the shop$/, async function (pronounCase, position) {
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
 * Example #1: When I search the shop for "mug"
 * Example #2: When we search the shop for "polo shirt"
 * Example #3: And search the shop for "t-shirt"
 * Example #4: When we search the shop for "backpack"
 * Example #5: And I search the shop for "notebook"
 *
 */
When(/^(I |we )*search the shop for "([^"]*)?"$/, async function (pronounCase, term) {
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
 * Assert the shop search returned, or did not return, products for the given
 * term: the URL's `search` parameter carries the term and the product grid
 * lists at least one product (`#products_grid .oe_product`). With "not" the
 * grid must list none.
 *
 * Example #1: Then I should see shop search results for "desk"
 * Example #2: And I should see shop search results for "office chair"
 * Example #3: Then we should see shop search results for "cabinet"
 * Example #4: And I should not see shop search results for "no-such-product"
 * Example #5: Then I should see the shop search results for "lamp"
 *
 */
Then(/^(I |we )*should( not)* see (?:the )?shop search results for "([^"]*)?"$/, async function (pronounCase, notCase, term) {
  await assertPresence(this.page.locator('#products_grid'), undefined, 'the shop product grid ("#products_grid")', {
    attached: true,
    hint: 'A search that matches nothing still renders the grid, with a message in place of the products; a missing grid means the search left the shop.',
  });
  // A space reaches the URL as `+` or `%20` depending on whether the form or
  // a direct navigation submitted it.
  const encoded = encodeURIComponent(term);
  const carriesTerm = (url) => url.includes(`search=${encoded.replace(/%20/g, '+')}`) || url.includes(`search=${encoded}`);
  try {
    await this.page.waitForURL((url) => carriesTerm(String(url)), { timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected the shop URL to carry the search term "${term}".`,
      cause: `the URL is ${this.page.url()}`,
      hint: 'Run "When I search the shop for ..." first, with the same term.',
    });
  }
  const products = this.page.locator('#products_grid .oe_product');
  await assertPresence(products.first(), notCase, `a product in the shop grid for the search "${term}"`, {
    attached: true,
    timeout: SHORT_TIMEOUT,
    hint: notCase
      ? `The grid lists ${await listTexts(this.page.locator('#products_grid .o_wsale_products_item_title'))}.`
      : 'The search looks in the name and the description of the published products; a product that is not published is not listed.',
  });
});

/**
 * Assert the shop grid lists, or does not list, a product by its name
 * (`#products_grid .o_wsale_products_item_title`).
 *
 * Example #1: Then I should see the "Customizable Desk" product in the shop
 * Example #2: And I should see the "Office Chair" product in the shop
 * Example #3: Then we should see the "Large Cabinet" product in the shop
 * Example #4: And I should not see the "Office Lamp" product in the shop
 * Example #5: Then we should not see the "Warranty" product in the shop
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" product in the shop$/, async function (pronounCase, notCase, name) {
  await assertPresence(this.page.locator('#products_grid'), undefined, 'the shop product grid ("#products_grid")', {
    attached: true,
    hint: 'Open the shop page first.',
  });
  const titles = this.page.locator('#products_grid .o_wsale_products_item_title');
  await assertPresence(titles.filter({ hasText: textPattern(name, { exact: true }) }).first(), notCase, `the "${name}" product in the shop grid`, {
    timeout: SHORT_TIMEOUT,
    hint: `The grid lists ${await listTexts(titles)}. The shop shows its products by pages and only the published ones.`,
  });
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
 * Example #1: When I add the product to the cart
 * Example #2: When we add this product to the cart
 * Example #3: And add the current product to the cart
 * Example #4: When we add the product to the cart
 * Example #5: And I add this product to the cart
 *
 */
When(/^(I |we )*add (?:the |this )?(?:current )?product to the cart$/, async function (pronounCase) {
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
 * Example #1: Then I should see "1" item in the cart
 * Example #2: And I should see "2" items in the cart
 * Example #3: Then we should see "1" item in the cart
 * Example #4: And should not see "3" items in the cart
 * Example #5: Then I should see "0" items in the cart
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)?" items? in the cart$/, async function (pronounCase, notCase, expectedCount) {
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
 * Example #1: Then I should be on the events page
 * Example #2: And I should be on the event page
 * Example #3: Then we should be on the events page
 * Example #4: And should not be on the events index
 * Example #5: Then I should be on the events listing page
 *
 */
Then(/^(I |we )*should( not)* be on the events? (?:page|index|listing page)$/, async function (pronounCase, notCase) {
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
 * Example #1: Then I should be on the jobs page
 * Example #2: And I should be on the careers page
 * Example #3: Then we should be on the jobs page
 * Example #4: And should not be on the jobs listing page
 * Example #5: Then I should be on the recruitment page
 *
 */
Then(/^(I |we )*should( not)* be on the (?:jobs|careers|recruitment) (?:page|listing page)$/, async function (pronounCase, notCase) {
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
 * Example #1: Then I should see job openings
 * Example #2: And I should see job listings
 * Example #3: Then we should see job openings
 * Example #4: And should not see job listings
 * Example #5: Then I should see job postings
 *
 */
Then(/^(I |we )*should( not)* see job (?:openings|listings|postings)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('a[href*="/jobs/"]').first(), notCase, 'a job opening link ("a[href*=\\"/jobs/\\"]")', {
    hint: 'Only published job positions are listed; publish one from the Recruitment app or drop the scenario.',
  });
});

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

const CONTACT_FORM = '#contactus_form, #wrap form.s_website_form, #wrap .s_website_form form';

/**
 * The contact form of the page, required and visible.
 *
 * @param {object} world
 * @returns {Promise<import('playwright').Locator>}
 */
async function requireContactForm(world) {
  const form = world.page.locator(CONTACT_FORM).first();
  try {
    await form.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected the contact form on the page.',
      cause: `the page is ${world.page.url()}`,
      hint: 'Open the contact page first ("Given I am on the contact us page"). The form is the "Form" building block of the Website builder.',
    });
  }
  return form;
}

/**
 * Navigate to the "Contact us" page at `/contactus` and check that the site
 * serves it: the Website layout is there and the page is not the 404 page.
 *
 * Example #1: Given I am on the contact us page
 * Example #2: Given we are on the contact page
 * Example #3: Given we are on the contact us page
 * Example #4: And on the contact-us page
 * Example #5: Given I am on the contact page
 *
 */
Given(/^(I am |we are )*on the (?:contact[ -]?us|contact) page$/, async function (pronounCase) {
  await navigate(this, '/contactus');
  const page = this.page;
  const notFound = await page.locator('main h1', { hasText: '404' }).count();
  if (notFound || !(await page.locator('#wrapwrap').count())) {
    throw friendly({
      message: 'Expected the contact page at /contactus.',
      cause: notFound ? 'the site answers with its 404 page' : `the page at ${page.url()} is not a Website page`,
      hint: 'The page ships with the Website app; a site that unpublished or moved it needs "Given I am on "<its path>"" instead.',
    });
  }
});

/**
 * Assert the "Contact us" form is, or is not, visible. Matches
 * `#contactus_form`, the form the Website app renders on the contact page,
 * or another "Form" building block in the content of the page.
 *
 * Example #1: Then I should see the contact us form
 * Example #2: And I should see the contact form
 * Example #3: Then we should see the contact us form
 * Example #4: And should not see the contact form
 * Example #5: Then I should see the "contact us" form
 *
 */
Then(/^(I |we )*should( not)* see the (?:"contact us"|contact[ -]?us|contact) form$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator(CONTACT_FORM).first(), notCase, 'the contact form ("#contactus_form")', {
    hint: 'The contact page renders the form with this id; a redesigned page may have dropped or renamed it.',
  });
  if (notCase) return;
  await assertPresence(this.page.locator(CONTACT_FORM).first().locator('.s_website_form_send').first(), undefined, 'the submit button of the contact form (".s_website_form_send")', {
    timeout: SHORT_TIMEOUT,
    hint: 'The button is part of the "Form" building block.',
  });
});

/**
 * Fill the contact form from a table: the first column names a field by its
 * label ("Name", "Email", "Question"), the second gives the value.
 *
 * Example #1: When I fill in the contact form with:
 * Example #2: When we fill in the contact form with:
 * Example #3: And fill in the contact form with:
 * Example #4: When I fill in the contact us form with:
 * Example #5: And we fill in the contact us form with:
 *
 */
When(/^(I |we )*fill in the contact(?: us)? form with:$/, async function (pronounCase, dataTable) {
  const form = await requireContactForm(this);
  const labels = form.locator('label.s_website_form_label:visible');
  for (const [name, value] of dataTable.raw()) {
    // The label reads "Name *": the mark of a required field is not part of
    // the name.
    const label = labels.filter({ has: this.page.locator('.s_website_form_label_content', { hasText: textPattern(name, { exact: true }) }) }).first();
    if (!(await label.isVisible().catch(() => false))) {
      throw friendly({
        message: `Expected a "${name}" field in the contact form.`,
        cause: `the form shows the fields ${await listTexts(labels.locator('.s_website_form_label_content'))}`,
        hint: 'The name is matched by the whole text of the label, case-sensitive.',
      });
    }
    const target = await label.getAttribute('for');
    const input = form.locator(`[id="${target}"]`).first();
    const tag = await input.evaluate((element) => element.tagName.toLowerCase());
    if (tag === 'select') await input.selectOption({ label: value });
    else await input.fill(value);
  }
});

/**
 * Submit the contact form with its button (`.s_website_form_send`) and wait
 * for the answer of the site: the confirmation, or the errors the form
 * shows. Assert the outcome in the step that follows.
 *
 * Example #1: When I submit the contact form
 * Example #2: When we submit the contact form
 * Example #3: And submit the contact us form
 * Example #4: When I send the contact form
 * Example #5: And we send the contact us form
 *
 */
When(/^(I |we )*(?:submit|send) the contact(?: us)? form$/, async function (pronounCase) {
  const page = this.page;
  const form = await requireContactForm(this);
  const startUrl = page.url();
  await form.locator('.s_website_form_send').first().click();
  // The form answers in one of three ways: it redirects to its confirmation
  // page, it shows its confirmation message in place, or it marks the fields
  // it refuses.
  await page.waitForFunction((url) => window.location.href !== url
    || document.querySelector('.s_website_form_end_message:not(.d-none)')
    || document.querySelector('.s_website_form_field.o_has_error, #s_website_form_result .text-danger, #s_website_form_result.text-danger'),
  startUrl, { timeout: WAIT_TIMEOUT }).catch(() => {});
  await waitForPageLoad(page, budget(this));
});

/**
 * Assert the site confirmed, or did not confirm, the contact form: the
 * visitor is on the confirmation page (`/contactus-thank-you`) or the form
 * shows its confirmation message in place (`.s_website_form_end_message`).
 *
 * Example #1: Then I should see the contact form confirmation
 * Example #2: And we should see the contact form confirmation
 * Example #3: Then we should see the contact us form confirmation
 * Example #4: And I should not see the contact form confirmation
 * Example #5: Then we should not see the contact us form confirmation
 *
 */
Then(/^(I |we )*should( not)* see the contact(?: us)? form confirmation$/, async function (pronounCase, notCase) {
  const page = this.page;
  const confirmed = async () => /\/contactus-thank-you(\b|$)/.test(page.url())
    || (await page.locator('.s_website_form_end_message:visible').count()) > 0;
  const deadline = Date.now() + SHORT_TIMEOUT;
  let state = await confirmed();
  while (state === Boolean(notCase) && !notCase && Date.now() < deadline) {
    await waitForPageLoad(page, 500);
    state = await confirmed();
  }
  if (state === Boolean(notCase)) {
    const errors = await listTexts(page.locator('.s_website_form_field.o_has_error .s_website_form_label_content'));
    throw friendly({
      message: notCase ? 'Expected no confirmation of the contact form.' : 'Expected the confirmation of the contact form.',
      cause: notCase ? `the page is ${page.url()}` : `the page is ${page.url()} and the form marks these fields as invalid: ${errors}`,
      hint: 'The form confirms by redirecting to its "thank you" page or by showing a message in place; required fields are marked with "*".',
    });
  }
});

/**
 * Assert the contact form shows, or does not show, an error after it was
 * submitted: the fields it refuses are marked (`.o_has_error`) and a message
 * appears next to the button. An optional field name checks that this field
 * is one of the refused ones.
 *
 * Example #1: Then I should see a contact form error
 * Example #2: And I should not see a contact form error
 * Example #3: Then we should see an contact form error
 * Example #4: And I should see a contact form error on "Email"
 * Example #5: Then we should see a contact us form error on "Question"
 *
 */
Then(/^(I |we )*should( not)* see an? contact(?: us)? form error(?: on "([^"]*)")?$/, async function (pronounCase, notCase, field) {
  const form = await requireContactForm(this);
  const refused = form.locator('.s_website_form_field.o_has_error');
  const target = field
    ? refused.filter({ has: this.page.locator('.s_website_form_label_content', { hasText: textPattern(field, { exact: true }) }) }).first()
    : refused.first();
  await assertPresence(target, notCase, field ? `an error on the "${field}" field of the contact form` : 'an error on the contact form (".o_has_error")', {
    timeout: SHORT_TIMEOUT,
    hint: `The form marks these fields as invalid: ${await listTexts(refused.locator('.s_website_form_label_content'))}. Submit the form first ("When I submit the contact form").`,
  });
});

// ---------------------------------------------------------------------------
// Website editor
// ---------------------------------------------------------------------------

const EDITOR_PANEL = '#oe_snippets.o_loaded';

/**
 * Open a page in the website preview of the web client (`/@/<path>`), where
 * a website editor finds the "Edit" button.
 *
 * @param {object} world
 * @param {string} path
 * @returns {Promise<void>}
 */
async function openWebsitePreview(world, path) {
  const page = world.page;
  const target = `/@/${String(path || '/').replace(/^\/+/, '')}`;
  await navigate(world, target);
  try {
    await page.locator('.o_website_preview iframe.o_iframe').first().waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected the website preview of the web client.',
      cause: `the page is ${page.url()}`,
      hint: 'The preview is shown to an internal user; log in first ("Given I am a logged in user with the "admin" user").',
    });
  }
  await settle(world);
}

/**
 * Assert the current user can, or cannot, edit the website: the website
 * preview of the web client shows the "Edit" button
 * (`.o_edit_website_container`) to the users of the "Restricted Editor" and
 * "Editor and Designer" groups. With `on "<path>"` the check runs on that
 * page; the front page otherwise.
 *
 * Example #1: Then I should be able to edit the website
 * Example #2: And I should not be able to edit the website
 * Example #3: Then we should be able to edit the website
 * Example #4: And I should be able to edit the website on "/contactus"
 * Example #5: Then we should not be able to edit the website on "/shop"
 *
 */
Then(/^(I |we )*should( not)* be able to edit the website(?: on "([^"]*)")?$/, async function (pronounCase, notCase, path) {
  await openWebsitePreview(this, path || '/');
  await assertPresence(this.page.locator('.o_menu_systray .o_edit_website_container a').first(), notCase, 'the "Edit" button of the website preview (".o_edit_website_container")', {
    timeout: SHORT_TIMEOUT,
    hint: 'The button is shown to the users of the website editor groups (Website: Restricted Editor, Editor and Designer).',
  });
});

/**
 * Open the website editor on a page: the page is shown in the website
 * preview of the web client, the "Edit" button is clicked and the step waits
 * for the editor panel with its building blocks (`#oe_snippets`). With `on
 * "<path>"` the editor opens on that page; on the front page otherwise.
 *
 * Example #1: When I open the website editor
 * Example #2: When we open the website editor
 * Example #3: And open the website editor
 * Example #4: When I open the website editor on "/contactus"
 * Example #5: And we open the website editor on "/shop"
 *
 */
When(/^(I |we )*open the website editor(?: on "([^"]*)")?$/, async function (pronounCase, path) {
  const page = this.page;
  await openWebsitePreview(this, path || '/');
  const edit = page.locator('.o_menu_systray .o_edit_website_container a').first();
  try {
    await edit.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: 'click the "Edit" button of the website preview',
      target: '.o_edit_website_container',
      cause: error,
      hint: 'The button is shown to the users of the website editor groups (Website: Restricted Editor, Editor and Designer).',
    });
  }
  try {
    await page.locator(EDITOR_PANEL).first().waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected the website editor to open.',
      cause: error,
      hint: 'The editor loads its building blocks before it is ready; an error dialog on screen names what went wrong.',
    });
  }
  await settle(this);
});

/**
 * Assert the website editor is, or is not, open: its panel with the
 * building blocks and the "Save" and "Discard" buttons (`#oe_snippets`).
 *
 * Example #1: Then I should see the website editor
 * Example #2: And I should not see the website editor
 * Example #3: Then we should see the website editor
 * Example #4: And I should see the editor of the website
 * Example #5: Then we should not see the editor of the website
 *
 */
Then(/^(I |we )*should( not)* see the (?:website editor|editor of the website)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator(EDITOR_PANEL).first(), notCase, 'the website editor ("#oe_snippets")', {
    timeout: SHORT_TIMEOUT,
    hint: 'Open the editor first ("When I open the website editor"); saving or discarding closes it.',
  });
  if (notCase) return;
  await assertPresence(this.page.locator('.o_we_website_top_actions button[data-action="save"]').first(), undefined, 'the "Save" button of the website editor', {
    timeout: SHORT_TIMEOUT,
    hint: 'The button sits at the top of the editor panel.',
  });
});

/**
 * Assert the website editor offers, or does not offer, a building block, by
 * its name in the "Blocks" tab of the editor panel (`#oe_snippets
 * .oe_snippet`).
 *
 * Example #1: Then I should see the "Text" building block
 * Example #2: And I should see the "Banner" building block
 * Example #3: Then we should see the "Text - Image" building block
 * Example #4: And I should not see the "No Such Block" building block
 * Example #5: Then we should not see the "Countdown" website building block
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" (?:website )?building block$/, async function (pronounCase, notCase, name) {
  const page = this.page;
  await assertPresence(page.locator(EDITOR_PANEL).first(), undefined, 'the website editor ("#oe_snippets")', {
    timeout: SHORT_TIMEOUT,
    hint: 'Open the editor first ("When I open the website editor").',
  });
  const blocks = page.locator('#oe_snippets .oe_snippet[name]');
  const names = await blocks.evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute('name')).filter(Boolean))]);
  const offered = names.includes(name);
  if (offered === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected no "${name}" building block in the website editor.` : `Expected a "${name}" building block in the website editor.`,
      cause: `the editor offers ${names.slice(0, 40).map((block) => `"${block}"`).join(', ') || '(none)'}`,
      hint: 'A building block is named as in the "Blocks" tab of the editor; the installed apps and the theme add their own.',
    });
  }
});

/**
 * Leave the website editor with its "Save" or its "Discard" button and wait
 * for the editor to close. Discarding changes asks for a confirmation, which
 * the step gives.
 *
 * Example #1: When I save the website editor
 * Example #2: When we discard the website editor
 * Example #3: And save the website editor
 * Example #4: When I discard the website editor
 * Example #5: And discard the website editor
 *
 */
When(/^(I |we )*(save|discard) the website editor$/, async function (pronounCase, action) {
  const page = this.page;
  const button = page.locator(`.o_we_website_top_actions button[data-action="${action === 'save' ? 'save' : 'cancel'}"]`).first();
  try {
    await button.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: `click the "${action === 'save' ? 'Save' : 'Discard'}" button of the website editor`,
      target: '.o_we_website_top_actions',
      cause: error,
      hint: 'Open the editor first ("When I open the website editor").',
    });
  }
  // Discarding real changes opens a confirmation.
  const confirm = page.locator('.modal[role="dialog"]:visible .modal-footer .btn-primary').first();
  await Promise.race([
    page.locator(EDITOR_PANEL).first().waitFor({ state: 'hidden', timeout: WAIT_TIMEOUT }),
    confirm.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT }),
  ]).catch(() => {});
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  try {
    await page.locator(EDITOR_PANEL).first().waitFor({ state: 'hidden', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected the website editor to close.',
      cause: error,
      hint: 'A dialog on screen names what kept the editor open.',
    });
  }
  await settle(this);
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

/**
 * Assert the current page is, or is not, the core 404 template, by checking
 * the page heading for "404" (rendered by `addons/http_routing`'s
 * `http_routing.404` template on every Odoo site).
 *
 * Example #1: Then I should be on the 404 page
 * Example #2: And I should be on the not found page
 * Example #3: Then we should be on the 404 page
 * Example #4: And should not be on the 404 page
 * Example #5: Then I should land on the 404 page
 *
 */
Then(/^(I |we )*should( not)* (?:be on|land on) the (?:404|not found|page not found) page$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('h1', { hasText: '404' }).first(), notCase, 'the 404 template (an <h1> containing "404")', {
    attached: true,
    hint: 'A site with a custom 404 page keeps the status code but may drop the "404" heading; assert the status code with the response step instead.',
  });
});

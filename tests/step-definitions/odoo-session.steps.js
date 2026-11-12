'use strict';

// Session steps for Odoo: the login screen (`/web/login`), the users registry
// of cucumber.js, the user menu of the web client and of the website, logging
// out, and what the server says about the session.
//
// Accounts are configuration. They are created once on the site under test
// (scripts/build-odoo.sh does it for this pack's own suite) and named in
// `worldParameters.users`; a feature never creates or deletes an account and
// never carries a password, except where the credentials are the subject.

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
  loginPath,
  submitLogin,
  sessionInfo,
  loginAs,
  textPattern,
} = require('./odoo-helpers');

const LOGIN_FORM = 'form[action^="/web/login"]';

/**
 * Open the user menu: the avatar menu of the web client's navigation bar
 * (`.o_user_menu`) or, on the website and the portal, the menu under the
 * user's name in the header. Returns the open menu.
 *
 * @param {object} world
 * @returns {Promise<import('playwright').Locator>}
 */
async function openUserMenu(world) {
  const page = world.page;
  const backend = page.locator('.o_main_navbar .o_user_menu').first();
  if (await backend.isVisible().catch(() => false)) {
    const menu = backend.locator('.dropdown-menu');
    if (!(await menu.isVisible().catch(() => false))) {
      await backend.locator('button.dropdown-toggle').click();
    }
    await menu.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    return menu;
  }
  const frontend = page.locator('header li.dropdown:has(#o_logout):visible, header .dropdown:has(#o_logout):visible').first();
  if (await frontend.isVisible().catch(() => false)) {
    const menu = frontend.locator('.dropdown-menu').first();
    if (!(await menu.isVisible().catch(() => false))) {
      await frontend.locator('a.dropdown-toggle, [data-bs-toggle="dropdown"]').first().click();
    }
    await menu.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    return menu;
  }
  throw friendly({
    message: 'Expected a user menu on the page.',
    cause: `the page is ${page.url()}`,
    hint: 'The user menu is shown to a logged-in user: in the navigation bar of the web client, or under the user\'s name in the website header. Log in first.',
  });
}

/**
 * Navigate to the login screen at `/web/login`. The screen ships with the
 * base "web" module, so every Odoo site has it.
 *
 * Example #1: Given I am on the login page
 * Example #2: Given we are on the login page
 * Example #3: Given I am on the sign in page
 * Example #4: And on the sign-in page
 * Example #5: Given I am on the web/login page
 *
 */
Given(/^(I am |we are )*on the (?:sign[- ]?in|web\/login|login) page$/, async function (pronounCase) {
  await navigate(this, loginPath(this));
  const page = this.page;
  if (/\/web\/database\/selector/.test(page.url())) {
    throw friendly({
      message: 'Expected the login screen, but the server shows the database selector.',
      cause: `the page is ${page.url()}`,
      hint: 'The server holds more than one database: set worldParameters.odoo.database in cucumber.js, or start Odoo with --db-filter.',
    });
  }
  // A logged-in visitor is redirected away from /web/login; the step does not
  // hide that, so the assertion that follows can report it.
});

/**
 * Assert the login form is, or is not, visible: the form posting to
 * `/web/login`, with its `#login` and `#password` fields and its submit
 * button. Each part is checked separately so a failure names the missing
 * one.
 *
 * Example #1: Then I should see the login form
 * Example #2: And I should see the sign in form
 * Example #3: Then we should see the login form
 * Example #4: And should not see the login form
 * Example #5: Then I should see the sign-in form
 *
 */
Then(/^(I |we )*should( not)* see the (?:sign[- ]?in|login) form$/, async function (pronounCase, notCase) {
  const hint = 'The login screen is /web/login; a logged-in visitor is redirected away from it to /web.';
  await assertPresence(this.page.locator(LOGIN_FORM), notCase, 'the login form ("form[action=\\"/web/login\\"]")', { hint });
  if (notCase) return;
  await assertPresence(this.page.locator(`${LOGIN_FORM} #login`), undefined, 'the login field ("#login")', { hint, timeout: SHORT_TIMEOUT });
  await assertPresence(this.page.locator(`${LOGIN_FORM} #password`), undefined, 'the password field ("#password")', { hint, timeout: SHORT_TIMEOUT });
  await assertPresence(this.page.locator(`${LOGIN_FORM} button[type="submit"]`).first(), undefined, 'the submit button of the login form', { hint, timeout: SHORT_TIMEOUT });
});

/**
 * Fill and submit the login form with the given login and password, for
 * scenarios where the credentials are the subject (a wrong password, a
 * disabled account). The login screen must be open already. For everything
 * else use the users registry: `Given I am a logged in user with the "admin"
 * user`.
 *
 * Example #1: When I log in as "admin" with password "secret"
 * Example #2: When we log in as "demo@example.com" with password "p@ssw0rd"
 * Example #3: And I sign in as "admin" with password "secret"
 * Example #4: When we sign-in as "reviewer" with password "hunter2"
 * Example #5: And log in as "portal_user" with password "letmein"
 *
 */
When(/^(I |we )*(?:log in|sign[- ]?in) as "([^"]*)?" with password "([^"]*)?"$/, async function (pronounCase, username, password) {
  await submitLogin(this, username, password);
  await this.page.locator(`.o_main_navbar, #wrapwrap, ${LOGIN_FORM}`).first().waitFor({ state: 'attached', timeout: WAIT_TIMEOUT }).catch(() => {});
  await settle(this, budget(this));
});

/**
 * Log in as a user of the registry in cucumber.js (`worldParameters.users`),
 * so no password appears in a feature file. Each handle names one account:
 * `{ admin: { username: 'admin', password: process.env.ODOO_ADMIN_PASSWORD } }`.
 * The step starts a new session, opens the login screen, submits the form and
 * waits for the page the user lands on: the web client for an internal user,
 * the portal for a portal user. A refused login fails here, with the message
 * the login form shows.
 *
 * Example #1: Given I am a logged in user with the "admin" user
 * Example #2: Given I am a logged in user with the username "admin"
 * Example #3: Given we are a logged in user with "portal"
 * Example #4: And a logged in user with the "salesperson" user
 * Example #5: Given I am a logged in user with the username "accountant" user
 *
 */
Given(/^(I am |we are )*a logged in user with( the)*( username)* "([^"]*)?"( user)*$/, async function (pronounCase, theCase, usernameCase, handle, userCase) {
  await loginAs(this, handle);
});

/**
 * End any session and land on the login screen as a visitor: cookies and web
 * storage are cleared, `/web/login` is opened and the login form is
 * confirmed. Use it at the start of a scenario that must run as a visitor.
 * To log out the way a user does, use `When I log out`.
 *
 * Example #1: Given I am not logged in
 * Example #2: Given we are not logged in
 * Example #3: And we are not logged in
 * Example #4: Given not logged in
 * Example #5: But not logged in
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
  await navigate(this, loginPath(this));
  await assertPresence(this.page.locator(LOGIN_FORM), undefined, 'the login form (the session should have ended)', {
    timeout: SHORT_TIMEOUT,
    hint: 'A logged-in visitor is redirected from /web/login to /web; clearing the cookies should have ended the session.',
  });
});

/**
 * Assert the login screen is, or is not, showing an error, optionally with a
 * text. Matches the `.alert-danger` message the login form renders after a
 * wrong login or password ("Wrong login/password").
 *
 * Example #1: Then I should see an login error
 * Example #2: And I should see a sign in error
 * Example #3: Then we should see a login error "Wrong login/password"
 * Example #4: And should not see a login error
 * Example #5: Then I should see an authentication error message
 *
 */
Then(/^(I |we )*should( not)* see an? (?:login|sign[- ]?in|authentication) error(?: message)?(?: "([^"]*)")?$/, async function (pronounCase, notCase, expectedText) {
  const error = this.page.locator(`${LOGIN_FORM} .alert-danger`).first();
  const hint = 'The login screen renders the message inside the form after a wrong login or password.';
  if (notCase && !expectedText) {
    await assertPresence(error, notCase, 'a login error message (".alert-danger")', { hint });
    return;
  }
  await assertPresence(error, undefined, 'a login error message (".alert-danger")', { hint });
  if (expectedText) {
    await assertText(error, expectedText, notCase, 'the login error message', { hint });
  }
});

/**
 * Log out the way a user does: open the user menu and choose "Log out" (the
 * web client) or "Logout" (the website and the portal). The step then waits
 * until the server reports no session.
 *
 * Example #1: When I log out
 * Example #2: When we log out
 * Example #3: And log out
 * Example #4: When I sign out
 * Example #5: And we sign out
 *
 */
When(/^(I |we )*(?:log|sign) out$/, async function (pronounCase) {
  const page = this.page;
  const menu = await openUserMenu(this);
  const entry = menu.locator('[data-menu="logout"], #o_logout, a[href*="/web/session/logout"]').first();
  try {
    await entry.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected a "Log out" entry in the user menu.',
      cause: `the menu offers ${await listTexts(menu.locator('.dropdown-item'))}`,
      hint: 'The entry is part of the standard user menu; a customised menu needs its own step.',
    });
  }
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT }).catch(() => {}),
    entry.click(),
  ]);
  await waitForPageLoad(page, budget(this));
  const session = await sessionInfo(this);
  if (session.uid) {
    throw friendly({
      message: 'Expected the session to end after logging out.',
      cause: `the server still reports a session for "${session.username}"`,
      hint: 'Check that /web/session/logout is reachable and not blocked by a proxy rule.',
    });
  }
});

/**
 * Assert the browser holds, or does not hold, a session, as the server
 * reports it (`/web/session/get_session_info`). The check does not depend on
 * the page on screen, so it works on the web client, the website and the
 * portal alike.
 *
 * Example #1: Then I should be logged in
 * Example #2: And we should be logged in
 * Example #3: Then I should not be logged in
 * Example #4: And should be logged in
 * Example #5: Then we should not be logged in
 *
 */
Then(/^(I |we )*should( not)* be logged in$/, async function (pronounCase, notCase) {
  const session = await sessionInfo(this);
  if (notCase && session.uid) {
    throw friendly({
      message: 'Expected no session.',
      cause: `the server reports a session for "${session.username}" (${session.name})`,
      hint: 'Log out first ("When I log out"), or start the scenario with "Given I am not logged in".',
    });
  }
  if (!notCase && !session.uid) {
    throw friendly({
      message: 'Expected a session.',
      cause: 'the server reports no session for this browser',
      hint: 'Log in first ("Given I am a logged in user with the "admin" user").',
    });
  }
});

/**
 * Assert the session belongs, or does not belong, to the given user. The text
 * is compared with the login and with the name of the user, as the server
 * reports them, so both "admin" and "Mitchell Admin" identify the
 * administrator of the demo data.
 *
 * Example #1: Then I should be logged in as "admin"
 * Example #2: And I should be logged in as "Mitchell Admin"
 * Example #3: Then we should be logged in as "salesperson"
 * Example #4: And I should not be logged in as "admin"
 * Example #5: Then I should be logged in as "portal"
 *
 */
Then(/^(I |we )*should( not)* be logged in as "([^"]*)"$/, async function (pronounCase, notCase, expected) {
  const session = await sessionInfo(this);
  const matches = Boolean(session.uid) && (session.username === expected || session.name === expected);
  if (Boolean(notCase) === matches) {
    throw friendly({
      message: notCase ? `Expected the session not to belong to "${expected}".` : `Expected the session to belong to "${expected}".`,
      cause: session.uid ? `the server reports the login "${session.username}" and the name "${session.name}"` : 'the server reports no session for this browser',
      hint: 'The text is compared with the login and with the name of the user, exactly.',
    });
  }
});

/**
 * Assert the page is, or is not, the web client: the application internal
 * users work in (`body.o_web_client` with the navigation bar
 * `.o_main_navbar`), as opposed to the website and the portal.
 *
 * Example #1: Then I should be in the web client
 * Example #2: And we should be in the web client
 * Example #3: Then we should be in the backend
 * Example #4: And I should not be in the web client
 * Example #5: Then I should not be in the backend
 *
 */
Then(/^(I |we )*should( not)* be in the (?:web client|backend)$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('body.o_web_client .o_main_navbar').first(), notCase, 'the web client (".o_web_client .o_main_navbar")', {
    hint: 'Internal users land on the web client at /web after logging in; portal users are sent to /my and visitors to the login screen.',
  });
  if (!notCase) await settle(this);
});

/**
 * Assert the page is, or is not, the portal: the "My Account" area a portal
 * user lands on (`/my`, rendered inside `#wrap.o_portal_wrap`).
 *
 * Example #1: Then I should be in the portal
 * Example #2: And we should be in the portal
 * Example #3: Then we should be in the customer portal
 * Example #4: And I should not be in the portal
 * Example #5: Then I should not be in the customer portal
 *
 */
Then(/^(I |we )*should( not)* be in the (?:customer )?portal$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('.o_portal_wrap').first(), notCase, 'the portal ("#wrap.o_portal_wrap")', {
    attached: true,
    hint: 'A portal user lands on /my after logging in; an internal user lands on the web client.',
  });
});

/**
 * Open the user menu: the avatar menu at the right of the web client's
 * navigation bar, or the menu under the user's name in the website header.
 *
 * Example #1: When I open the user menu
 * Example #2: When we open the user menu
 * Example #3: And open the user menu
 * Example #4: When I open the account menu
 * Example #5: And we open the account menu
 *
 */
When(/^(I |we )*open the (?:user|account) menu$/, async function (pronounCase) {
  await openUserMenu(this);
});

/**
 * Assert the user menu offers, or does not offer, an entry. The menu is
 * opened when it is closed.
 *
 * Example #1: Then I should see "My Profile" in the user menu
 * Example #2: And I should see "Log out" in the user menu
 * Example #3: Then we should see "My Account" in the user menu
 * Example #4: And I should not see "Settings" in the user menu
 * Example #5: Then I should not see "Documentation" in the account menu
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the (?:user|account) menu$/, async function (pronounCase, notCase, text) {
  const menu = await openUserMenu(this);
  const entry = menu.locator('.dropdown-item').filter({ hasText: textPattern(text, { exact: true }) }).first();
  const offered = await listTexts(menu.locator('.dropdown-item'));
  await assertPresence(entry, notCase, `the "${text}" entry of the user menu`, {
    timeout: SHORT_TIMEOUT,
    hint: `The menu offers ${offered}.`,
  });
});

/**
 * Choose an entry of the user menu, for example "My Profile". The menu is
 * opened when it is closed.
 *
 * Example #1: When I choose "My Profile" in the user menu
 * Example #2: When we choose "My Account" in the user menu
 * Example #3: And I choose "Shortcuts" in the user menu
 * Example #4: When I choose "My Profile" in the account menu
 * Example #5: And we choose "Log out" in the account menu
 *
 */
When(/^(I |we )*choose "([^"]*)" in the (?:user|account) menu$/, async function (pronounCase, text) {
  const menu = await openUserMenu(this);
  const entry = menu.locator('.dropdown-item').filter({ hasText: textPattern(text, { exact: true }) }).first();
  try {
    await entry.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a "${text}" entry in the user menu.`,
      cause: `the menu offers ${await listTexts(menu.locator('.dropdown-item'))}`,
      hint: 'The entry is matched by its whole text, case-sensitive.',
    });
  }
  await entry.click();
  await waitForPageLoad(this.page, budget(this));
  await settle(this);
});

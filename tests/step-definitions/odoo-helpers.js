'use strict';

// Shared helpers for the Odoo step files.
//
// Not a step file: it registers no step definitions and no hooks. It holds
// what the step files share: the wait on Odoo's own activity signals, the
// users registry, the login form, presence and text assertions, and the
// lookups for the web client (the active view, a form field by its label, a
// dialog, the search view).
//
// Everything here builds on webship-js's own helpers (`gotoUrl`,
// `waitForPageLoad`, `friendly`) so the steps behave like the core webship-js
// steps.

const { gotoUrl, waitForPageLoad, friendly } = require('webship-js/tests/step-definitions/webship');

// Kept below webship-js's 45 s step timeout so a locator that never settles
// fails through the authored message (with its hint), not as "function timed
// out".
const WAIT_TIMEOUT = 30000;

// A shorter wait for a second look at something that is expected to be there
// already (a menu that just opened, a field of a form that is on screen).
const SHORT_TIMEOUT = 10000;

/**
 * Whether an optional step argument was actually supplied. A regex group that
 * did not take part in the match reaches the step as `undefined` or `null`.
 *
 * @param {*} value
 * @returns {boolean}
 */
function supplied(value) {
  return value !== undefined && value !== null;
}

/**
 * The per-page wait budget from `worldParameters.minWaitTime.page`.
 *
 * @param {object} world
 * @returns {number}
 */
function budget(world) {
  return (world && world.minWaitTime && world.minWaitTime.page) || 3000;
}

/**
 * Join the launch URL and a path with exactly one slash. Absolute URLs pass
 * through.
 *
 * @param {object} world
 * @param {string} path
 * @returns {string}
 */
function siteUrl(world, path) {
  if (/^https?:\/\//i.test(String(path))) return String(path);
  return String(world.launchUrl).replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
}

/**
 * Escape a string for use inside a regular expression.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A whitespace-tolerant, case-sensitive pattern for a text. With `exact` the
 * whole text must match; otherwise the text may appear anywhere.
 *
 * @param {string} text
 * @param {{exact?: boolean}} [options]
 * @returns {RegExp}
 */
function textPattern(text, { exact = false } = {}) {
  const body = String(text).trim().split(/\s+/).map(escapeRegExp).join('\\s+');
  return new RegExp(exact ? `^\\s*${body}\\s*$` : body);
}

/**
 * The pattern for the text of a form label. Odoo appends a "?" help marker
 * (`<sup>?</sup>`) to a label whose field has a tooltip, so the marker is
 * accepted but not required.
 *
 * @param {string} label
 * @returns {RegExp}
 */
function labelPattern(label) {
  const body = String(label).trim().replace(/\s*:$/, '').split(/\s+/).map(escapeRegExp).join('\\s+');
  return new RegExp(`^\\s*${body}\\s*:?\\s*\\??\\s*$`);
}

// ---------------------------------------------------------------------------
// Waiting on Odoo's own signals
// ---------------------------------------------------------------------------

// The requests in flight, per page. The web client talks to the server
// through XMLHttpRequest and fetch calls (`/web/dataset/call_kw`,
// `/web/action/load`, ...); the bus keeps its own long-lived connection,
// which is left out so that the count can reach zero.
const pendingRequests = new WeakMap();

const LONG_LIVED_REQUEST = /\/longpolling\/|\/websocket|\/bus\/|im_status/;

/**
 * Start counting the page's data requests. Safe to call more than once.
 *
 * @param {import('playwright').Page} page
 * @returns {Set<object>} The requests in flight.
 */
function trackRequests(page) {
  let pending = pendingRequests.get(page);
  if (pending) return pending;
  pending = new Set();
  pendingRequests.set(page, pending);
  page.on('request', (request) => {
    const type = request.resourceType();
    if (type !== 'xhr' && type !== 'fetch') return;
    if (LONG_LIVED_REQUEST.test(request.url())) return;
    pending.add(request);
  });
  const done = (request) => pending.delete(request);
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  return pending;
}

/**
 * Wait until Odoo is idle: the document is loaded, no data request is in
 * flight, and none of the web client's own busy signals is on screen (the
 * "Loading" indicator of the navigation bar, `.o_loading_indicator`, and the
 * screen blocker shown during a long action, `.o_blockUI`). The page must
 * stay idle for a short moment, so that a request chained to the previous
 * one (a save followed by a reload) is waited for as well.
 *
 * Returns within `timeout` milliseconds even when the page never becomes
 * idle; the assertion that follows then reports what is missing.
 *
 * @param {object} world - The cucumber World (`this` inside a step).
 * @param {number} [timeout]
 * @returns {Promise<boolean>} Whether the page became idle in time.
 */
async function settle(world, timeout = WAIT_TIMEOUT) {
  const page = world.page;
  const pending = trackRequests(page);
  const deadline = Date.now() + timeout;
  const QUIET_MS = 200;
  let quietSince = 0;
  while (Date.now() < deadline) {
    const busy = pending.size > 0 || await page.evaluate(() => {
      if (document.readyState !== 'complete') return true;
      return Boolean(document.querySelector('.o_loading_indicator, .o_blockUI'));
    }).catch(() => true);
    if (busy) {
      quietSince = 0;
    } else if (!quietSince) {
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= QUIET_MS) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  return false;
}

/**
 * Open a path on the site under test and wait for the page to settle.
 *
 * @param {object} world
 * @param {string} path
 * @returns {Promise<void>}
 */
async function navigate(world, path) {
  trackRequests(world.page);
  await gotoUrl(world.page, siteUrl(world, path));
  await world.page.waitForSelector('body', { state: 'attached', timeout: WAIT_TIMEOUT });
  await waitForPageLoad(world.page, budget(world));
}

/**
 * Wait for the web client to be ready: the navigation bar is drawn, an action
 * is on screen and Odoo is idle.
 *
 * @param {object} world
 * @returns {Promise<void>}
 */
async function waitForWebClient(world) {
  const page = world.page;
  try {
    await page.locator('.o_web_client .o_main_navbar').first().waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
    // An action on screen, or the dialog Odoo opens when the action could
    // not be loaded (an access error, for example).
    await page.locator('.o_action_manager > *, .modal[role="dialog"]').first().waitFor({ state: 'attached', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected the Odoo web client to be on screen.',
      cause: `the page is ${page.url()}`,
      hint: 'Log in with an internal user first ("Given I am a logged in user with the "admin" user"); a portal user is sent to /my and never reaches the web client.',
    });
  }
  await settle(world);
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/**
 * Assert an element is present or, when the step said "not", absent. The
 * assertion is the wait: Playwright polls the locator for the wanted state
 * and a miss fails through a friendly message with a hint. `attached` picks
 * presence in the document over visibility.
 *
 * @param {import('playwright').Locator} locator
 * @param {string|null|undefined} notCase - The captured " not" group, if any.
 * @param {string} label - What the element is, for the message.
 * @param {{attached?: boolean, hint?: string, timeout?: number}} [options]
 * @returns {Promise<void>}
 */
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

/**
 * Assert a locator's text contains (or, with `notCase`, does not contain) the
 * expected text. The locator is narrowed to "has this text" and Playwright
 * polls for that narrowed set to exist or to be gone.
 *
 * @param {import('playwright').Locator} locator
 * @param {string} expectedText
 * @param {string|null|undefined} notCase
 * @param {string} label
 * @param {{exact?: boolean, hint?: string, timeout?: number}} [options]
 * @returns {Promise<void>}
 */
async function assertText(locator, expectedText, notCase, label, { exact = false, hint, timeout = WAIT_TIMEOUT } = {}) {
  const withText = locator.filter({ hasText: textPattern(expectedText, { exact }) });
  try {
    await withText.first().waitFor({ state: notCase ? 'detached' : 'attached', timeout });
  } catch (error) {
    const text = ((await locator.first().textContent({ timeout: 1000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    throw friendly({
      message: notCase
        ? `Expected ${label} not to ${exact ? 'read' : 'contain'} "${expectedText}".`
        : `Expected ${label} to ${exact ? 'read' : 'contain'} "${expectedText}".`,
      cause: `it reads "${text}"`,
      hint,
    });
  }
}

/**
 * The visible texts of a set of elements, trimmed and without duplicates, for
 * a hint that lists what the page offers.
 *
 * @param {import('playwright').Locator} locator
 * @param {number} [limit]
 * @returns {Promise<string>}
 */
async function listTexts(locator, limit = 25) {
  const texts = await locator.evaluateAll((elements) => elements
    .filter((element) => element.offsetParent !== null || element.getClientRects().length > 0)
    .map((element) => (element.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)).catch(() => []);
  const unique = [...new Set(texts)];
  if (!unique.length) return '(none)';
  return unique.slice(0, limit).map((text) => `"${text}"`).join(', ') + (unique.length > limit ? ', ...' : '');
}

// ---------------------------------------------------------------------------
// Users registry and the login form
// ---------------------------------------------------------------------------

/**
 * Look up a user by its handle in `worldParameters.users`. The registry maps
 * a handle a feature file can read ("admin", "salesperson") to the real
 * account: `{ username, password }`. A handle with no `username` uses the
 * handle itself as the login.
 *
 * @param {object} world
 * @param {string} handle
 * @returns {{username: string, password: string}}
 */
function resolveUser(world, handle) {
  const users = (world.parameters && world.parameters.users) || {};
  const entry = users[handle];
  if (!entry) {
    throw friendly({
      message: `User "${handle}" is not configured.`,
      hint: `Add it to worldParameters.users in cucumber.js. Known users: ${Object.keys(users).join(', ') || '(none)'}.`,
    });
  }
  const username = typeof entry === 'string' ? handle : (entry.username || handle);
  const password = typeof entry === 'string' ? entry : entry.password;
  if (!password) {
    throw friendly({
      message: `User "${handle}" has no password configured.`,
      hint: `Set worldParameters.users.${handle}.password in cucumber.js, ideally from an environment variable.`,
    });
  }
  return { username, password };
}

/**
 * The path of the login screen. On a server that holds several databases the
 * `database` setting (`worldParameters.odoo.database`) selects one, so the
 * database selector is skipped.
 *
 * @param {object} world
 * @returns {string}
 */
function loginPath(world) {
  const settings = (world.parameters && world.parameters.odoo) || {};
  return settings.database ? `/web/login?db=${encodeURIComponent(settings.database)}` : '/web/login';
}

/**
 * Fill and submit Odoo's login form (`form.oe_login_form`, `#login`,
 * `#password`). The submit is dispatched from inside the page: a fixed
 * overlay (a cookie bar, a chat widget) can cover the button and make a real
 * click wait out its timeout, while the form's own submit cannot be covered.
 *
 * @param {object} world
 * @param {string} username
 * @param {string} password
 * @returns {Promise<void>}
 */
async function submitLogin(world, username, password) {
  const page = world.page;
  trackRequests(page);
  try {
    await page.locator('#login').waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    const onSelector = /\/web\/database\/selector/.test(page.url());
    throw friendly({
      action: 'find the login form',
      target: 'form[action="/web/login"]',
      cause: onSelector ? 'the server shows the database selector' : error,
      hint: onSelector
        ? 'The server holds more than one database: set worldParameters.odoo.database in cucumber.js, or start Odoo with --db-filter.'
        : 'Open the login page first ("Given I am on the login page"); a site that replaces /web/login needs its own step.',
    });
  }
  await page.locator('#login').fill(username);
  await page.locator('#password').fill(password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT }).catch(() => {}),
    page.evaluate(() => {
      const form = document.querySelector('form[action^="/web/login"]');
      const submit = form && form.querySelector('button[type="submit"]');
      if (submit) { submit.click(); return; }
      if (form) form.submit();
    }),
  ]);
  await page.waitForLoadState('domcontentloaded', { timeout: WAIT_TIMEOUT }).catch(() => {});
}

/**
 * The session the browser holds, as the server reports it
 * (`/web/session/get_session_info`): `uid` is empty for a visitor. The
 * request runs in the page, with its cookies, and does not change the page.
 *
 * @param {object} world
 * @returns {Promise<{uid: (number|null), name: string, username: string, isInternal: boolean}>}
 */
async function sessionInfo(world) {
  const info = await world.page.evaluate(async () => {
    try {
      const response = await fetch('/web/session/get_session_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
      });
      const data = await response.json();
      return data.result || null;
    } catch (error) {
      return null;
    }
  }).catch(() => null);
  if (!info || !info.uid) return { uid: null, name: '', username: '', isInternal: false };
  return {
    uid: info.uid,
    name: info.name || info.partner_display_name || '',
    username: info.username || '',
    isInternal: Boolean(info.is_internal_user),
  };
}

/**
 * Log in as a user of the registry and wait for the page the user lands on:
 * the web client for an internal user, the portal or the website for a
 * portal user. A refused login fails here, with the message the login form
 * shows, instead of in the step that follows.
 *
 * @param {object} world
 * @param {string} handle
 * @returns {Promise<void>}
 */
async function loginAs(world, handle) {
  const page = world.page;
  const { username, password } = resolveUser(world, handle);
  // Start from a new session: a logged-in visitor is redirected away from
  // the login screen and would never see the form.
  await world.context.clearCookies();
  await navigate(world, loginPath(world));
  await submitLogin(world, username, password);
  const outcome = page.locator('.o_main_navbar, #wrapwrap, form[action^="/web/login"] .alert-danger').first();
  await outcome.waitFor({ state: 'attached', timeout: WAIT_TIMEOUT }).catch(() => {});
  const refusal = page.locator('form[action^="/web/login"] .alert-danger').first();
  if (await refusal.isVisible().catch(() => false)) {
    const text = ((await refusal.textContent()) || '').replace(/\s+/g, ' ').trim();
    throw friendly({
      message: `Logging in as "${handle}" (login "${username}") was refused.`,
      cause: `the login form reads "${text}"`,
      hint: 'Check that the account exists on the site under test (scripts/build-odoo.sh creates the accounts of this pack) and that the password in worldParameters.users is current.',
    });
  }
  if (await page.locator('.o_main_navbar').first().isVisible().catch(() => false)) {
    await waitForWebClient(world);
    return;
  }
  await waitForPageLoad(page, budget(world));
  // Neither the web client nor a refusal: the step must not pass on a login
  // that never happened, so the server is asked.
  const session = await sessionInfo(world);
  if (!session.uid) {
    throw friendly({
      message: `Logging in as "${handle}" (login "${username}") did not start a session.`,
      cause: `the page is ${page.url()} and the server reports no session for this browser`,
      hint: 'The site did not answer the login form in time, or the session cookie was not kept (a proxy that drops cookies, a site served over both http and https).',
    });
  }
}

// ---------------------------------------------------------------------------
// The web client: scope, views, dialogs
// ---------------------------------------------------------------------------

/**
 * The dialog on top, if one is open. Odoo stacks dialogs; the last one in the
 * document is the one the user sees.
 *
 * @param {import('playwright').Page} page
 * @returns {import('playwright').Locator}
 */
function topDialog(page) {
  return page.locator('.modal[role="dialog"]:visible, .modal.show:visible').last();
}

/**
 * Whether a dialog is open.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function dialogIsOpen(page) {
  return (await page.locator('.modal[role="dialog"]:visible, .modal.show:visible').count()) > 0;
}

/**
 * The part of the page the user is working in: the dialog on top when one is
 * open, the main action otherwise. A step that names a field or a button
 * looks there, as a user would.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<import('playwright').Locator>}
 */
async function activeScope(page) {
  if (await dialogIsOpen(page)) return topDialog(page);
  return page.locator('.o_action_manager').first();
}

/**
 * Require a view of the given kind in the active scope and return it.
 *
 * @param {object} world
 * @param {'list'|'kanban'|'form'} kind
 * @returns {Promise<import('playwright').Locator>}
 */
async function requireView(world, kind) {
  const page = world.page;
  const selectors = {
    list: '.o_list_view, .o_list_renderer',
    kanban: '.o_kanban_view, .o_kanban_renderer',
    form: '.o_form_view',
  };
  const scope = await activeScope(page);
  const view = scope.locator(selectors[kind]).first();
  try {
    await view.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a ${kind} view on screen.`,
      cause: `the page is ${page.url()}`,
      hint: kind === 'form'
        ? 'Open or create a record first ("When I open the "..." record", "When I create a new record").'
        : `Open a menu that lists records, or switch the view ("When I switch to the ${kind} view").`,
    });
  }
  return view;
}

module.exports = {
  WAIT_TIMEOUT,
  SHORT_TIMEOUT,
  supplied,
  budget,
  siteUrl,
  escapeRegExp,
  textPattern,
  labelPattern,
  trackRequests,
  settle,
  navigate,
  waitForWebClient,
  assertPresence,
  assertText,
  listTexts,
  resolveUser,
  loginPath,
  submitLogin,
  sessionInfo,
  loginAs,
  topDialog,
  dialogIsOpen,
  activeScope,
  requireView,
};

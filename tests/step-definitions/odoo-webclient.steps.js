'use strict';

// Web client steps for Odoo: the apps menu and the menus of an app, the
// breadcrumb, opening an action by its external ID, the view switcher, the
// search view (search, filters, grouping, facets), the list view (records,
// selection, groups, pager, the Actions menu) and the kanban view (cards,
// columns, moving a card).
//
// Every step waits on Odoo's own signals (the "Loading" indicator, the data
// requests of the web client) and never on a fixed delay.

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  WAIT_TIMEOUT,
  SHORT_TIMEOUT,
  settle,
  navigate,
  waitForWebClient,
  assertPresence,
  assertText,
  listTexts,
  textPattern,
  escapeRegExp,
  activeScope,
  requireView,
} = require('./odoo-helpers');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open the apps menu of the navigation bar (`.o_navbar_apps_menu`) and return
 * the list of apps. Odoo Enterprise shows the apps on a home screen
 * (`.o_home_menu`) instead; both are handled.
 *
 * @param {object} world
 * @returns {Promise<import('playwright').Locator>} The app entries.
 */
async function openAppsMenu(world) {
  const page = world.page;
  await waitForWebClient(world);
  const homeApps = page.locator('.o_home_menu .o_app');
  if (await homeApps.first().isVisible().catch(() => false)) return homeApps;
  const toggle = page.locator('.o_main_navbar .o_navbar_apps_menu button.dropdown-toggle, .o_main_navbar .o_menu_toggle').first();
  const apps = page.locator('.o_navbar_apps_menu .dropdown-menu .o_app, .o_home_menu .o_app');
  if (!(await apps.first().isVisible().catch(() => false))) {
    try {
      await toggle.click({ timeout: SHORT_TIMEOUT });
      await apps.first().waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    } catch (error) {
      throw friendly({
        action: 'open the apps menu',
        target: '.o_navbar_apps_menu',
        cause: error,
        hint: 'The apps menu is the first button of the navigation bar; a dialog on top of the page keeps it out of reach.',
      });
    }
  }
  return apps;
}

/**
 * Close the apps menu when it is open as a dropdown.
 *
 * @param {object} world
 * @returns {Promise<void>}
 */
async function closeAppsMenu(world) {
  const page = world.page;
  const menu = page.locator('.o_navbar_apps_menu .dropdown-menu');
  if (await menu.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden', timeout: SHORT_TIMEOUT }).catch(() => {});
  }
}

/**
 * The entries of the app's menu bar (`.o_menu_sections`): a direct entry is a
 * link, an entry with children is a dropdown button. Entries that do not fit
 * the width are moved by Odoo under a "+" button (`.o_menu_sections_more`).
 *
 * @param {import('playwright').Page} page
 * @returns {import('playwright').Locator}
 */
function menuSections(page) {
  return page.locator('.o_main_navbar .o_menu_sections > .o_nav_entry, .o_main_navbar .o_menu_sections > .dropdown > button.dropdown-toggle, .o_main_navbar .o_menu_sections > .o-dropdown > button');
}

/**
 * Walk a menu path such as "Orders > Quotations" and return the last entry,
 * visible and ready to be clicked. Each part is matched by its whole text.
 *
 * @param {object} world
 * @param {string} path
 * @returns {Promise<import('playwright').Locator>}
 */
async function reachMenu(world, path) {
  const page = world.page;
  const parts = String(path).split(/\s*>\s*/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    throw friendly({ message: 'The menu path is empty.', hint: 'Name the menu as it reads in the menu bar, with " > " between levels: "Orders > Quotations".' });
  }
  await waitForWebClient(world);
  let top = menuSections(page).filter({ hasText: textPattern(parts[0], { exact: true }) }).first();
  if (!(await top.isVisible().catch(() => false))) {
    const more = page.locator('.o_main_navbar .o_menu_sections_more button, .o_main_navbar .o_menu_sections .o_menu_sections_more').first();
    if (await more.isVisible().catch(() => false)) {
      await more.click();
      top = page.locator('.o_menu_sections_more .dropdown-menu .dropdown-item, .o-dropdown--menu .dropdown-item, .o-dropdown--menu .dropdown-toggle').filter({ hasText: textPattern(parts[0], { exact: true }) }).first();
    }
  }
  try {
    await top.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a "${parts[0]}" menu in the menu bar of the app.`,
      cause: `the menu bar offers ${await listTexts(menuSections(page))}`,
      hint: 'Open the app first ("When I open the "Sales" app"); a menu the user has no access to is not shown.',
    });
  }
  let current = top;
  for (let index = 1; index < parts.length; index += 1) {
    await current.click();
    const items = page.locator('.o-dropdown--menu:visible .dropdown-item, .o-dropdown--menu:visible .dropdown-toggle, .dropdown-menu.show .dropdown-item');
    const next = items.filter({ hasText: textPattern(parts[index], { exact: true }) }).first();
    try {
      await next.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    } catch (error) {
      throw friendly({
        message: `Expected a "${parts[index]}" entry under the "${parts.slice(0, index).join(' > ')}" menu.`,
        cause: `the menu offers ${await listTexts(items)}`,
        hint: 'Each part of the path is matched by its whole text, case-sensitive; a menu the user has no access to is not shown.',
      });
    }
    current = next;
  }
  return current;
}

/**
 * The search view of the active scope (`.o_searchview`), required.
 *
 * @param {object} world
 * @returns {Promise<{scope: import('playwright').Locator, input: import('playwright').Locator}>}
 */
async function requireSearchView(world) {
  const scope = await activeScope(world.page);
  const input = scope.locator('.o_searchview input.o_searchview_input').first();
  try {
    await input.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected a search view on screen.',
      cause: `the page is ${world.page.url()}`,
      hint: 'The search view sits in the control panel of a list, kanban or other multi-record view; a form view has none.',
    });
  }
  return { scope, input };
}

/**
 * Toggle an entry of the search options menu (the caret at the right of the
 * search view): a filter, a grouping or a favourite.
 *
 * @param {object} world
 * @param {'filter'|'group'|'favorite'} kind
 * @param {string} name
 * @returns {Promise<void>}
 */
async function toggleSearchOption(world, kind, name) {
  const page = world.page;
  const { scope } = await requireSearchView(world);
  const sections = {
    filter: { selector: '.o_filter_menu', label: 'filter', title: 'Filters' },
    group: { selector: '.o_group_by_menu', label: 'grouping', title: 'Group By' },
    favorite: { selector: '.o_favorite_menu', label: 'favourite', title: 'Favorites' },
  };
  const section = sections[kind];
  const menu = page.locator('.o_search_bar_menu').first();
  if (!(await menu.isVisible().catch(() => false))) {
    await scope.locator('.o_searchview_dropdown_toggler').first().click();
    await menu.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  }
  const entries = menu.locator(`${section.selector} .o_menu_item`);
  const entry = entries.filter({ hasText: textPattern(name, { exact: true }) }).first();
  try {
    await entry.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    const offered = await listTexts(entries.filter({ hasNot: page.locator('option') }));
    await page.keyboard.press('Escape').catch(() => {});
    throw friendly({
      message: `Expected a "${name}" ${section.label} under "${section.title}" in the search options.`,
      cause: `the menu offers ${offered}`,
      hint: 'The name is matched by its whole text, case-sensitive. The entries depend on the view: check the search options of this menu in the web client.',
    });
  }
  await entry.click();
  await settle(world);
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'hidden', timeout: SHORT_TIMEOUT }).catch(() => {});
  await settle(world);
}

/**
 * The records on screen in the active scope: the rows of a list view or the
 * cards of a kanban view.
 *
 * @param {object} world
 * @returns {Promise<{records: import('playwright').Locator, kind: string}>}
 */
async function recordsOnScreen(world) {
  const page = world.page;
  const scope = await activeScope(page);
  const container = scope.locator('.o_list_renderer, .o_kanban_renderer').first();
  try {
    await container.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected a list or a kanban view on screen.',
      cause: `the page is ${page.url()}`,
      hint: 'Open a menu that lists records first ("When I open the "Orders > Quotations" menu").',
    });
  }
  await settle(world);
  const isList = await scope.locator('.o_list_renderer').first().isVisible().catch(() => false);
  return isList
    ? { records: scope.locator('.o_list_renderer tr.o_data_row'), kind: 'list' }
    : { records: scope.locator('.o_kanban_renderer .o_kanban_record:not(.o_kanban_ghost)'), kind: 'kanban' };
}

/**
 * One record on screen, by a text it shows (its name, its reference).
 *
 * @param {object} world
 * @param {string} text
 * @returns {Promise<{record: import('playwright').Locator, records: import('playwright').Locator, kind: string}>}
 */
async function findRecord(world, text) {
  const { records, kind } = await recordsOnScreen(world);
  const record = records.filter({ hasText: textPattern(text) }).first();
  return { record, records, kind };
}

/**
 * A kanban column by its title.
 *
 * @param {object} world
 * @param {string} title
 * @returns {Promise<import('playwright').Locator>}
 */
async function findColumn(world, title) {
  const view = await requireView(world, 'kanban');
  await settle(world);
  const columns = view.locator('.o_kanban_group');
  const column = columns.filter({ has: world.page.locator('.o_column_title', { hasText: textPattern(title, { exact: true }) }) }).first();
  try {
    await column.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a "${title}" column in the kanban view.`,
      cause: `the view shows the columns ${await listTexts(view.locator('.o_kanban_group .o_column_title'))}`,
      hint: 'A kanban view has columns when its records are grouped (by stage, for example); a folded column shows its title only.',
    });
  }
  return column;
}

// ---------------------------------------------------------------------------
// Apps and menus
// ---------------------------------------------------------------------------

/**
 * Open an app from the apps menu of the navigation bar, by its name, and wait
 * for its first screen.
 *
 * Example #1: When I open the "CRM" app
 * Example #2: When we open the "Sales" app
 * Example #3: And I open the "Contacts" app
 * Example #4: When I open the "Invoicing" application
 * Example #5: And we open the "Website" application
 *
 */
When(/^(I |we )*open the "([^"]*)" app(?:lication)?$/, async function (pronounCase, name) {
  const page = this.page;
  const apps = await openAppsMenu(this);
  const app = apps.filter({ hasText: textPattern(name, { exact: true }) }).first();
  if (!(await app.isVisible().catch(() => false))) {
    const offered = await listTexts(apps, 40);
    await closeAppsMenu(this);
    throw friendly({
      message: `Expected a "${name}" app in the apps menu.`,
      cause: `the menu offers ${offered}`,
      hint: 'An app is listed when it is installed and the user belongs to one of its groups. The name is matched by its whole text, case-sensitive.',
    });
  }
  await app.click();
  try {
    await page.locator('.o_main_navbar .o_menu_brand').filter({ hasText: textPattern(name, { exact: true }) }).first().waitFor({ state: 'attached', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected the "${name}" app to open.`,
      cause: `the navigation bar reads "${((await page.locator('.o_main_navbar .o_menu_brand').first().textContent().catch(() => '')) || '').trim()}"`,
      hint: 'An error dialog on screen means the first screen of the app could not be loaded for this user.',
    });
  }
  await settle(this);
});

/**
 * Assert the apps menu lists, or does not list, an app. An app is listed
 * when it is installed and the user belongs to one of its groups, so this is
 * the first check of an access-rights scenario.
 *
 * Example #1: Then I should see the "CRM" app
 * Example #2: And I should not see the "Invoicing" app
 * Example #3: Then we should see the "Sales" app
 * Example #4: And I should not see the "Settings" application
 * Example #5: Then we should not see the "Website" application
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" app(?:lication)?$/, async function (pronounCase, notCase, name) {
  const apps = await openAppsMenu(this);
  const offered = await listTexts(apps, 40);
  const listed = (await apps.filter({ hasText: textPattern(name, { exact: true }) }).count()) > 0;
  await closeAppsMenu(this);
  if (listed === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected no "${name}" app in the apps menu.` : `Expected a "${name}" app in the apps menu.`,
      cause: `the menu offers ${offered}`,
      hint: 'An app is listed when it is installed and the user belongs to one of its groups.',
    });
  }
});

/**
 * Assert the app on screen is, or is not, the given one: the name the
 * navigation bar shows next to the apps menu (`.o_menu_brand`).
 *
 * Example #1: Then I should be in the "CRM" app
 * Example #2: And I should be in the "Sales" app
 * Example #3: Then we should be in the "Contacts" app
 * Example #4: And I should not be in the "Discuss" app
 * Example #5: Then we should not be in the "Invoicing" application
 *
 */
Then(/^(I |we )*should( not)* be in the "([^"]*)" app(?:lication)?$/, async function (pronounCase, notCase, name) {
  await waitForWebClient(this);
  await assertText(this.page.locator('.o_main_navbar .o_menu_brand'), name, notCase, 'the app name in the navigation bar (".o_menu_brand")', {
    exact: true,
    hint: 'The navigation bar shows the name of the app the current menu belongs to.',
  });
});

/**
 * Open a menu of the current app, by its path in the menu bar. Levels are
 * separated by " > ": "Orders > Quotations", "Configuration > Sales Teams".
 *
 * Example #1: When I open the "Orders > Quotations" menu
 * Example #2: When we open the "Sales > My Pipeline" menu
 * Example #3: And I open the "Customers > Invoices" menu
 * Example #4: When I open the "Configuration > Contact Tags" menu
 * Example #5: And we open the "Reporting" menu
 *
 */
When(/^(I |we )*open the "([^"]*)" menu$/, async function (pronounCase, path) {
  const entry = await reachMenu(this, path);
  await entry.click();
  await settle(this);
});

/**
 * Assert the menu bar of the current app offers, or does not offer, a menu.
 * A menu is shown when the user belongs to one of its groups. A path opens
 * the parent menus to look inside.
 *
 * Example #1: Then I should see the "Orders" menu
 * Example #2: And I should not see the "Configuration" menu
 * Example #3: Then we should see the "Orders > Quotations" menu
 * Example #4: And I should not see the "Reporting" menu
 * Example #5: Then we should not see the "Configuration > Settings" menu
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" menu$/, async function (pronounCase, notCase, path) {
  const page = this.page;
  let found = true;
  let failure = null;
  try {
    await reachMenu(this, path);
  } catch (error) {
    found = false;
    failure = error;
  }
  await page.keyboard.press('Escape').catch(() => {});
  if (!notCase && !found) throw failure;
  if (notCase && found) {
    throw friendly({
      message: `Expected no "${path}" menu in the menu bar of the app.`,
      cause: `the menu bar offers ${await listTexts(menuSections(page))}`,
      hint: 'A menu is shown when the user belongs to one of its groups.',
    });
  }
});

/**
 * Open an action by its external ID (`module.xml_id`), for example
 * `sale.action_quotations_with_onboarding`. This is the stable way to reach a
 * screen without depending on menu labels, and the way to check that a user
 * without the rights is refused.
 *
 * Example #1: When I open the "sale.action_quotations_with_onboarding" action
 * Example #2: When we open the "crm.crm_lead_action_pipeline" action
 * Example #3: And I open the "contacts.action_contacts" action
 * Example #4: When I open the "account.action_move_out_invoice_type" action
 * Example #5: And we open the "base.action_res_users" action
 *
 */
When(/^(I |we )*open the "([\w.]+)" action$/, async function (pronounCase, externalId) {
  const page = this.page;
  if (!/^\w+\.\w+$/.test(externalId)) {
    throw friendly({
      message: `"${externalId}" is not an external ID.`,
      hint: 'An external ID reads module.name, for example "sale.action_quotations_with_onboarding" (Settings > Technical > Actions shows it in developer mode).',
    });
  }
  const version = await page.evaluate(() => {
    const info = window.odoo && window.odoo.info;
    return info && Array.isArray(info.server_version_info) ? Number(info.server_version_info[0]) : 0;
  }).catch(() => 0);
  // Odoo 18 moved the web client from /web#action=... to /odoo/action-...
  const path = version >= 18 ? `/odoo/action-${externalId}` : `/web#action=${externalId}`;
  // A change of the URL fragment alone does not reload the page, so leave
  // the web client first; the action then loads on a fresh page.
  await page.goto('about:blank');
  await navigate(this, path);
  await waitForWebClient(this);
});

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

/**
 * Assert the breadcrumb of the control panel shows, or does not show, a
 * text: the trail of screens the user came through and the title of the
 * current one (`.o_breadcrumb`).
 *
 * Example #1: Then I should see "Quotations" in the breadcrumb
 * Example #2: And I should see "Pipeline" in the breadcrumb
 * Example #3: Then we should see "S00045" in the breadcrumb
 * Example #4: And I should not see "Invoices" in the breadcrumb
 * Example #5: Then we should not see "New" in the breadcrumb
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the breadcrumb$/, async function (pronounCase, notCase, text) {
  await settle(this);
  const scope = await activeScope(this.page);
  const parts = scope.locator('.o_breadcrumb .breadcrumb-item, .o_breadcrumb .o_last_breadcrumb_item');
  await assertText(parts, text, notCase, 'the breadcrumb (".o_breadcrumb")', {
    hint: `The breadcrumb reads ${await listTexts(parts)}.`,
  });
});

/**
 * Assert the title of the current screen, the last part of the breadcrumb
 * (`.o_last_breadcrumb_item`), is or is not the given text: the name of the
 * view, or of the record a form shows ("New" for a record not saved yet).
 *
 * Example #1: Then the breadcrumb title should be "Quotations"
 * Example #2: And the breadcrumb title should be "Pipeline"
 * Example #3: Then the breadcrumb title should be "New"
 * Example #4: And the breadcrumb title should not be "New"
 * Example #5: Then the breadcrumb title should not be "Invoices"
 *
 */
Then(/^the breadcrumb title should( not)* be "([^"]*)"$/, async function (notCase, text) {
  await settle(this);
  const scope = await activeScope(this.page);
  await assertText(scope.locator('.o_breadcrumb .o_last_breadcrumb_item'), text, notCase, 'the breadcrumb title (".o_last_breadcrumb_item")', {
    exact: true,
    hint: 'The title is the name of the view, or of the record on a form view; a new record reads "New" until it is saved.',
  });
});

/**
 * Go back through the breadcrumb: click one of the earlier screens of the
 * trail, by its text.
 *
 * Example #1: When I go back to "Quotations" in the breadcrumb
 * Example #2: When we go back to "Pipeline" in the breadcrumb
 * Example #3: And I go back to "Contacts" in the breadcrumb
 * Example #4: When I go back to "Invoices" in the breadcrumb
 * Example #5: And we go back to "Products" in the breadcrumb
 *
 */
When(/^(I |we )*go back to "([^"]*)" in the breadcrumb$/, async function (pronounCase, text) {
  const scope = await activeScope(this.page);
  const items = scope.locator('.o_breadcrumb .breadcrumb-item');
  const item = items.filter({ hasText: textPattern(text, { exact: true }) }).first();
  try {
    await item.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected "${text}" among the earlier screens of the breadcrumb.`,
      cause: `the breadcrumb offers ${await listTexts(items)}`,
      hint: 'Only the screens before the current one are links; the title of the current screen is not.',
    });
  }
  await item.locator('a').first().click();
  await settle(this);
});

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * Switch the view with the view switcher of the control panel
 * (`.o_cp_switch_buttons`): list, kanban, calendar, pivot, graph, activity.
 *
 * Example #1: When I switch to the list view
 * Example #2: When we switch to the kanban view
 * Example #3: And I switch to the "pivot" view
 * Example #4: When I switch to the graph view
 * Example #5: And we switch to the "calendar" view
 *
 */
When(/^(I |we )*switch to the "?(list|kanban|form|calendar|pivot|graph|activity|map|gantt|cohort)"? view$/, async function (pronounCase, type) {
  const page = this.page;
  const scope = await activeScope(page);
  await settle(this);
  let button = scope.locator(`.o_cp_switch_buttons .o_switch_view.o_${type}:visible`).first();
  if (!(await button.isVisible().catch(() => false))) {
    // On a narrow screen the switcher is a dropdown.
    const toggle = scope.locator('.o_cp_switch_buttons button.dropdown-toggle:visible').first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      button = page.locator(`.o-dropdown--menu .o_switch_view.o_${type}, .dropdown-menu.show .o_switch_view.o_${type}`).first();
    }
  }
  try {
    await button.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    const offered = await scope.locator('.o_cp_switch_buttons .o_switch_view').evaluateAll((buttons) => [...new Set(buttons.map((b) => (b.getAttribute('data-tooltip') || '').toLowerCase()).filter(Boolean))].join(', ')).catch(() => '');
    throw friendly({
      message: `Expected a "${type}" view in the view switcher.`,
      cause: `the switcher offers: ${offered || '(none)'}`,
      hint: 'The views on offer depend on the action; a form view has no view switcher.',
    });
  }
  await button.click();
  await scope.locator(`.o_${type}_view, .o_${type}_renderer`).first().waitFor({ state: 'visible', timeout: WAIT_TIMEOUT }).catch(() => {});
  await settle(this);
});

/**
 * Assert the view on screen is, or is not, of the given type
 * (`.o_list_view`, `.o_kanban_view`, `.o_form_view`, ...).
 *
 * Example #1: Then I should see the list view
 * Example #2: And I should see the kanban view
 * Example #3: Then we should see the "form" view
 * Example #4: And I should not see the list view
 * Example #5: Then we should not see the "kanban" view
 *
 */
Then(/^(I |we )*should( not)* see the "?(list|kanban|form|calendar|pivot|graph|activity|map|gantt|cohort)"? view$/, async function (pronounCase, notCase, type) {
  await settle(this);
  const scope = await activeScope(this.page);
  await assertPresence(scope.locator(`.o_${type}_view, .o_${type}_renderer`).first(), notCase, `the ${type} view (".o_${type}_view")`, {
    hint: 'Switch the view first ("When I switch to the list view"), or open a record for the form view.',
  });
});

// ---------------------------------------------------------------------------
// Search view
// ---------------------------------------------------------------------------

/**
 * Search the records on screen: type the text in the search view and press
 * Enter, which searches the first field the view proposes (usually the
 * name). With `in "<field>"` the proposal of that field is chosen instead
 * ("Search Customer for: ...").
 *
 * Example #1: When I search the records for "chair"
 * Example #2: When we search the records for "Azure"
 * Example #3: And I search the records for "Azure Interior" in "Customer"
 * Example #4: When I search the records for "S00007"
 * Example #5: And we search the records for "Mitchell" in "Salesperson"
 *
 */
When(/^(I |we )*search the records for "([^"]*)"(?: in "([^"]*)")?$/, async function (pronounCase, text, field) {
  const page = this.page;
  const { input } = await requireSearchView(this);
  await input.fill(text);
  const proposals = page.locator('.o_searchview_autocomplete .o_menu_item');
  await proposals.first().waitFor({ state: 'visible', timeout: SHORT_TIMEOUT }).catch(() => {});
  if (field) {
    const proposal = proposals.filter({ has: page.locator('b', { hasText: textPattern(field, { exact: true }) }) }).first();
    if (!(await proposal.isVisible().catch(() => false))) {
      const offered = await listTexts(page.locator('.o_searchview_autocomplete .o_menu_item b:first-of-type'));
      await input.fill('');
      throw friendly({
        message: `Expected the search view to propose a search in "${field}".`,
        cause: `it proposes the fields ${offered}`,
        hint: 'The fields are the ones the search view of this menu declares; the name is matched by its whole text, case-sensitive.',
      });
    }
    await proposal.locator('a:not(.o_expand)').first().click();
  } else {
    await input.press('Enter');
  }
  await settle(this);
});

/**
 * Turn a filter of the search options on or off, by its name under
 * "Filters". The entry is a toggle: applying a filter that is on turns it
 * off.
 *
 * Example #1: When I filter the records by "Won"
 * Example #2: When we filter the records by "My Quotations"
 * Example #3: And I filter the records by "Archived"
 * Example #4: When I toggle the "My Pipeline" filter
 * Example #5: And we toggle the "Companies" filter
 *
 */
When(/^(I |we )*(?:filter the records by "([^"]*)"|toggle the "([^"]*)" filter)$/, async function (pronounCase, nameA, nameB) {
  await toggleSearchOption(this, 'filter', nameA || nameB);
});

/**
 * Group the records by an entry of "Group By" in the search options. The
 * entry is a toggle: grouping by an entry that is on removes the grouping.
 *
 * Example #1: When I group the records by "Salesperson"
 * Example #2: When we group the records by "Stage"
 * Example #3: And I group the records by "Customer"
 * Example #4: When I group the records by "Country"
 * Example #5: And we group the records by "Sales Team"
 *
 */
When(/^(I |we )*group the records by "([^"]*)"$/, async function (pronounCase, name) {
  await toggleSearchOption(this, 'group', name);
});

/**
 * Assert the search view shows, or does not show, a facet with the given
 * text: the label of an active filter, grouping or search term
 * (`.o_searchview_facet`).
 *
 * Example #1: Then I should see the "My Pipeline" search facet
 * Example #2: And I should see the "chair" search facet
 * Example #3: Then we should see the "Salesperson" search facet
 * Example #4: And I should not see the "Won" search facet
 * Example #5: Then we should not see the "Archived" search facet
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" search facet$/, async function (pronounCase, notCase, text) {
  const { scope } = await requireSearchView(this);
  await settle(this);
  const facets = scope.locator('.o_searchview .o_searchview_facet');
  await assertText(facets, text, notCase, 'the facets of the search view (".o_searchview_facet")', {
    hint: `The search view shows the facets ${await listTexts(facets.locator('.o_facet_values'))}.`,
    timeout: SHORT_TIMEOUT,
  });
});

/**
 * Remove one facet of the search view, by its text, with its "Remove"
 * button.
 *
 * Example #1: When I remove the "My Pipeline" search facet
 * Example #2: When we remove the "chair" search facet
 * Example #3: And I remove the "Salesperson" search facet
 * Example #4: When I remove the "Won" search facet
 * Example #5: And we remove the "My Quotations" search facet
 *
 */
When(/^(I |we )*remove the "([^"]*)" search facet$/, async function (pronounCase, text) {
  const { scope } = await requireSearchView(this);
  const facets = scope.locator('.o_searchview .o_searchview_facet');
  const facet = facets.filter({ hasText: textPattern(text) }).first();
  try {
    await facet.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a "${text}" facet in the search view.`,
      cause: `the search view shows the facets ${await listTexts(facets.locator('.o_facet_values'))}`,
      hint: 'A facet is the label of an active filter, grouping or search term.',
    });
  }
  await facet.hover();
  await facet.locator('.o_facet_remove').first().click();
  await settle(this);
});

/**
 * Clear the search view: remove every facet, including the default filter
 * the menu applies, so that every record is listed.
 *
 * Example #1: When I clear the search
 * Example #2: When we clear the search
 * Example #3: And clear the search
 * Example #4: When I clear the search view
 * Example #5: And we clear the search view
 *
 */
When(/^(I |we )*clear the search(?: view)?$/, async function (pronounCase) {
  const { scope, input } = await requireSearchView(this);
  const facets = scope.locator('.o_searchview .o_searchview_facet');
  await input.fill('');
  let guard = 20;
  while ((await facets.count()) > 0 && guard > 0) {
    guard -= 1;
    const facet = facets.first();
    await facet.hover();
    await facet.locator('.o_facet_remove').first().click();
    await settle(this);
  }
});

// ---------------------------------------------------------------------------
// Records in a list or a kanban view
// ---------------------------------------------------------------------------

/**
 * Assert a record is, or is not, on screen: a row of the list view or a card
 * of the kanban view that shows the given text (the name or the reference of
 * the record).
 *
 * Example #1: Then I should see the "Azure Interior" record
 * Example #2: And I should see the "S00007" record
 * Example #3: Then we should see the "Quote for 600 Chairs" record
 * Example #4: And I should not see the "Deco Addict" record
 * Example #5: Then we should not see the "S00001" record
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" record$/, async function (pronounCase, notCase, text) {
  const { record, kind } = await findRecord(this, text);
  await assertPresence(record, notCase, `a record showing "${text}" in the ${kind} view`, {
    timeout: SHORT_TIMEOUT,
    hint: 'Only the records of the current page and of the current search are on screen: clear or change the search ("When I clear the search", "When I search the records for ...").',
  });
});

/**
 * Open a record from the list or the kanban view on screen, by a text it
 * shows, and wait for its form view.
 *
 * Example #1: When I open the "Azure Interior" record
 * Example #2: When we open the "S00007" record
 * Example #3: And I open the "Quote for 600 Chairs" record
 * Example #4: When I open the "Deco Addict" record
 * Example #5: And we open the "INV/2026/00001" record
 *
 */
When(/^(I |we )*open the "([^"]*)" record$/, async function (pronounCase, text) {
  const page = this.page;
  const { record, kind } = await findRecord(this, text);
  try {
    await record.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a record showing "${text}" in the ${kind} view.`,
      cause: error,
      hint: 'Only the records of the current page and of the current search are on screen: search for the record first ("When I search the records for ...").',
    });
  }
  if (kind === 'list') {
    // Click the cell that shows the text: the selection checkbox and the
    // widgets of other cells have their own click behaviour.
    const cell = record.locator('td.o_data_cell').filter({ hasText: textPattern(text) }).first();
    await cell.click();
  } else {
    const title = record.getByText(textPattern(text)).first();
    await title.click();
  }
  try {
    await page.locator('.o_form_view').first().waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected the form view of the "${text}" record to open.`,
      cause: error,
      hint: 'A list that is editable in place does not open a form on click; an error dialog on screen means the record could not be read.',
    });
  }
  await settle(this);
});

/**
 * Assert the number of records on screen: the rows of the list view or the
 * cards of the kanban view, for the current page and search.
 *
 * Example #1: Then I should see 3 records
 * Example #2: And I should see 1 record
 * Example #3: Then we should see 15 records
 * Example #4: And I should see 0 records
 * Example #5: Then we should see 80 records
 *
 */
Then(/^(I |we )*should see (\d+) records?$/, async function (pronounCase, expected) {
  const page = this.page;
  const { records, kind } = await recordsOnScreen(this);
  const wanted = Number(expected);
  const deadline = Date.now() + SHORT_TIMEOUT;
  let count = await records.count();
  while (count !== wanted && Date.now() < deadline) {
    await settle(this, 1000);
    count = await records.count();
  }
  if (count !== wanted) {
    throw friendly({
      message: `Expected ${wanted} record(s) in the ${kind} view.`,
      cause: `the view shows ${count}`,
      hint: `The count is the records of the current page and search (${page.url()}). A list shows 80 records per page by default.`,
    });
  }
});

/**
 * Assert the list or the kanban view shows no record: the "no content"
 * message of the view is on screen (`.o_view_nocontent`) or the view has no
 * record.
 *
 * Example #1: Then I should see no records
 * Example #2: And I should see no record
 * Example #3: Then we should see no records
 * Example #4: And I should see no records at all
 * Example #5: Then we should see no record
 *
 */
Then(/^(I |we )*should see no records?(?: at all)?$/, async function (pronounCase) {
  const { records, kind } = await recordsOnScreen(this);
  const deadline = Date.now() + SHORT_TIMEOUT;
  let count = await records.count();
  while (count !== 0 && Date.now() < deadline) {
    await settle(this, 1000);
    count = await records.count();
  }
  if (count !== 0) {
    throw friendly({
      message: `Expected no record in the ${kind} view.`,
      cause: `the view shows ${count}`,
      hint: 'Check the search: a default filter of the menu, or a facet left from an earlier step, changes what is listed.',
    });
  }
});

// ---------------------------------------------------------------------------
// List view: selection, groups, pager, the Actions menu
// ---------------------------------------------------------------------------

/**
 * Select or unselect a record of the list view with its checkbox, by a text
 * the row shows.
 *
 * Example #1: When I select the "S00007" record
 * Example #2: When we select the "Azure Interior" record
 * Example #3: And I unselect the "S00007" record
 * Example #4: When I select the "Deco Addict" record
 * Example #5: And we unselect the "Azure Interior" record
 *
 */
When(/^(I |we )*(select|unselect) the "([^"]*)" record$/, async function (pronounCase, action, text) {
  const view = await requireView(this, 'list');
  await settle(this);
  const row = view.locator('tr.o_data_row').filter({ hasText: textPattern(text) }).first();
  try {
    await row.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a row showing "${text}" in the list view.`,
      cause: error,
      hint: 'Only the records of the current page and search are on screen; search for the record first.',
    });
  }
  const checkbox = row.locator('.o_list_record_selector input[type="checkbox"]').first();
  if (action === 'select') await checkbox.check();
  else await checkbox.uncheck();
  await settle(this);
});

/**
 * Select every record of the page with the checkbox of the list header.
 *
 * Example #1: When I select all records
 * Example #2: When we select all records
 * Example #3: And I select all the records
 * Example #4: When select all records
 * Example #5: And we select all the records
 *
 */
When(/^(I |we )*select all (?:the )?records$/, async function (pronounCase) {
  const view = await requireView(this, 'list');
  await settle(this);
  await view.locator('thead .o_list_record_selector input[type="checkbox"]').first().check();
  await settle(this);
});

/**
 * Assert the number of selected records, as the control panel reports it
 * ("3 selected", `.o_list_selection_box`). With 0 the selection box must be
 * gone.
 *
 * Example #1: Then I should see 1 selected record
 * Example #2: And I should see 3 selected records
 * Example #3: Then we should see 15 selected records
 * Example #4: And I should see 0 selected records
 * Example #5: Then we should see 2 selected records
 *
 */
Then(/^(I |we )*should see (\d+) selected records?$/, async function (pronounCase, expected) {
  const scope = await activeScope(this.page);
  const box = scope.locator('.o_list_selection_box').first();
  if (Number(expected) === 0) {
    await assertPresence(box, ' not', 'the selection box of the list (".o_list_selection_box")', {
      timeout: SHORT_TIMEOUT,
      hint: 'The box is shown while at least one record is selected.',
    });
    return;
  }
  await assertPresence(box, undefined, 'the selection box of the list (".o_list_selection_box")', {
    timeout: SHORT_TIMEOUT,
    hint: 'Select a record first ("When I select the "..." record").',
  });
  await assertText(box, `${expected} selected`, undefined, 'the selection box of the list', {
    timeout: SHORT_TIMEOUT,
    hint: 'The box counts the selected records of the list.',
  });
});

/**
 * Choose an entry of the "Actions" menu of the control panel (the gear on a
 * form view): "Delete", "Archive", "Duplicate", "Export". On a list view the
 * menu is shown once at least one record is selected.
 *
 * Example #1: When I choose "Delete" in the Actions menu
 * Example #2: When we choose "Archive" in the Actions menu
 * Example #3: And I choose "Duplicate" in the Actions menu
 * Example #4: When I choose "Unarchive" in the actions menu
 * Example #5: And we choose "Export" in the actions menu
 *
 */
When(/^(I |we )*choose "([^"]*)" in the [Aa]ctions menu$/, async function (pronounCase, name) {
  const page = this.page;
  const scope = await activeScope(page);
  await settle(this);
  const toggle = scope.locator('.o_cp_action_menus button.dropdown-toggle:visible').filter({ has: page.locator('.fa-cog, .o_dropdown_title:text-is("Actions"), .o_dropdown_title:text-is("Action")') }).first();
  try {
    await toggle.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: 'open the Actions menu',
      target: '.o_cp_action_menus',
      cause: error,
      hint: 'On a list view, select at least one record first ("When I select the "..." record"); on a form view the menu is the gear next to the title.',
    });
  }
  const items = page.locator('.o-dropdown--menu:visible .dropdown-item, .dropdown-menu.show .dropdown-item');
  const item = items.filter({ hasText: textPattern(name, { exact: true }) }).first();
  try {
    await item.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    const offered = await listTexts(items);
    await page.keyboard.press('Escape').catch(() => {});
    throw friendly({
      message: `Expected a "${name}" entry in the Actions menu.`,
      cause: `the menu offers ${offered}`,
      hint: 'The entries depend on the model and on the rights of the user: "Delete" is missing for a user who may not delete.',
    });
  }
  await item.click();
  await settle(this);
});

/**
 * Assert the list view shows, or does not show, a group with the given name:
 * a group header row (`tr.o_group_header`) after a "Group By".
 *
 * Example #1: Then I should see the "Mitchell Admin" group
 * Example #2: And I should see the "Sales Order" group
 * Example #3: Then we should see the "Quotation" group
 * Example #4: And I should not see the "Cancelled" group
 * Example #5: Then we should not see the "Marc Demo" group
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" group$/, async function (pronounCase, notCase, name) {
  const view = await requireView(this, 'list');
  await settle(this);
  const groups = view.locator('tr.o_group_header .o_group_name');
  // A group header reads "Name (count)".
  const pattern = new RegExp(`^\\s*${escapeRegExp(name.trim())}\\s*(\\(\\s*\\d+\\s*\\))?\\s*$`);
  const group = groups.filter({ hasText: pattern }).first();
  await assertPresence(group, notCase, `the "${name}" group of the list`, {
    timeout: SHORT_TIMEOUT,
    hint: `The list shows the groups ${await listTexts(groups)}. Group the records first ("When I group the records by ...").`,
  });
});

/**
 * Open or close a group of a grouped list view, by its name, to show or hide
 * its records.
 *
 * Example #1: When I open the "Mitchell Admin" group
 * Example #2: When we open the "Sales Order" group
 * Example #3: And I close the "Quotation" group
 * Example #4: When I open the "Azure Interior" group
 * Example #5: And we close the "Mitchell Admin" group
 *
 */
When(/^(I |we )*(open|close) the "([^"]*)" group$/, async function (pronounCase, action, name) {
  const view = await requireView(this, 'list');
  await settle(this);
  const headers = view.locator('tr.o_group_header');
  const pattern = new RegExp(`^\\s*${escapeRegExp(name.trim())}\\s*(\\(\\s*\\d+\\s*\\))?\\s*$`);
  const header = headers.filter({ has: this.page.locator('.o_group_name', { hasText: pattern }) }).first();
  try {
    await header.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a "${name}" group in the list view.`,
      cause: `the list shows the groups ${await listTexts(view.locator('tr.o_group_header .o_group_name'))}`,
      hint: 'Group the records first ("When I group the records by ...").',
    });
  }
  const isOpen = await header.evaluate((row) => row.classList.contains('o_group_open'));
  if ((action === 'open') !== isOpen) {
    await header.locator('.o_group_name').first().click();
    await settle(this);
  }
});

/**
 * Assert what the pager of the control panel reads: the range of records on
 * screen and their total, as "1-80 / 132" on a list view or "1 / 15" on a
 * form view (`.o_pager_value`, `.o_pager_limit`).
 *
 * Example #1: Then the pager should read "1-15 / 15"
 * Example #2: And the pager should read "1-80 / 132"
 * Example #3: Then the pager should read "1 / 2"
 * Example #4: And the pager should not read "1-80 / 80"
 * Example #5: Then the pager should not read "1 / 1"
 *
 */
Then(/^the pager should( not)* read "([^"]*)"$/, async function (notCase, expected) {
  const scope = await activeScope(this.page);
  await settle(this);
  const pager = scope.locator('.o_pager .o_pager_counter').first();
  await assertPresence(pager, undefined, 'the pager of the control panel (".o_pager")', {
    timeout: SHORT_TIMEOUT,
    hint: 'A view with no record, and a new record that is not saved yet, show no pager.',
  });
  const wanted = expected.replace(/\s+/g, '');
  const deadline = Date.now() + SHORT_TIMEOUT;
  let text = '';
  do {
    text = ((await pager.textContent().catch(() => '')) || '').replace(/\s+/g, '');
    if ((text === wanted) !== Boolean(notCase)) return;
    await settle(this, 500);
  } while (Date.now() < deadline);
  throw friendly({
    message: notCase ? `Expected the pager not to read "${expected}".` : `Expected the pager to read "${expected}".`,
    cause: `it reads "${text.replace('/', ' / ')}"`,
    hint: 'The pager reads "first-last / total" on a list or kanban view and "position / total" on a form view; spaces are ignored.',
  });
});

/**
 * Go to the next or the previous page of records (on a form view: the next
 * or the previous record) with the arrows of the pager.
 *
 * Example #1: When I go to the next page of records
 * Example #2: When we go to the previous page of records
 * Example #3: And I go to the next record
 * Example #4: When I go to the previous record
 * Example #5: And go to the next page of records
 *
 */
When(/^(I |we )*go to the (next|previous) (?:page of records|record)$/, async function (pronounCase, direction) {
  const scope = await activeScope(this.page);
  await settle(this);
  const button = scope.locator(`.o_pager .o_pager_${direction}:visible`).first();
  try {
    await button.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: `click the "${direction}" arrow of the pager`,
      target: `.o_pager_${direction}`,
      cause: error,
      hint: 'The arrows are disabled when every record fits on one page; a new record that is not saved yet has no pager.',
    });
  }
  await settle(this);
});

// ---------------------------------------------------------------------------
// Kanban view: columns and cards
// ---------------------------------------------------------------------------

/**
 * Assert the kanban view shows, or does not show, a column with the given
 * title (`.o_kanban_group .o_column_title`): a stage of the pipeline, for
 * example.
 *
 * Example #1: Then I should see the "New" column
 * Example #2: And I should see the "Won" column
 * Example #3: Then we should see the "Qualified" kanban column
 * Example #4: And I should not see the "Archived" column
 * Example #5: Then we should not see the "Lost" kanban column
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" (?:kanban )?column$/, async function (pronounCase, notCase, title) {
  const view = await requireView(this, 'kanban');
  await settle(this);
  const titles = view.locator('.o_kanban_group .o_column_title');
  await assertPresence(titles.filter({ hasText: textPattern(title, { exact: true }) }).first(), notCase, `the "${title}" column of the kanban view`, {
    timeout: SHORT_TIMEOUT,
    hint: `The view shows the columns ${await listTexts(titles)}.`,
  });
});

/**
 * Assert a card is, or is not, in a column of the kanban view: a card that
 * shows the given text, inside the column with the given title.
 *
 * Example #1: Then I should see the "Quote for 600 Chairs" card in the "Qualified" column
 * Example #2: And I should see the "Info about services" card in the "New" column
 * Example #3: Then we should see the "Modern Open Space" card in the "Proposition" kanban column
 * Example #4: And I should not see the "Quote for 600 Chairs" card in the "Won" column
 * Example #5: Then we should not see the "Info about services" card in the "Qualified" column
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" card in the "([^"]*)" (?:kanban )?column$/, async function (pronounCase, notCase, text, title) {
  const column = await findColumn(this, title);
  const cards = column.locator('.o_kanban_record:not(.o_kanban_ghost)');
  await assertPresence(cards.filter({ hasText: textPattern(text) }).first(), notCase, `a card showing "${text}" in the "${title}" column`, {
    timeout: SHORT_TIMEOUT,
    hint: 'A column loads its cards by pages ("Load more"); the search of the view also changes which cards are shown.',
  });
});

/**
 * Assert the number of cards a column of the kanban view shows.
 *
 * Example #1: Then the "New" column should have 2 cards
 * Example #2: And the "Won" column should have 1 card
 * Example #3: Then the "Qualified" kanban column should have 3 cards
 * Example #4: And the "Proposition" column should have 0 cards
 * Example #5: Then the "New" column should have 4 cards
 *
 */
Then(/^the "([^"]*)" (?:kanban )?column should have (\d+) cards?$/, async function (title, expected) {
  const column = await findColumn(this, title);
  const cards = column.locator('.o_kanban_record:not(.o_kanban_ghost)');
  const wanted = Number(expected);
  const deadline = Date.now() + SHORT_TIMEOUT;
  let count = await cards.count();
  while (count !== wanted && Date.now() < deadline) {
    await settle(this, 1000);
    count = await cards.count();
  }
  if (count !== wanted) {
    throw friendly({
      message: `Expected ${wanted} card(s) in the "${title}" column.`,
      cause: `the column shows ${count}`,
      hint: 'The count is the cards on screen for the current search; a column loads its cards by pages ("Load more").',
    });
  }
});

/**
 * Move a card of the kanban view to another column by dragging it, the way a
 * user moves an opportunity to another stage. The step waits for the server
 * to save the move and for the card to be in the target column.
 *
 * Example #1: When I drag the "Quote for 600 Chairs" card to the "Proposition" column
 * Example #2: When we drag the "Info about services" card to the "Qualified" column
 * Example #3: And I move the "Modern Open Space" card to the "Won" column
 * Example #4: When I drag the "Quote for 12 Tables" card to the "New" kanban column
 * Example #5: And we move the "Global Solutions: Furnitures" card to the "Proposition" column
 *
 */
When(/^(I |we )*(?:drag|move) the "([^"]*)" card to the "([^"]*)" (?:kanban )?column$/, async function (pronounCase, text, title) {
  const page = this.page;
  const view = await requireView(this, 'kanban');
  await settle(this);
  const card = view.locator('.o_kanban_record:not(.o_kanban_ghost)').filter({ hasText: textPattern(text) }).first();
  try {
    await card.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a card showing "${text}" in the kanban view.`,
      cause: error,
      hint: 'Check the search of the view: a default filter may hide the card.',
    });
  }
  const column = await findColumn(this, title);
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  const header = await column.locator('.o_kanban_header').first().boundingBox();
  const target = await column.boundingBox();
  if (!from || !target || !header) {
    throw friendly({
      message: `The "${text}" card or the "${title}" column is not on screen.`,
      hint: 'Widen the viewport or scroll the kanban view so that both are visible.',
    });
  }
  // Odoo starts a drag after the pointer has moved a few pixels with the
  // button down, and reads the drop target from the pointer position: move in
  // steps, and drop just under the header of the target column.
  const startX = from.x + from.width / 2;
  const startY = from.y + Math.min(from.height / 2, 20);
  const endX = target.x + target.width / 2;
  const endY = header.y + header.height + 30;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12, { steps: 4 });
  await page.mouse.move(endX, endY, { steps: 12 });
  await page.mouse.move(endX, endY + 2, { steps: 2 });
  await page.mouse.up();
  await settle(this);
  const moved = column.locator('.o_kanban_record:not(.o_kanban_ghost)').filter({ hasText: textPattern(text) }).first();
  try {
    await moved.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected the "${text}" card in the "${title}" column after the move.`,
      cause: (await page.locator('.modal[role="dialog"]:visible').count())
        ? `a dialog opened: "${((await page.locator('.modal[role="dialog"]:visible .modal-title').last().textContent().catch(() => '')) || '').trim()}"`
        : 'the card did not land in the column',
      hint: 'A kanban view allows the move only when its records may be dragged between groups and the user may write the record.',
    });
  }
});

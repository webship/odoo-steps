'use strict';

// Record steps for Odoo: creating a record, the fields of a form view by
// their label (text, number, date, selection, many2one, tags, checkbox,
// radio), saving and discarding, the buttons and the status bar of a form,
// tabs, the lines of a one2many list, dialogs, notifications, the chatter and
// the access error Odoo shows a user without the rights.
//
// A step that names a field or a button looks where the user is working: in
// the dialog on top when one is open, in the main view otherwise.

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  WAIT_TIMEOUT,
  SHORT_TIMEOUT,
  supplied,
  settle,
  assertPresence,
  assertText,
  listTexts,
  textPattern,
  labelPattern,
  escapeRegExp,
  topDialog,
  dialogIsOpen,
  activeScope,
  requireView,
} = require('./odoo-helpers');

// ---------------------------------------------------------------------------
// Helpers: the form and its fields
// ---------------------------------------------------------------------------

/**
 * The form the user is working in: the form of the dialog on top, or the
 * form of the main view (which may be the quick-create form of a kanban
 * column).
 *
 * @param {object} world
 * @returns {Promise<import('playwright').Locator>}
 */
async function activeForm(world) {
  await requireView(world, 'form');
  const scope = await activeScope(world.page);
  return scope.locator('.o_form_view:visible').last();
}

/**
 * The labels a form shows, for a hint.
 *
 * @param {import('playwright').Locator} form
 * @returns {Promise<string>}
 */
async function fieldLabels(form) {
  const labels = await form.locator('label.o_form_label').evaluateAll((elements) => elements
    .filter((element) => element.offsetParent !== null)
    .map((element) => [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)).catch(() => []);
  const unique = [...new Set(labels)];
  return unique.length ? unique.slice(0, 40).map((label) => `"${label}"`).join(', ') : '(none)';
}

/**
 * Find a field of the active form. The name is, in this order: the label the
 * form shows for the field ("Customer"), the placeholder of its input ("e.g.
 * Product Pricing"), or the technical name of the field ("partner_id").
 * Returns the field widget (`.o_field_widget`).
 *
 * @param {object} world
 * @param {string} name
 * @param {{container?: import('playwright').Locator, timeout?: number}} [options]
 * @returns {Promise<import('playwright').Locator>}
 */
async function findField(world, name, options = {}) {
  const page = world.page;
  const form = options.container || await activeForm(world);
  const quoted = String(name).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const candidates = async () => {
    const found = [];
    const labels = form.locator('label.o_form_label').filter({ hasText: labelPattern(name) });
    const labelCount = await labels.count();
    for (let index = 0; index < labelCount; index += 1) {
      const label = labels.nth(index);
      const target = await label.getAttribute('for').catch(() => null);
      if (target) {
        found.push(form.locator('.o_field_widget').filter({ has: page.locator(`[id="${target}"]`) }).last());
      }
      // A field with no input of that id (a read-only value, a radio group):
      // the first field widget after the label.
      found.push(label.locator('xpath=following::div[contains(concat(" ", normalize-space(@class), " "), " o_field_widget ")][1]'));
    }
    found.push(form.locator('.o_field_widget').filter({ has: page.locator(`input[placeholder="${quoted}"], textarea[placeholder="${quoted}"]`) }).last());
    if (/^[a-z][a-z0-9_]*$/.test(name)) {
      found.push(form.locator(`.o_field_widget[name="${name}"]`).first());
    }
    return found;
  };

  const deadline = Date.now() + (options.timeout || SHORT_TIMEOUT);
  for (;;) {
    for (const candidate of await candidates()) {
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
    if (Date.now() >= deadline) break;
    await settle(world, 500);
  }
  throw friendly({
    message: `Expected a "${name}" field in the form.`,
    cause: `the form shows the labels ${await fieldLabels(form)}`,
    hint: 'Name the field by its label, by the placeholder of its input, or by its technical name ("partner_id"). A field in another tab is reached after opening the tab ("When I open the "..." tab").',
  });
}

/**
 * What kind of field a widget is, read from the widget itself.
 *
 * @param {import('playwright').Locator} widget
 * @returns {Promise<{kind: string, readonly: boolean, classes: string}>}
 */
async function describeField(widget) {
  return widget.evaluate((element) => {
    const classes = element.className || '';
    const has = (selector) => Boolean(element.querySelector(selector));
    const readonly = /\bo_readonly_modifier\b/.test(classes);
    let kind = 'text';
    if (/\bo_field_many2many_tags\b/.test(classes) || has('.o_field_tags')) kind = 'tags';
    else if (has('input[type="checkbox"]')) kind = 'boolean';
    else if (has('input[type="radio"]')) kind = 'radio';
    else if (/\bo_field_priority\b/.test(classes)) kind = 'priority';
    else if (has('select')) kind = 'selection';
    else if (has('.o_field_many2one_selection') || /many2one/.test(classes)) kind = 'many2one';
    else if (/\bo_field_html\b/.test(classes) || has('.odoo-editor-editable, .note-editable')) kind = 'html';
    else if (/\bo_field_(date|datetime|daterange)\b/.test(classes)) kind = 'date';
    else if (has('input, textarea')) kind = 'text';
    else kind = 'static';
    return { kind, readonly, classes };
  });
}

/**
 * Pick an entry of the autocomplete list a many2one or a tags field opens
 * (`.o-autocomplete--dropdown-menu`), by its whole text; when no entry reads
 * exactly that, the single entry that contains it.
 *
 * @param {object} world
 * @param {import('playwright').Locator} widget
 * @param {string} name
 * @param {string} value
 * @returns {Promise<void>}
 */
async function pickFromAutocomplete(world, widget, name, value) {
  const page = world.page;
  const input = widget.locator('.o-autocomplete input').first();
  await input.click();
  await input.fill(value);
  const menu = widget.locator('.o-autocomplete--dropdown-menu').first();
  const records = menu.locator('.o-autocomplete--dropdown-item:not(.o_m2o_dropdown_option)');
  const loading = menu.locator('.o_m2o_dropdown_option:has-text("Loading"), .fa-spin');
  try {
    await menu.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    await loading.first().waitFor({ state: 'hidden', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: `open the list of the "${name}" field`,
      target: '.o-autocomplete--dropdown-menu',
      cause: error,
      hint: 'The field proposes records while the user types; a read-only field proposes nothing.',
    });
  }
  // A proposal reads as the name of the record, sometimes after a reference
  // in brackets ("[FURN_7777] Office Chair") or before a detail set off by a
  // dash ("Acme Corporation \u2012 US12345673", a company and its tax ID). The
  // value matches the whole text, the text without those two additions, or
  // the only proposal that contains it.
  const body = String(value).trim().split(/\s+/).map(escapeRegExp).join('\\s+');
  const exact = new RegExp(`^\\s*(\\[[^\\]]*\\]\\s*)?${body}(\\s+\u2012\\s+.*)?\\s*$`);
  const deadline = Date.now() + SHORT_TIMEOUT;
  let entry = null;
  for (;;) {
    await settle(world, 2000);
    const whole = records.filter({ hasText: exact });
    if (await whole.count()) { entry = whole.first(); break; }
    const partial = records.filter({ hasText: textPattern(value) });
    if ((await partial.count()) === 1) { entry = partial.first(); break; }
    if (Date.now() >= deadline) break;
  }
  if (!entry) {
    const offered = await listTexts(records);
    await page.keyboard.press('Escape').catch(() => {});
    await input.fill('').catch(() => {});
    throw friendly({
      message: `Expected the "${name}" field to propose "${value}".`,
      cause: `it proposes ${offered}`,
      hint: 'The value is matched against the whole text of a proposal (a reference in brackets before the name and a detail after a dash are ignored); when several proposals contain the text, write one of them in full. A record the user may not read is not proposed.',
    });
  }
  await entry.click();
  await settle(world);
}

/**
 * Set a field to a value, the way a user would for that kind of field.
 *
 * @param {object} world
 * @param {import('playwright').Locator} widget
 * @param {string} name
 * @param {string} value
 * @returns {Promise<void>}
 */
async function setFieldValue(world, widget, name, value) {
  const page = world.page;
  const { kind, readonly } = await describeField(widget);
  if (readonly || kind === 'static') {
    throw friendly({
      message: `The "${name}" field is read-only.`,
      hint: 'A field can be read-only for this user, in this state of the record, or always (a computed value). Check the state of the record and the rights of the user.',
    });
  }
  await widget.scrollIntoViewIfNeeded().catch(() => {});
  switch (kind) {
    case 'many2one': {
      if (value === '') {
        const input = widget.locator('.o-autocomplete input').first();
        await input.fill('');
        await page.keyboard.press('Escape').catch(() => {});
        await input.blur();
        break;
      }
      await pickFromAutocomplete(world, widget, name, value);
      break;
    }
    case 'tags': {
      for (const tag of value.split(/\s*,\s*/).filter(Boolean)) {
        await pickFromAutocomplete(world, widget, name, tag);
      }
      break;
    }
    case 'selection': {
      const select = widget.locator('select').first();
      const options = await select.locator('option').evaluateAll((elements) => elements.map((option) => ({ label: (option.textContent || '').trim(), value: option.value })));
      const option = options.find((candidate) => candidate.label === value);
      if (!option) {
        throw friendly({
          message: `Expected the "${name}" field to offer "${value}".`,
          cause: `it offers ${options.filter((candidate) => candidate.label).map((candidate) => `"${candidate.label}"`).join(', ') || '(none)'}`,
          hint: 'The value is matched by its whole text, case-sensitive.',
        });
      }
      await select.selectOption({ value: option.value });
      break;
    }
    case 'radio': {
      const items = widget.locator('.o_radio_item, .form-check');
      const item = items.filter({ hasText: textPattern(value, { exact: true }) }).first();
      if (!(await item.isVisible().catch(() => false))) {
        throw friendly({
          message: `Expected the "${name}" field to offer "${value}".`,
          cause: `it offers ${await listTexts(items)}`,
          hint: 'The value is matched by its whole text, case-sensitive.',
        });
      }
      await item.locator('input[type="radio"]').first().check();
      break;
    }
    case 'priority': {
      const stars = widget.locator('.o_priority_star');
      const star = widget.locator(`.o_priority_star[aria-label="${value.replace(/"/g, '\\"')}"]`).first();
      if (!(await star.isVisible().catch(() => false))) {
        const offered = await stars.evaluateAll((elements) => elements.map((element) => `"${element.getAttribute('aria-label')}"`).join(', ')).catch(() => '');
        throw friendly({
          message: `Expected the "${name}" field to offer "${value}".`,
          cause: `it offers ${offered || '(none)'}`,
          hint: 'A priority is named by the label of its star, for example "High".',
        });
      }
      if ((await star.getAttribute('aria-checked')) !== 'true') await star.click();
      break;
    }
    case 'boolean': {
      const wanted = /^(yes|true|on|checked|1)$/i.test(value.trim());
      const unwanted = /^(no|false|off|unchecked|0)$/i.test(value.trim());
      if (!wanted && !unwanted) {
        throw friendly({
          message: `"${value}" is not a value for the "${name}" checkbox.`,
          hint: 'Use "yes" or "no", or the steps "When I check the "..." field" and "When I uncheck the "..." field".',
        });
      }
      await widget.locator('input[type="checkbox"]').first().setChecked(wanted);
      break;
    }
    case 'html': {
      const editor = widget.locator('.odoo-editor-editable, .note-editable').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.press('Delete');
      if (value) await page.keyboard.insertText(value);
      await editor.blur().catch(() => {});
      break;
    }
    case 'date': {
      const input = widget.locator('input').first();
      await input.click();
      await input.fill(value);
      // Enter applies the typed date and closes the date picker.
      await input.press('Enter');
      await page.locator('.o_datetime_picker').first().waitFor({ state: 'hidden', timeout: SHORT_TIMEOUT }).catch(() => {});
      break;
    }
    default: {
      const input = widget.locator('input:not([type="hidden"]), textarea').first();
      await input.fill(value);
      // Odoo commits the value of an input when it changes: leaving the
      // field is what a user does next.
      await input.dispatchEvent('change');
      await input.blur().catch(() => {});
    }
  }
  await settle(world);
}

/**
 * Read the value a field shows, as text.
 *
 * @param {import('playwright').Locator} widget
 * @returns {Promise<string>}
 */
async function readFieldValue(widget) {
  const { kind } = await describeField(widget);
  const clean = (text) => (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  switch (kind) {
    case 'tags':
      return clean((await widget.locator('.o_tag_badge_text, .o_tag').evaluateAll((elements) => [...new Set(elements.map((element) => (element.textContent || '').trim()).filter(Boolean))])).join(', '));
    case 'boolean':
      return (await widget.locator('input[type="checkbox"]').first().isChecked()) ? 'yes' : 'no';
    case 'radio':
      return clean(await widget.locator('.o_radio_item:has(input:checked), .form-check:has(input:checked)').first().textContent().catch(() => ''));
    case 'priority':
      return clean(await widget.locator('.o_priority_star[aria-checked="true"]').last().getAttribute('aria-label').catch(() => ''));
    case 'selection':
      return clean(await widget.locator('select').first().evaluate((select) => (select.selectedOptions[0] ? select.selectedOptions[0].textContent : '')));
    case 'html':
      return clean(await widget.locator('.odoo-editor-editable, .note-editable, .o_readonly').first().textContent().catch(() => ''));
    case 'static':
      return clean(await widget.textContent());
    default:
      return clean(await widget.locator('input:not([type="hidden"]), textarea').first().inputValue());
  }
}

/**
 * The buttons of the active scope a user can click by their text: the action
 * buttons of a form (header, status bar, smart buttons, the body of the
 * form) or the buttons of a dialog.
 *
 * @param {object} world
 * @returns {Promise<{scope: import('playwright').Locator, buttons: import('playwright').Locator, inDialog: boolean}>}
 */
async function scopeButtons(world) {
  const page = world.page;
  const inDialog = await dialogIsOpen(page);
  const scope = await activeScope(page);
  const buttons = inDialog
    ? scope.locator('.modal-footer button:visible, .modal-body button:visible, .modal-header button:visible')
    : scope.locator('.o_form_view button:visible, .o_control_panel .o_control_panel_main_buttons button:visible, .o_kanban_quick_create button:visible');
  return { scope, buttons, inDialog };
}

/**
 * Find one button of the active scope by its text: the whole text first,
 * then (for smart buttons such as "3 Quotations") the single button that
 * contains it.
 *
 * @param {object} world
 * @param {string} text
 * @returns {Promise<{button: (import('playwright').Locator|null), offered: string, inDialog: boolean}>}
 */
async function findButton(world, text) {
  await settle(world);
  const { buttons, inDialog } = await scopeButtons(world);
  const deadline = Date.now() + SHORT_TIMEOUT;
  do {
    const exact = buttons.filter({ hasText: textPattern(text, { exact: true }) });
    if (await exact.count()) return { button: exact.first(), offered: '', inDialog };
    const partial = buttons.filter({ hasText: textPattern(text) });
    if ((await partial.count()) === 1) return { button: partial.first(), offered: '', inDialog };
    await settle(world, 500);
  } while (Date.now() < deadline);
  return { button: null, offered: await listTexts(buttons, 40), inDialog };
}

// ---------------------------------------------------------------------------
// Creating, saving and discarding a record
// ---------------------------------------------------------------------------

/**
 * Start a new record with the "New" button of the control panel
 * (`.o_list_button_add`, `.o-kanban-button-new`, `.o_form_button_create`) and
 * wait for the empty form. On a kanban view with quick creation the form
 * opens inside the first column.
 *
 * Example #1: When I create a new record
 * Example #2: When we create a new record
 * Example #3: And start a new record
 * Example #4: When I start a new record
 * Example #5: And we start a new record
 *
 */
When(/^(I |we )*(?:create|start) a new record$/, async function (pronounCase) {
  const page = this.page;
  await settle(this);
  const scope = await activeScope(page);
  const button = scope.locator('.o_control_panel .o_list_button_add:visible, .o_control_panel .o-kanban-button-new:visible, .o_control_panel .o_form_button_create:visible').first();
  try {
    await button.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: 'click the "New" button of the control panel',
      target: '.o_list_button_add, .o-kanban-button-new, .o_form_button_create',
      cause: error,
      hint: 'The button is missing when the user may not create this kind of record, or when the view does not allow creation.',
    });
  }
  try {
    await page.locator('.o_form_view.o_form_editable:visible, .o_form_view .o_form_editable:visible, .o_kanban_quick_create:visible').first().waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected an empty form after clicking "New".',
      cause: error,
      hint: 'An error dialog on screen means the form could not be prepared for this user.',
    });
  }
  await settle(this);
});

/**
 * Click the save button of the form view and wait for the server. With
 * `strict` a save the form refuses is an error that names the fields Odoo
 * marks as invalid.
 *
 * @param {object} world
 * @param {boolean} strict
 * @returns {Promise<void>}
 */
async function saveForm(world, strict) {
  const page = world.page;
  const form = await activeForm(world);
  await settle(world);
  const scope = await activeScope(page);
  const save = scope.locator('.o_form_button_save:visible').first();
  if (await save.isVisible().catch(() => false)) {
    await save.click();
  }
  await settle(world);
  if (!strict) return;
  const invalid = form.locator('.o_field_widget.o_field_invalid');
  if (await invalid.count()) {
    const names = await invalid.evaluateAll((elements) => [...new Set(elements.map((element) => {
      const input = element.querySelector('[id]');
      const label = input && element.ownerDocument.querySelector(`label[for="${input.id}"]`);
      return (label && label.textContent.replace(/\?\s*$/, '').trim()) || element.getAttribute('name');
    }))].join(', '));
    throw friendly({
      message: 'The record was not saved: the form has invalid fields.',
      cause: `Odoo marks these fields as invalid: ${names}`,
      hint: 'Fill the required fields first; the notification on screen names them as well. To check a refused save on purpose, use "When I try to save the record".',
    });
  }
  const dirty = scope.locator('.o_form_status_indicator_buttons:not(.invisible) .o_form_button_save:visible').first();
  try {
    await dirty.waitFor({ state: 'hidden', timeout: SHORT_TIMEOUT });
  } catch (error) {
    const dialogTitle = (await dialogIsOpen(page)) ? ((await topDialog(page).locator('.modal-title').first().textContent().catch(() => '')) || '').trim() : '';
    throw friendly({
      message: 'Expected the record to be saved.',
      cause: dialogTitle ? `a dialog opened: "${dialogTitle}"` : 'the form still shows unsaved changes',
      hint: 'An error dialog names the rule the server refused the record for (a validation error, an access right).',
    });
  }
}

/**
 * Save the record on the form view with the save button of the control
 * panel (`.o_form_button_save`) and wait for the server. The step fails when
 * the form refuses to save, naming the fields Odoo marks as invalid.
 *
 * Example #1: When I save the record
 * Example #2: When we save the record
 * Example #3: And save the form
 * Example #4: When I save the form
 * Example #5: And we save the form
 *
 */
When(/^(I |we )*save the (?:record|form)$/, async function (pronounCase) {
  await saveForm(this, true);
});

/**
 * Click the save button of the form view without expecting the save to
 * succeed, for a scenario whose subject is the refusal: a missing required
 * field, a validation rule. Assert the outcome in the steps that follow (a
 * notification, an invalid field, a dialog).
 *
 * Example #1: When I try to save the record
 * Example #2: When we try to save the record
 * Example #3: And try to save the record
 * Example #4: When I try to save the form
 * Example #5: And we try to save the form
 *
 */
When(/^(I |we )*try to save the (?:record|form)$/, async function (pronounCase) {
  await saveForm(this, false);
});

/**
 * Discard the changes of the form view with the discard button of the
 * control panel (`.o_form_button_cancel`). A new record that was never saved
 * is dropped and the previous view comes back.
 *
 * Example #1: When I discard the changes
 * Example #2: When we discard the changes
 * Example #3: And I discard the record
 * Example #4: When we discard the record
 * Example #5: And we discard the changes of the record
 *
 */
When(/^(I |we )*discard the (?:record|changes(?: of the record)?)$/, async function (pronounCase) {
  const page = this.page;
  await activeForm(this);
  const scope = await activeScope(page);
  const discard = scope.locator('.o_form_button_cancel:visible').first();
  try {
    await discard.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: 'click the discard button of the form',
      target: '.o_form_button_cancel',
      cause: error,
      hint: 'The button is shown while the form has unsaved changes, and on a new record.',
    });
  }
  await settle(this);
});

/**
 * Assert the form view has, or does not have, unsaved changes: the save and
 * discard buttons of the control panel are shown while the record differs
 * from what the server holds (`.o_form_status_indicator_buttons`).
 *
 * Example #1: Then the record should have unsaved changes
 * Example #2: And the record should not have unsaved changes
 * Example #3: Then the form should have unsaved changes
 * Example #4: But the form should have unsaved changes
 * Example #5: Then the form should not have unsaved changes
 *
 */
Then(/^the (?:record|form) should( not)* have unsaved changes$/, async function (notCase) {
  await activeForm(this);
  await settle(this);
  const scope = await activeScope(this.page);
  const buttons = scope.locator('.o_form_status_indicator_buttons:not(.invisible) .o_form_button_save').first();
  await assertPresence(buttons, notCase, 'the save button of a form with unsaved changes (".o_form_button_save")', {
    timeout: SHORT_TIMEOUT,
    hint: 'A new record always counts as unsaved; Odoo also saves a record on its own when the user leaves the form.',
  });
});

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/**
 * Set a field of the form to a value. The field is named by its label, by
 * the placeholder of its input or by its technical name, and filled the way
 * a user would for its kind: typed for a text, a number or a date, chosen
 * for a selection, a radio group or a priority, picked from the proposals
 * for a many2one, added for a tags field (several tags separated by commas),
 * "yes" or "no" for a checkbox. An empty value clears a text or a many2one.
 *
 * Example #1: When I set the "Customer" field to "Azure Interior"
 * Example #2: When we set the "Expiration" field to "12/31/2030"
 * Example #3: And I set the "Product Type" field to "Service"
 * Example #4: When I set the "e.g. Product Pricing" field to "Office chairs for the new site"
 * Example #5: And we set the "Tags" field to "Product, Services"
 *
 */
When(/^(I |we )*set the "([^"]*)" field to "([^"]*)"$/, async function (pronounCase, name, value) {
  const widget = await findField(this, name);
  await setFieldValue(this, widget, name, value);
});

/**
 * Set several fields of the form from a table: the first column names the
 * field, the second gives the value. Each row behaves like `When I set the
 * "<field>" field to "<value>"`.
 *
 * Example #1: When I set the fields:
 * Example #2: When we set the fields:
 * Example #3: And set the following fields:
 * Example #4: When I set the following fields:
 * Example #5: And we set the following fields:
 *
 */
When(/^(I |we )*set the (?:following )?fields:$/, async function (pronounCase, dataTable) {
  for (const [name, value] of dataTable.raw()) {
    const widget = await findField(this, name);
    await setFieldValue(this, widget, name, value === undefined ? '' : value);
  }
});

/**
 * Check or uncheck a checkbox field of the form, named like any other
 * field.
 *
 * Example #1: When I check the "Can be Sold" field
 * Example #2: When we uncheck the "Can be Purchased" field
 * Example #3: And I check the "Is a Company" field
 * Example #4: When I tick the "Active" field
 * Example #5: And we untick the "Can be Sold" field
 *
 */
When(/^(I |we )*(check|uncheck|tick|untick) the "([^"]*)" field$/, async function (pronounCase, action, name) {
  const widget = await findField(this, name);
  const { kind } = await describeField(widget);
  if (kind !== 'boolean') {
    throw friendly({
      message: `The "${name}" field is not a checkbox.`,
      hint: 'Use "When I set the "..." field to "..."" for the other kinds of field.',
    });
  }
  await setFieldValue(this, widget, name, /^(check|tick)$/.test(action) ? 'yes' : 'no');
});

/**
 * Remove a tag from a tags field of the form, by its text.
 *
 * Example #1: When I remove "Product" from the "Tags" field
 * Example #2: When we remove "Services" from the "Tags" field
 * Example #3: And I remove "Design" from the "Tags" field
 * Example #4: When I remove "Vendor" from the "category_id" field
 * Example #5: And we remove "Information" from the "Tags" field
 *
 */
When(/^(I |we )*remove "([^"]*)" from the "([^"]*)" field$/, async function (pronounCase, tag, name) {
  const widget = await findField(this, name);
  const tags = widget.locator('.o_tag');
  const entry = tags.filter({ hasText: textPattern(tag, { exact: true }) }).first();
  if (!(await entry.isVisible().catch(() => false))) {
    throw friendly({
      message: `Expected the tag "${tag}" in the "${name}" field.`,
      cause: `the field holds ${await listTexts(tags)}`,
      hint: 'The step removes a tag of a tags field (a many2many shown as badges).',
    });
  }
  await entry.locator('.o_delete').first().click();
  await settle(this);
});

/**
 * Assert the value a field of the form shows: the text of an input, the
 * chosen entry of a selection, a radio group or a many2one, the tags of a
 * tags field separated by commas, "yes" or "no" for a checkbox. With "be"
 * the value must be exactly the text; with "show" it only has to include
 * it.
 *
 * Example #1: Then the "Customer" field should be "Azure Interior"
 * Example #2: And the "Product Type" field should be "Service"
 * Example #3: Then the "Tags" field should show "Product"
 * Example #4: And the "Customer" field should not be "Deco Addict"
 * Example #5: Then the "Email" field should not show "example.org"
 *
 */
Then(/^the "([^"]*)" field should( not)* (be|show) "([^"]*)"$/, async function (name, notCase, mode, expected) {
  await settle(this);
  const widget = await findField(this, name);
  const wanted = expected.replace(/\s+/g, ' ').trim();
  const matches = (value) => (mode === 'be' ? value === wanted : value.includes(wanted));
  const deadline = Date.now() + SHORT_TIMEOUT;
  let value = '';
  do {
    value = await readFieldValue(widget).catch(() => '');
    if (matches(value) !== Boolean(notCase)) return;
    await settle(this, 500);
  } while (Date.now() < deadline);
  throw friendly({
    message: `Expected the "${name}" field ${notCase ? 'not ' : ''}to ${mode} "${expected}".`,
    cause: `it shows "${value}"`,
    hint: 'The value is compared as text, whitespace-collapsed and case-sensitive. A number and a date are shown in the format of the user\'s language.',
  });
});

/**
 * Assert a checkbox field of the form is, or is not, checked.
 *
 * Example #1: Then the "Can be Sold" field should be checked
 * Example #2: And the "Can be Purchased" field should not be checked
 * Example #3: Then the "Is a Company" field should be checked
 * Example #4: And the "Active" field should be unchecked
 * Example #5: Then the "Can be Sold" field should be unchecked
 *
 */
Then(/^the "([^"]*)" field should( not)* be (checked|unchecked)$/, async function (name, notCase, state) {
  await settle(this);
  const widget = await findField(this, name);
  const { kind } = await describeField(widget);
  if (kind !== 'boolean') {
    throw friendly({
      message: `The "${name}" field is not a checkbox.`,
      hint: 'Use "Then the "..." field should be "..."" for the other kinds of field.',
    });
  }
  const wanted = (state === 'checked') !== Boolean(notCase);
  const checkbox = widget.locator('input[type="checkbox"]').first();
  const deadline = Date.now() + SHORT_TIMEOUT;
  let checked = await checkbox.isChecked();
  while (checked !== wanted && Date.now() < deadline) {
    await settle(this, 500);
    checked = await checkbox.isChecked();
  }
  if (checked !== wanted) {
    throw friendly({
      message: `Expected the "${name}" field to be ${wanted ? 'checked' : 'unchecked'}.`,
      cause: `it is ${checked ? 'checked' : 'unchecked'}`,
      hint: 'Another field can change a checkbox through an onchange; check the order of the steps.',
    });
  }
});

/**
 * Assert the form shows, or does not show, a field. A field can be hidden
 * for a user without the right group, or in some states of the record.
 *
 * Example #1: Then I should see the "Customer" field
 * Example #2: And I should not see the "Margin" field
 * Example #3: Then we should see the "Salesperson" field
 * Example #4: And I should see the "Expected Closing" field
 * Example #5: Then we should not see the "Cost" field
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" field$/, async function (pronounCase, notCase, name) {
  await settle(this);
  let found = true;
  let failure = null;
  try {
    await findField(this, name, { timeout: notCase ? 2000 : SHORT_TIMEOUT });
  } catch (error) {
    found = false;
    failure = error;
  }
  if (!notCase && !found) throw failure;
  if (notCase && found) {
    throw friendly({
      message: `Expected no "${name}" field in the form.`,
      hint: 'A field is hidden by its "invisible" rule or by the groups of the user; check both.',
    });
  }
});

/**
 * Assert a field of the form is, or is not, required, read-only or marked
 * as invalid, from the classes Odoo puts on the field
 * (`o_required_modifier`, `o_readonly_modifier`, `o_field_invalid`).
 *
 * Example #1: Then the "Customer" field should be required
 * Example #2: And the "Total" field should be read-only
 * Example #3: Then the "Customer" field should be invalid
 * Example #4: And the "Expiration" field should not be required
 * Example #5: Then the "Customer" field should not be read-only
 *
 */
Then(/^the "([^"]*)" field should( not)* be (required|read-only|readonly|invalid)$/, async function (name, notCase, state) {
  await settle(this);
  const widget = await findField(this, name);
  const classes = { required: 'o_required_modifier', 'read-only': 'o_readonly_modifier', readonly: 'o_readonly_modifier', invalid: 'o_field_invalid' };
  const wanted = !notCase;
  const has = () => widget.evaluate((element, className) => element.classList.contains(className), classes[state]);
  const deadline = Date.now() + SHORT_TIMEOUT;
  let actual = await has();
  while (actual !== wanted && Date.now() < deadline) {
    await settle(this, 500);
    actual = await has();
  }
  if (actual !== wanted) {
    throw friendly({
      message: `Expected the "${name}" field ${wanted ? '' : 'not '}to be ${state}.`,
      cause: `the field ${actual ? 'is' : 'is not'} ${state}`,
      hint: 'A field is marked as invalid after a save that was refused; required and read-only can depend on the state of the record.',
    });
  }
});

// ---------------------------------------------------------------------------
// Buttons, status bar and tabs of a form
// ---------------------------------------------------------------------------

/**
 * Click a button of the form by its text: an action button of the header
 * ("Confirm", "Send by Email"), a smart button ("Quotations") or a button in
 * the body of the form. The step waits for the action the button starts.
 *
 * Example #1: When I click the "Confirm" button in the form
 * Example #2: When we click the "New Quotation" button in the form
 * Example #3: And I click the "Create Invoice" button in the form
 * Example #4: When I click the "Won" button of the form
 * Example #5: And we click the "Add" button of the form
 *
 */
When(/^(I |we )*click the "([^"]*)" button (?:in|of) the form$/, async function (pronounCase, text) {
  await activeForm(this).catch(() => {});
  const { button, offered } = await findButton(this, text);
  if (!button) {
    throw friendly({
      message: `Expected a "${text}" button in the form.`,
      cause: `the form offers ${offered}`,
      hint: 'The buttons of a form depend on the state of the record and on the rights of the user. The text is matched in full, case-sensitive.',
    });
  }
  await button.click();
  await settle(this);
});

/**
 * Assert the form offers, or does not offer, a button with the given text.
 * The buttons of a form depend on the state of the record and on the groups
 * of the user.
 *
 * Example #1: Then I should see the "Confirm" button in the form
 * Example #2: And I should not see the "Create Invoice" button in the form
 * Example #3: Then we should see the "Send by Email" button in the form
 * Example #4: And I should not see the "Confirm" button of the form
 * Example #5: Then we should not see the "Cancel" button of the form
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" button (?:in|of) the form$/, async function (pronounCase, notCase, text) {
  await activeForm(this);
  await settle(this);
  const { buttons } = await scopeButtons(this);
  const button = buttons.filter({ hasText: textPattern(text, { exact: true }) }).first();
  await assertPresence(button, notCase, `the "${text}" button of the form`, {
    timeout: SHORT_TIMEOUT,
    hint: `The form offers ${await listTexts(buttons, 40)}.`,
  });
});

/**
 * Assert the status the status bar of the form highlights
 * (`.o_statusbar_status .o_arrow_button_current`): the state of a quotation
 * ("Sales Order"), the stage of an opportunity ("Qualified").
 *
 * Example #1: Then the status should be "Sales Order"
 * Example #2: And the stage should be "Qualified"
 * Example #3: Then the record status should be "Quotation"
 * Example #4: And the status should not be "Cancelled"
 * Example #5: Then the record stage should not be "Won"
 *
 */
Then(/^the (?:record )?(?:status|stage) should( not)* be "([^"]*)"$/, async function (notCase, expected) {
  const form = await activeForm(this);
  await settle(this);
  const bar = form.locator('.o_statusbar_status').first();
  await assertPresence(bar, undefined, 'the status bar of the form (".o_statusbar_status")', {
    timeout: SHORT_TIMEOUT,
    hint: 'Not every form has a status bar; read the state from its field instead ("Then the "..." field should be "..."").',
  });
  const current = bar.locator('.o_arrow_button_current, button[aria-checked="true"]');
  await assertText(current, expected, notCase, 'the current status of the status bar', {
    exact: false,
    timeout: SHORT_TIMEOUT,
    hint: `The status bar offers ${await listTexts(bar.locator('button.o_arrow_button[role="radio"], button.o_arrow_button:not([aria-label])'))}.`,
  });
});

/**
 * Change the stage of the record by clicking a stage of the status bar, the
 * way a user moves an opportunity to "Proposition". A status bar that is
 * read-only (the state of a quotation, changed by its buttons) refuses the
 * click.
 *
 * Example #1: When I set the stage to "Proposition"
 * Example #2: When we set the stage to "Qualified"
 * Example #3: And I set the status to "Won"
 * Example #4: When I set the record stage to "New"
 * Example #5: And we set the record status to "In Progress"
 *
 */
When(/^(I |we )*set the (?:record )?(?:status|stage) to "([^"]*)"$/, async function (pronounCase, name) {
  const page = this.page;
  const form = await activeForm(this);
  await settle(this);
  const bar = form.locator('.o_statusbar_status').first();
  const stages = bar.locator('button.o_arrow_button:visible');
  let stage = stages.filter({ hasText: textPattern(name, { exact: true }) }).first();
  if (!(await stage.isVisible().catch(() => false))) {
    // Stages that do not fit are folded under a "More" button.
    const more = bar.locator('button[aria-label="More..."]:visible, .o_statusbar_status > .dropdown-toggle:visible').first();
    if (await more.isVisible().catch(() => false)) {
      await more.click();
      stage = page.locator('.o-dropdown--menu:visible .dropdown-item').filter({ hasText: textPattern(name, { exact: true }) }).first();
    }
  }
  if (!(await stage.isVisible().catch(() => false))) {
    throw friendly({
      message: `Expected a "${name}" stage in the status bar.`,
      cause: `the status bar offers ${await listTexts(stages)}`,
      hint: 'The name is matched by its whole text, case-sensitive.',
    });
  }
  if (await stage.isDisabled().catch(() => false)) {
    throw friendly({
      message: `The "${name}" stage of the status bar cannot be clicked.`,
      hint: 'This status bar is read-only: the state changes through the buttons of the form ("When I click the "Confirm" button in the form").',
    });
  }
  await stage.click();
  await settle(this);
});

/**
 * Open a tab of the form's notebook by its title (`.o_notebook_headers
 * .nav-link`), to reach the fields it holds.
 *
 * Example #1: When I open the "Order Lines" tab
 * Example #2: When we open the "Other Info" tab
 * Example #3: And I open the "Sales & Purchase" tab
 * Example #4: When I open the "Internal Notes" tab
 * Example #5: And we open the "Extra Information" tab
 *
 */
When(/^(I |we )*open the "([^"]*)" tab$/, async function (pronounCase, title) {
  const form = await activeForm(this);
  const tabs = form.locator('.o_notebook_headers .nav-link:visible');
  const tab = tabs.filter({ hasText: textPattern(title, { exact: true }) }).first();
  try {
    await tab.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected a "${title}" tab in the form.`,
      cause: `the form offers the tabs ${await listTexts(tabs)}`,
      hint: 'A tab can be hidden for a user without the right group, or in some states of the record.',
    });
  }
  await tab.click();
  await settle(this);
});

/**
 * Assert the form offers, or does not offer, a tab with the given title.
 *
 * Example #1: Then I should see the "Order Lines" tab
 * Example #2: And I should not see the "Accounting" tab
 * Example #3: Then we should see the "Other Info" tab
 * Example #4: And I should see the "Internal Notes" tab
 * Example #5: Then we should not see the "Invoicing" tab
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" tab$/, async function (pronounCase, notCase, title) {
  const form = await activeForm(this);
  await settle(this);
  const tabs = form.locator('.o_notebook_headers .nav-link:visible');
  await assertPresence(tabs.filter({ hasText: textPattern(title, { exact: true }) }).first(), notCase, `the "${title}" tab of the form`, {
    timeout: SHORT_TIMEOUT,
    hint: `The form offers the tabs ${await listTexts(tabs)}.`,
  });
});

// ---------------------------------------------------------------------------
// Lines of a one2many list (order lines, invoice lines)
// ---------------------------------------------------------------------------

/**
 * Add a line to the list of the open tab (order lines, invoice lines) and
 * fill its cells from a table: the first column names the column of the
 * list, the second gives the value. The "Add a line" link of the list is
 * named by its text, for example "Add a product".
 *
 * Example #1: When I add a line with "Add a product":
 * Example #2: When we add a line with "Add a line":
 * Example #3: And I add an line with "Add a product":
 * Example #4: When I add a line with "Add a section":
 * Example #5: And we add an line with "Add a line":
 *
 */
When(/^(I |we )*add an? line with "([^"]*)":$/, async function (pronounCase, linkText, dataTable) {
  const page = this.page;
  const form = await activeForm(this);
  await settle(this);
  const links = form.locator('.o_field_x2many_list_row_add a:visible');
  const link = links.filter({ hasText: textPattern(linkText, { exact: true }) }).first();
  try {
    await link.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected an "${linkText}" link under a list of the form.`,
      cause: `the form offers ${await listTexts(links)}`,
      hint: 'Open the tab that holds the list first ("When I open the "Order Lines" tab"); a read-only record has no such link.',
    });
  }
  await settle(this);
  const list = form.locator('.o_field_x2many .o_list_renderer').filter({ has: page.locator('tr.o_selected_row') }).first();
  const row = list.locator('tr.o_selected_row').first();
  try {
    await row.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected a new line in edition after clicking the link.',
      cause: error,
      hint: 'A list that opens a dialog for a new line is filled with the field steps instead ("When I set the "..." field to "...").',
    });
  }
  for (const [column, value] of dataTable.raw()) {
    const headers = list.locator('thead th[data-name]');
    const header = headers.filter({ hasText: textPattern(column, { exact: true }) }).first();
    const technicalName = (await header.count()) ? await header.getAttribute('data-name') : (/^[a-z][a-z0-9_]*$/.test(column) ? column : null);
    if (!technicalName) {
      throw friendly({
        message: `Expected a "${column}" column in the list.`,
        cause: `the list shows the columns ${await listTexts(headers)}`,
        hint: 'Name the column by its header, or by the technical name of its field.',
      });
    }
    const cell = list.locator(`tr.o_selected_row td[name="${technicalName}"]`).first();
    await cell.click();
    const widget = cell.locator('.o_field_widget').first();
    await setFieldValue(this, widget, column, value);
  }
  await settle(this);
});

/**
 * Assert a list of the form shows, or does not show, a line with the given
 * text (the product of an order line, the label of an invoice line).
 *
 * Example #1: Then I should see the line "Office Chair"
 * Example #2: And I should see the line "Large Cabinet"
 * Example #3: Then we should see the line "Virtual Interior Design"
 * Example #4: And I should not see the line "Office Lamp"
 * Example #5: Then we should not see the line "Desk Combination"
 *
 */
Then(/^(I |we )*should( not)* see the line "([^"]*)"$/, async function (pronounCase, notCase, text) {
  const form = await activeForm(this);
  await settle(this);
  const rows = form.locator('.o_field_x2many .o_list_renderer tr.o_data_row');
  await assertPresence(rows.filter({ hasText: textPattern(text) }).first(), notCase, `a line showing "${text}" in a list of the form`, {
    timeout: SHORT_TIMEOUT,
    hint: 'Open the tab that holds the list first ("When I open the "Order Lines" tab").',
  });
});

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

/**
 * Assert a dialog is, or is not, open, optionally with a title
 * (`.modal[role="dialog"] .modal-title`): a confirmation, a wizard, an
 * error.
 *
 * Example #1: Then I should see a dialog
 * Example #2: And I should see the "Confirmation" dialog
 * Example #3: Then we should see the "Cancel Sales Order" dialog
 * Example #4: And I should not see a dialog
 * Example #5: Then we should not see the "Access Error" dialog
 *
 */
Then(/^(I |we )*should( not)* see (?:an? dialog|the "([^"]*)" dialog)$/, async function (pronounCase, notCase, title) {
  const page = this.page;
  await settle(this);
  const dialogs = page.locator('.modal[role="dialog"]:visible, .modal.show:visible');
  if (!supplied(title)) {
    await assertPresence(dialogs.last(), notCase, 'a dialog (".modal")', {
      timeout: SHORT_TIMEOUT,
      hint: notCase ? `A dialog titled "${((await dialogs.last().locator('.modal-title').first().textContent().catch(() => '')) || '').trim()}" is open.` : 'A dialog opens for a confirmation, a wizard or an error.',
    });
    return;
  }
  const titled = dialogs.filter({ has: page.locator('.modal-title', { hasText: textPattern(title, { exact: true }) }) }).last();
  await assertPresence(titled, notCase, `the "${title}" dialog`, {
    timeout: SHORT_TIMEOUT,
    hint: `The open dialogs are titled ${await listTexts(dialogs.locator('.modal-title'))}.`,
  });
});

/**
 * Assert the dialog on top shows, or does not show, a text in its body.
 *
 * Example #1: Then I should see "Are you sure" in the dialog
 * Example #2: And I should see "You are not allowed" in the dialog
 * Example #3: Then we should see "cancel" in the dialog
 * Example #4: And I should not see "error" in the dialog
 * Example #5: Then we should not see "Traceback" in the dialog
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the dialog$/, async function (pronounCase, notCase, text) {
  const page = this.page;
  await settle(this);
  const dialog = topDialog(page);
  await assertPresence(dialog, undefined, 'a dialog (".modal")', {
    timeout: SHORT_TIMEOUT,
    hint: 'A dialog opens for a confirmation, a wizard or an error.',
  });
  await assertText(dialog.locator('.modal-content'), text, notCase, 'the dialog', { timeout: SHORT_TIMEOUT });
});

/**
 * Click a button of the dialog on top by its text ("Ok", "Discard", "Save &
 * Close", the action of a wizard) and wait for what it starts.
 *
 * Example #1: When I click the "Ok" button in the dialog
 * Example #2: When we click the "Discard" button in the dialog
 * Example #3: And I click the "Save & Close" button in the dialog
 * Example #4: When I click the "Cancel" button of the dialog
 * Example #5: And we click the "Create Draft Invoice" button of the dialog
 *
 */
When(/^(I |we )*click the "([^"]*)" button (?:in|of) the dialog$/, async function (pronounCase, text) {
  const page = this.page;
  await settle(this);
  if (!(await dialogIsOpen(page))) {
    throw friendly({
      message: 'Expected a dialog on screen.',
      hint: 'A dialog opens for a confirmation, a wizard or an error; check the step before this one.',
    });
  }
  const { button, offered } = await findButton(this, text);
  if (!button) {
    throw friendly({
      message: `Expected a "${text}" button in the dialog.`,
      cause: `the dialog offers ${offered}`,
      hint: 'The text is matched in full, case-sensitive.',
    });
  }
  await button.click();
  await settle(this);
});

/**
 * Confirm the dialog on top with its main button (the primary button of the
 * footer: "Ok", "Delete", "Confirm"), or close it without confirming (its
 * secondary button or its close button).
 *
 * Example #1: When I confirm the dialog
 * Example #2: When we confirm the dialog
 * Example #3: And I close the dialog
 * Example #4: When I dismiss the dialog
 * Example #5: And we close the dialog
 *
 */
When(/^(I |we )*(confirm|close|dismiss) the dialog$/, async function (pronounCase, action) {
  const page = this.page;
  await settle(this);
  const dialog = topDialog(page);
  try {
    await dialog.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected a dialog on screen.',
      cause: error,
      hint: 'A dialog opens for a confirmation, a wizard or an error; check the step before this one.',
    });
  }
  const before = await page.locator('.modal[role="dialog"]:visible, .modal.show:visible').count();
  const button = action === 'confirm'
    ? dialog.locator('.modal-footer button.btn-primary:visible').first()
    : dialog.locator('.modal-footer button.btn-secondary:visible, .modal-header button[aria-label="Close"]:visible, .modal-header .btn-close:visible, .modal-footer button:visible').first();
  try {
    await button.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: `${action} the dialog`,
      target: action === 'confirm' ? '.modal-footer .btn-primary' : '.modal-footer .btn-secondary',
      cause: error,
      hint: `The dialog offers ${await listTexts(dialog.locator('.modal-footer button'))}; click one by its text ("When I click the "..." button in the dialog").`,
    });
  }
  await settle(this);
  await page.waitForFunction((count) => document.querySelectorAll('.modal[role="dialog"], .modal.show').length < count, before, { timeout: SHORT_TIMEOUT }).catch(() => {});
  await settle(this);
});

/**
 * Assert Odoo shows, or does not show, an access error: the "Access Error"
 * dialog (`.o_error_dialog`) the web client opens when the server refuses an
 * operation for the current user. An optional text is looked for in the
 * message.
 *
 * Example #1: Then I should see an access error
 * Example #2: And I should not see an access error
 * Example #3: Then we should see an access error
 * Example #4: And I should see an access error "You are not allowed to access"
 * Example #5: Then we should see an access error "Sales Order"
 *
 */
Then(/^(I |we )*should( not)* see an access error(?: "([^"]*)")?$/, async function (pronounCase, notCase, text) {
  const page = this.page;
  await settle(this);
  const dialog = page.locator('.modal[role="dialog"]:visible').filter({ has: page.locator('.o_error_dialog') }).filter({ has: page.locator('.modal-title', { hasText: /Access (Error|Denied)/ }) }).last();
  await assertPresence(dialog, notCase, 'the "Access Error" dialog (".o_error_dialog")', {
    timeout: SHORT_TIMEOUT,
    hint: notCase
      ? `The dialog reads "${((await dialog.locator('.modal-body').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 200)}".`
      : 'The server refuses an operation when the user lacks the access right or a record rule excludes the record; a user with the rights sees no such dialog.',
  });
  if (!notCase && supplied(text)) {
    await assertText(dialog.locator('.modal-body'), text, undefined, 'the access error', { timeout: SHORT_TIMEOUT });
  }
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * Assert Odoo shows, or does not show, a notification with the given text:
 * the message that appears at the top right of the web client
 * (`.o_notification`). An optional kind checks its colour: success, warning,
 * danger or info.
 *
 * Example #1: Then I should see the notification "Invalid fields"
 * Example #2: And I should see the success notification "saved"
 * Example #3: Then we should see the danger notification "Invalid fields"
 * Example #4: And I should not see the notification "Invalid fields"
 * Example #5: Then we should see the warning notification "Warning"
 *
 */
Then(/^(I |we )*should( not)* see the (?:(success|warning|danger|info) )?notification "([^"]*)"$/, async function (pronounCase, notCase, kind, text) {
  const page = this.page;
  const notifications = page.locator('.o_notification_manager .o_notification');
  const matching = notifications.filter({ hasText: textPattern(text) });
  const wanted = kind
    ? matching.filter({ has: page.locator(`xpath=self::*[contains(@class, "border-${kind}") or contains(@class, "bg-${kind}")] | .//*[contains(@class, "bg-${kind}") or contains(@class, "border-${kind}")]`) })
    : matching;
  await assertPresence(wanted.first(), notCase, `a ${kind ? `${kind} ` : ''}notification containing "${text}"`, {
    timeout: SHORT_TIMEOUT,
    hint: `The notifications on screen read ${await listTexts(notifications)}. A notification closes on its own after a few seconds unless it is sticky.`,
  });
});

/**
 * Close the notifications on screen with their close button, so that they do
 * not cover a button a later step needs.
 *
 * Example #1: When I close the notifications
 * Example #2: When we close the notifications
 * Example #3: And I close the notification
 * Example #4: When close the notifications
 * Example #5: And we close the notification
 *
 */
When(/^(I |we )*close the notifications?$/, async function (pronounCase) {
  const page = this.page;
  const closers = page.locator('.o_notification_manager .o_notification .o_notification_close');
  let guard = 10;
  while ((await closers.count()) > 0 && guard > 0) {
    guard -= 1;
    await closers.first().click().catch(() => {});
    await settle(this, 1000);
  }
});

// ---------------------------------------------------------------------------
// Chatter
// ---------------------------------------------------------------------------

/**
 * The chatter of the form on screen (`.o-mail-Chatter`), required.
 *
 * @param {object} world
 * @returns {Promise<import('playwright').Locator>}
 */
async function requireChatter(world) {
  const page = world.page;
  const chatter = page.locator('.o-mail-Chatter:visible').first();
  try {
    await chatter.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: 'Expected the chatter of the record on screen.',
      cause: `the page is ${page.url()}`,
      hint: 'The chatter is part of the form view of a model that keeps messages (an opportunity, a quotation, a contact); a new record shows it once it is saved.',
    });
  }
  return chatter;
}

/**
 * Write in the chatter with one of its two buttons and send.
 *
 * @param {object} world
 * @param {'note'|'message'} kind
 * @param {string} text
 * @returns {Promise<void>}
 */
async function writeInChatter(world, kind, text) {
  const chatter = await requireChatter(world);
  await settle(world);
  const opener = kind === 'note' ? chatter.locator('.o-mail-Chatter-logNote').first() : chatter.locator('.o-mail-Chatter-sendMessage').first();
  try {
    await opener.click({ timeout: SHORT_TIMEOUT });
  } catch (error) {
    throw friendly({
      action: kind === 'note' ? 'click "Log note" in the chatter' : 'click "Send message" in the chatter',
      target: kind === 'note' ? '.o-mail-Chatter-logNote' : '.o-mail-Chatter-sendMessage',
      cause: error,
      hint: 'The buttons are missing for a user who may not write on the record.',
    });
  }
  const input = chatter.locator('.o-mail-Composer-input').first();
  await input.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
  await input.fill(text);
  const send = chatter.locator('.o-mail-Composer-send:visible').first();
  await send.click();
  const posted = chatter.locator('.o-mail-Message').filter({ hasText: textPattern(text) }).first();
  try {
    await posted.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT });
  } catch (error) {
    throw friendly({
      message: `Expected the ${kind} "${text}" in the chatter after sending it.`,
      cause: error,
      hint: 'An error dialog on screen names what the server refused.',
    });
  }
  await settle(world);
}

/**
 * Assert the form shows, or does not show, the chatter: the thread of
 * messages, notes and activities of the record (`.o-mail-Chatter`).
 *
 * Example #1: Then I should see the chatter
 * Example #2: And I should not see the chatter
 * Example #3: Then we should see the chatter
 * Example #4: And I should see the chatter of the record
 * Example #5: Then we should not see the chatter of the record
 *
 */
Then(/^(I |we )*should( not)* see the chatter(?: of the record)?$/, async function (pronounCase, notCase) {
  await settle(this);
  await assertPresence(this.page.locator('.o-mail-Chatter:visible').first(), notCase, 'the chatter (".o-mail-Chatter")', {
    timeout: SHORT_TIMEOUT,
    hint: 'The chatter is part of the form view of a model that keeps messages.',
  });
});

/**
 * Log an internal note on the record with the "Log note" button of the
 * chatter, and wait for the note to appear in the thread. A note stays
 * internal: followers who are not internal users do not receive it.
 *
 * Example #1: When I log the note "Called the customer, waiting for the order"
 * Example #2: When we log the note "Checked by the review"
 * Example #3: And I log the note "Price confirmed"
 * Example #4: When I log the internal note "Reminder sent"
 * Example #5: And we log the internal note "Left a voice mail"
 *
 */
When(/^(I |we )*log the (?:internal )?note "([^"]*)"$/, async function (pronounCase, text) {
  await writeInChatter(this, 'note', text);
});

/**
 * Send a message on the record with the "Send message" button of the
 * chatter, and wait for the message to appear in the thread. A message is
 * sent to the followers of the record: on a test site, make sure outgoing
 * mail is not delivered to real addresses.
 *
 * Example #1: When I send the message "Your order is confirmed"
 * Example #2: When we send the message "Thank you for your request"
 * Example #3: And I send the message "The quotation is attached"
 * Example #4: When I send the chatter message "We will call you back"
 * Example #5: And we send the chatter message "Delivery is planned"
 *
 */
When(/^(I |we )*send the (?:chatter )?message "([^"]*)"$/, async function (pronounCase, text) {
  await writeInChatter(this, 'message', text);
});

/**
 * Assert the chatter shows, or does not show, a text in one of its messages
 * (`.o-mail-Message`): a note, a message, or the line Odoo logs when a
 * tracked field changes.
 *
 * Example #1: Then I should see "Called the customer" in the chatter
 * Example #2: And I should see "Quotation confirmed" in the chatter
 * Example #3: Then we should see "Stage" in the chatter
 * Example #4: And I should not see "Internal remark" in the chatter
 * Example #5: Then we should not see "Lost" in the chatter
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the chatter$/, async function (pronounCase, notCase, text) {
  const chatter = await requireChatter(this);
  await settle(this);
  await assertText(chatter.locator('.o-mail-Message'), text, notCase, 'the messages of the chatter (".o-mail-Message")', {
    timeout: SHORT_TIMEOUT,
    hint: 'The chatter loads its messages by pages ("Load More"); the newest are on top.',
  });
});

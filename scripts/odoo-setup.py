# Runs inside `odoo shell` (the shell provides `env` and `odoo`).
#
# Prepares the site for the suite, in two parts.
#
# 1. The site stays local. The "partner_autocomplete" module, which Odoo
#    installs on its own, sends what a user types in a company name to an
#    outside service and mixes the answers into the proposals of the field.
#    A test site must not depend on, or send data to, an outside service, so
#    the module is uninstalled.
#
# 2. The accounts the users registry in cucumber.js names. Accounts are
# configuration: they are created once here, when the site is built, and never
# by a feature. The script can run again safely: it updates the password and
# the groups of an account that exists and leaves its name alone.
#
# handle       login        groups
# salesperson  salesperson  Sales / User: Own Documents Only
# accountant   accountant   Invoicing / Billing
# employee     employee     Internal User, no app-specific group
# portal       portal       Portal (the demo data already has this account)
#
# The administrator ("admin", password "admin") is created by Odoo itself.

from odoo import SUPERUSER_ID, api

autocomplete = env['ir.module.module'].search([('name', '=', 'partner_autocomplete'), ('state', '=', 'installed')])
if autocomplete:
    autocomplete.button_immediate_uninstall()
    print('module partner_autocomplete: uninstalled')
    # The uninstall reloads the registry: take a fresh environment.
    env = api.Environment(odoo.registry(env.cr.dbname).cursor(), SUPERUSER_ID, {})

ACCOUNTS = [
    ('salesperson', 'Sam Salesperson', ['base.group_user', 'sales_team.group_sale_salesman']),
    ('accountant', 'Alex Accountant', ['base.group_user', 'account.group_account_invoice']),
    ('employee', 'Emma Employee', ['base.group_user']),
    ('portal', 'Pat Portal', ['base.group_portal']),
]

Users = env['res.users'].with_context(no_reset_password=True)
for login, name, group_xmlids in ACCOUNTS:
    groups = [env.ref(xmlid).id for xmlid in group_xmlids]
    user = Users.search([('login', '=', login)], limit=1)
    if user:
        user.write({'password': login, 'groups_id': [(6, 0, groups)]})
    else:
        user = Users.create({
            'name': name,
            'login': login,
            'email': '%s@example.com' % login,
            'password': login,
            'groups_id': [(6, 0, groups)],
        })
    print('account %s: id %s, groups %s' % (login, user.id, ', '.join(group_xmlids)))

env.cr.commit()
env.cr.close()

# Step definitions

| File | Steps for |
| --- | --- |
| `odoo-session.steps.js` | The login screen, the users registry, logging out, the user menu, the web client and the portal |
| `odoo-webclient.steps.js` | Apps, menus, actions, the breadcrumb, the view switcher, the search view, the list view and the kanban view |
| `odoo-record.steps.js` | The form view and its fields, saving, buttons, the status bar, tabs, lines, dialogs, notifications, the chatter and the access error |
| `odoo.steps.js` | The website: layout, blog, shop, events, jobs, the contact form, the website editor and the 404 page |
| `odoo-helpers.js` | What the step files share; it defines no step |

Each step definition has a comment that says what the step does, names the markup it relies on and gives five `Example #n:` lines. `npm run test:examples` checks the examples against the definitions.

#!/usr/bin/env bash
#
# Build the Odoo site this suite runs against, in the DDEV project of the
# current directory: a database with Odoo's demo data, the apps the features
# use, and the accounts the users registry in cucumber.js names.
#
# Usage:  ddev start && bash scripts/build-odoo.sh
#
# The script can run again: Odoo updates the apps that are already installed
# and the accounts script updates the accounts it finds.

set -euo pipefail

cd "$(dirname "$0")/.."

DATABASE="${ODOO_DATABASE:-odoo}"
# Contacts, CRM, Sales, Invoicing and Website with its blog, shop, events and
# jobs.
APPS="${ODOO_APPS:-contacts,crm,sale_management,account,website,website_blog,website_sale,website_event,website_hr_recruitment}"
CONNECTION=(--db_host=postgres --db_user=odoo --db_password=odoo)

echo "Installing the apps in the \"${DATABASE}\" database (with demo data): ${APPS}"
ddev exec -s odoo -- odoo -d "${DATABASE}" "${CONNECTION[@]}" --no-http --log-level=warn --stop-after-init -i "${APPS}"

echo "Keeping the site local and creating the accounts of the users registry"
ddev exec -s odoo -- odoo shell -d "${DATABASE}" "${CONNECTION[@]}" --no-http --log-level=warn < scripts/odoo-setup.py

# The running server loaded its code before the apps were installed and one
# module was removed, so it starts again on the finished database.
echo "Restarting Odoo"
SITE="$(ddev exec -s odoo printenv DDEV_SITENAME | tr -d '\r\n')"
URL="https://$(ddev exec -s odoo printenv VIRTUAL_HOST | tr -d '\r\n')"
docker restart "ddev-${SITE}-odoo" > /dev/null

echo "Waiting for ${URL}/web/login"
for attempt in $(seq 1 90); do
  code="$(curl -ks -o /dev/null -w '%{http_code}' "${URL}/web/login" || true)"
  if [ "${code}" = "200" ]; then
    echo "Odoo is ready at ${URL}"
    exit 0
  fi
  sleep 2
done
echo "Odoo did not answer at ${URL}/web/login in time." >&2
ddev logs -s odoo | tail -50 >&2 || true
exit 1

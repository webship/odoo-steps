#!/usr/bin/env node
'use strict';

// Writes STEPS.md, the reference of every step of this pack, from the step
// definitions themselves: the pattern, the first sentence of the comment and
// the first example. Run it after adding or changing a step.
//
// Usage: node tests/list-steps.js   (npm run docs:steps)
//        node tests/list-steps.js --check   fails when STEPS.md is out of date

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACK_DIR = path.join(ROOT, 'tests', 'step-definitions');
const TARGET = path.join(ROOT, 'STEPS.md');

const TITLES = {
  'odoo-session.steps.js': 'Sessions',
  'odoo-webclient.steps.js': 'Web client: apps, menus, search, list and kanban views',
  'odoo-record.steps.js': 'Records: form view, dialogs, notifications and chatter',
  'odoo.steps.js': 'Website',
};

function stepsOf(file) {
  const source = fs.readFileSync(path.join(PACK_DIR, file), 'utf8');
  const steps = [];
  const re = /\/\*\*\n((?: \*.*\n)+?) \*\/\n(Given|When|Then)\(/g;
  let match;
  while ((match = re.exec(source))) {
    const lines = match[1].split('\n').map((line) => line.replace(/^ \* ?/, ''));
    const examples = lines.filter((line) => /^Example #\d+:/.test(line)).map((line) => line.replace(/^Example #\d+:\s*/, ''));
    const text = lines.filter((line) => !/^Example #\d+:/.test(line) && !/^@/.test(line)).join(' ').replace(/\s+/g, ' ').trim();
    const sentence = (text.match(/^.*?[.:](?=\s|$)/) || [text])[0].replace(/:$/, '.');
    steps.push({ keyword: match[2], sentence, examples });
  }
  return steps;
}

const out = [
  '# Steps',
  '',
  'Every step of `@webship-js/odoo-steps`, written from the step definitions by `npm run docs:steps`. Each step is shown by its first example; the comment above its definition gives four more and names the markup the step relies on. Every assertion takes `not`.',
  '',
];
let total = 0;
for (const file of Object.keys(TITLES)) {
  const steps = stepsOf(file);
  total += steps.length;
  out.push(`## ${TITLES[file]}`, '', `\`tests/step-definitions/${file}\`, ${steps.length} steps.`, '', '| Step | What it does |', '| --- | --- |');
  for (const step of steps) {
    out.push(`| \`${(step.examples[0] || '').replace(/\|/g, '\\|')}\` | ${step.sentence.replace(/\|/g, '\\|')} |`);
  }
  out.push('');
}
out.push(`${total} steps.`, '');
const content = out.join('\n');

if (process.argv.includes('--check')) {
  const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, 'utf8') : '';
  if (current !== content) {
    console.error('STEPS.md is out of date: run "npm run docs:steps" and commit the result.');
    process.exit(1);
  }
  console.log(`STEPS.md is up to date (${total} steps).`);
} else {
  fs.writeFileSync(TARGET, content);
  console.log(`STEPS.md written (${total} steps).`);
}

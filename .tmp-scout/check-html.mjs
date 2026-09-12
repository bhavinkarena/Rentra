import { readFileSync } from 'node:fs';

const html = readFileSync('docs/rentra-customer-plan.html', 'utf8');
const body = html.slice(html.indexOf('<body>'));
const VOID = new Set(['meta', 'link', 'br', 'hr', 'img', 'input', 'source', 'col', 'area', 'base', 'embed', 'track', 'wbr', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'stop', 'use']);

const stack = [];
const problems = [];
const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
let match;
let line = 1;
let last = 0;
while ((match = tag.exec(body))) {
  line += body.slice(last, match.index).split('\n').length - 1;
  last = match.index;
  const [, closing, name, attrs, selfClose] = match;
  const lower = name.toLowerCase();
  if (VOID.has(lower) || selfClose) continue;
  if (!closing) { stack.push({ name: lower, line }); continue; }
  const top = stack.pop();
  if (!top) problems.push(`line ${line}: </${lower}> with nothing open`);
  else if (top.name !== lower) problems.push(`line ${line}: </${lower}> closes <${top.name}> opened at line ${top.line}`);
}
stack.forEach((item) => problems.push(`unclosed <${item.name}> opened at line ${item.line}`));

// Entities must be well formed; a stray bare & would break a strict parser.
for (const bad of body.matchAll(/&(?!#?[a-zA-Z0-9]+;)/g)) {
  problems.push(`bare ampersand at offset ${bad.index}: ${JSON.stringify(body.slice(bad.index, bad.index + 24))}`);
}

// Every in-page anchor must resolve to a real id.
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const link of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(link[1])) problems.push(`dangling anchor #${link[1]}`);
}

// The checklist JS depends on every data-task being unique.
const tasks = [...html.matchAll(/data-task="([^"]+)"/g)].map((m) => m[1]);
if (new Set(tasks).size !== tasks.length) problems.push('duplicate data-task values');

console.log(`tags balanced over ${stack.length === 0 ? 'whole body' : 'partial body'} · ${tasks.length} checklist tasks · ${ids.size} ids`);
if (problems.length) { console.error(`FAIL ${problems.length} problem(s):\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('PASS structure, entities, anchors and task ids');

/* ============================================================
   WHAT'S NEW STAMPER
   Runs in GitHub Actions (see .github/workflows/whats-new.yml). No installs needed.

   It keeps assets/whats-new.json up to date. For every event in the Google Sheet and every
   page folder of the site it remembers a "fingerprint" of the content. When a fingerprint
   changes, or a new event or page appears, it stamps today's date. The site (classera-new-v1.js)
   shows a NEW label on anything stamped within the last 14 days.

   First run: everything is recorded as the starting point and nothing is labeled.
   You never edit this file.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = join(ROOT, 'assets', 'whats-new.json');
const SHEET_ID = '1bFWi7YwE08F9AQbx1WfcEztUSB-UMi8YQx87ahRCMPY';   // keep in step with assets/classera-source-v1.js
const EVENTS_GID = '1171779694';
const NOW = process.env.WN_NOW || new Date().toISOString();
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const sha = s => createHash('sha1').update(s).digest('hex').slice(0, 12);

/* columns whose change should light up the NEW label (Event Status is tracked but does not count as a change) */
const WATCH = ['eventtitleen', 'eventtitlear', 'partnerhost', 'startdate', 'enddate', 'datestatus', 'timeksa',
  'audience', 'language', 'countrylocation', 'pricing', 'registrationlink'];

/* ---------- CSV ---------- */
function csvRows(t) {
  const rows = []; let row = [], cell = '', q = false;
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function isoDate(s) {
  s = clean(s); let m;
  const p = n => String(n).padStart(2, '0');
  if ((m = s.match(/^(\d{1,2})[ \-]([A-Za-z]{3})[a-z]*[ \-,]+(\d{4})$/)) && MON[m[2].toLowerCase()]) return m[3] + '-' + p(MON[m[2].toLowerCase()]) + '-' + p(m[1]);
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[0];
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return m[3] + '-' + p(m[2]) + '-' + p(m[1]);
  return null;
}

async function readEvents() {
  let text;
  if (process.env.WN_EVENTS_CSV) text = readFileSync(process.env.WN_EVENTS_CSV, 'utf8');
  else {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&gid=${EVENTS_GID}&_=${Date.now()}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Google HTTP ' + r.status);
    text = await r.text();
    if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('Google sheet is not shared (got a sign-in page)');
  }
  const rows = csvRows(text);
  const hi = rows.findIndex(r => r.some(c => norm(c) === 'eventid'));
  if (hi < 0) throw new Error('No Event ID header');
  const head = rows[hi].map(norm), col = n => head.indexOf(n);
  if (col('program') < 0 || col('startdate') < 0) throw new Error('Missing columns');
  const out = {};
  rows.slice(hi + 1).forEach(r => {
    const id = clean(r[col('eventid')]); if (!id) return;
    const key = (clean(r[col('sitekey')]) || id).toLowerCase();
    const start = isoDate(r[col('startdate')]), end = isoDate(r[col('enddate')]) || start;
    out[key] = {
      p: clean(r[col('program')]), s: clean(r[col('eventstatus')]), b: start, e: end,
      h: sha(WATCH.map(n => col(n) < 0 ? '' : clean(r[col(n)])).join('|'))
    };
  });
  if (Object.keys(out).length < 5) throw new Error('Too few events returned');
  return out;
}

/* ---------- page folders ---------- */
function walk(dir, base = '') {
  return readdirSync(dir).sort().flatMap(n => {
    const p = join(dir, n), rel = base ? base + '/' + n : n;
    return statSync(p).isDirectory() ? walk(p, rel) : [rel];
  });
}
function readPages() {
  const out = {};
  readdirSync(ROOT).filter(d => !d.startsWith('.') && d !== 'assets' && d !== 'scripts' && d !== 'node_modules'
    && statSync(join(ROOT, d)).isDirectory() && existsSync(join(ROOT, d, 'index.html'))).sort().forEach(d => {
    const h = createHash('sha1');
    walk(join(ROOT, d)).filter(f => !/\.md$/i.test(f)).forEach(f => { h.update(f + '\0'); h.update(readFileSync(join(ROOT, d, f))); });
    out[d] = { h: h.digest('hex').slice(0, 12) };
  });
  return out;
}

/* ---------- compare with the saved registry ---------- */
function stamp(prev, now, extra) {
  /* prev: saved section or undefined (first run => baseline, nothing labeled) */
  const out = {};
  Object.keys(now).forEach(k => {
    const n = now[k], o = prev && prev[k];
    if (!prev) out[k] = { ...n, a: null, c: null };
    else if (!o) out[k] = { ...n, a: NOW, c: NOW };
    else if (o.h !== n.h) out[k] = { ...n, a: o.a || null, c: NOW };
    else out[k] = { ...n, a: o.a || null, c: o.c || null };
  });
  return out;
}

const reg = existsSync(REG) ? JSON.parse(readFileSync(REG, 'utf8')) : { version: 1, windowDays: 14 };
const before = JSON.stringify(reg);
let events = null;
try { events = await readEvents(); } catch (e) { console.warn('Events skipped, keeping the saved ones:', e.message); }
if (events) reg.events = stamp(reg.events, events);
reg.pages = stamp(reg.pages, readPages());
/* only touch the timestamp when something really changed, so quiet runs make no commit */
const after = JSON.stringify({ ...reg, updated: undefined });
if (after !== JSON.stringify({ ...JSON.parse(before), updated: undefined })) reg.updated = NOW;
writeFileSync(REG, JSON.stringify(reg, null, 1) + '\n');
const n = o => Object.keys(o || {}).length;
console.log(`events: ${n(reg.events)}, pages: ${n(reg.pages)}, updated: ${reg.updated || 'unchanged'}`);

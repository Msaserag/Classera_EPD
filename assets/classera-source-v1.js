/* ============================================================
   CLASSERA TRACKER SOURCE v1
   Gives every page the tracker workbook as one in-memory .xlsx buffer.
   Order of preference:
     1. The published Google Sheet (CSV) for the Events sheet, so edits in
        Google Sheets show up on the site without any upload.
     2. events-tracker.xlsx in the site root, if Google cannot be reached
        or the sheet looks wrong (also supplies the Off-Periods sheet).
   To switch back to the file only, set GSHEET_CSV to ''.
   You never edit anything else in this file.
   ============================================================ */
(function () {
  'use strict';
  var GSHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQbDZqxrYiB8lgxwlJE6pkOCY71IiWIqhrJZXR3sz8r4rEj4CtFaNP2Iy04blZx7G55OaYn5pqnB5GT/pub?output=csv';
  var MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  var DATE_COLS = { startdate: 1, enddate: 1, duedate: 1 };
  var norm = function (s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); };

  window.CLASSERA_SOURCE = 'file';

  /* RFC 4180 CSV reader: quotes, doubled quotes, commas and line breaks inside cells */
  function csvRows(t) {
    var rows = [], row = [], cell = '', q = false, i = 0, c;
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    for (; i < t.length; i++) {
      c = t[i];
      if (q) {
        if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  /* Excel day serial for "28 Sep 2026", "2026-09-28" or "28/09/2026" */
  function dateSerial(s) {
    var m = s.match(/^(\d{1,2})[ \-]([A-Za-z]{3})[a-z]*[ \-,]+(\d{4})$/), y, mo, d;
    if (m) { mo = MON[m[2].toLowerCase()]; if (mo == null) return null; y = +m[3]; d = +m[1]; }
    else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) { y = +m[1]; mo = m[2] - 1; d = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { y = +m[3]; mo = m[2] - 1; d = +m[1]; }
    else return null;
    return Math.round((Date.UTC(y, mo, d) - Date.UTC(1899, 11, 30)) / 864e5);
  }

  /* Google exports what the cell shows, so numbers and percentages come back as text; restore their types */
  function typed(head, s) {
    var v = String(s).trim(), n;
    if (v === '') return null;
    if (DATE_COLS[head]) { n = dateSerial(v); return n == null ? v : n; }
    if (/^-?(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/.test(v) && v.length < 14) return +v.replace(/,/g, '');
    if (/^-?\d+(\.\d+)?%$/.test(v)) return parseFloat(v) / 100;
    return v;
  }

  function fromGoogle(X, text, base) {
    var rows = csvRows(text), hi = -1, i;
    for (i = 0; i < rows.length; i++) { if (rows[i].some(function (c) { return norm(c) === 'eventid'; })) { hi = i; break; } }
    if (hi < 0) throw new Error('Google sheet has no Event ID header');
    var head = rows[hi].map(norm);
    if (head.indexOf('program') < 0 || head.indexOf('startdate') < 0) throw new Error('Google sheet is missing columns');
    var idCol = head.indexOf('eventid'), aoa = [rows[hi].map(function (h) { return h.trim(); })], n = 0;
    rows.slice(hi + 1).forEach(function (r) {
      if (!r[idCol] || !String(r[idCol]).trim()) return;
      aoa.push(r.map(function (c, j) { return typed(head[j], c); })); n++;
    });
    if (n < 5) throw new Error('Google sheet returned too few events');
    var ws = X.utils.aoa_to_sheet(aoa);
    var wb = base || X.utils.book_new();
    if (wb.SheetNames.indexOf('Events') < 0) wb.SheetNames.unshift('Events');
    wb.Sheets.Events = ws;
    return wb;
  }

  /* xlsxUrl: the repo copy. X: the SheetJS library. Resolves to an ArrayBuffer-like xlsx. */
  window.CLASSERA_TRACKER_BUFFER = function (xlsxUrl, X) {
    var repo = fetch(xlsxUrl + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
    if (!GSHEET_CSV) return repo;
    var google = fetch(GSHEET_CSV + '&_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('Google HTTP ' + r.status); return r.text(); });
    return Promise.all([google, repo.catch(function () { return null; })]).then(function (a) {
      var base = a[1] ? X.read(new Uint8Array(a[1]), { type: 'array' }) : null;
      var wb = fromGoogle(X, a[0], base);
      window.CLASSERA_SOURCE = 'google';
      return X.write(wb, { type: 'array', bookType: 'xlsx' });
    }).catch(function (e) {
      if (window.console) console.warn('[tracker] Google sheet not used, reading events-tracker.xlsx instead:', e && e.message);
      window.CLASSERA_SOURCE = 'file';
      return repo;
    });
  };
})();

# AY26-27 Classera Programs & Events: how to update the site

**You edit one file: `events-tracker.xlsx`.** Everything about the events on every page comes from it.
The page text and design stay in the HTML and never need touching.

---

## Update the site in four steps

1. Edit your tracker in Excel (keep your own versions in OneDrive: v2, v3...).
2. On GitHub, open the repository root and click **Add file > Upload files**.
3. Drop in the latest tracker **renamed to `events-tracker.xlsx`**. It replaces the old one.
4. Click **Commit changes**. The site refreshes within about a minute.

---

## What the Excel file controls

| Column in the Events sheet | What changes on the site |
| --- | --- |
| Event Title (EN) / (AR) | Card titles on every page and in the Full Calendar |
| Start Date / End Date / Date Status | Dates on cards, card order and month grouping, calendar buttons, the .ics file, Accreditation windows, the Full Calendar. "Day TBC" shows the month only |
| Time (KSA) | Time on PD cards and in calendar invitations (75-minute sessions) |
| Partner / Host | Partner chip on PD cards (added automatically when an EdTech Partner session gets a partner), host line on Product and In-Person events |
| Audience, Language, Country / Location, Pricing | The matching details on each card, including Enrichment country filters and Free / Paid / Sponsored tags |
| Registration Link | Turns the button into **Register now** and puts the link inside the calendar invitations |
| Event Status | **Cancelled**: crossed out on its card, removed from the calendar and the event lists. **Postponed**: marked on its card. **Delivered**: shows Completed |
| Off-Periods sheet | The school breaks shaded in the Full Calendar |

The dashboard at **/tracker/** reads the same file.

---

## Rules that keep it working

- Keep the file name exactly `events-tracker.xlsx` and keep the column headers unchanged.
- **Site Key** connects a row to its card (`pd-s03`, `enr-05`, `in-person-events-bett-uk`...). Never change existing keys.
- A new row without a Site Key appears in the Full Calendar only. A brand-new card needs a page update.
- The page text (hero, descriptions, stats, accreditation criteria) lives in the HTML.

## If something goes wrong

If the Excel file is missing or cannot be read, every page shows its built-in content and takes links from
`links.json`, exactly as before. Upload a corrected file and the site switches back to Excel automatically.

## Important

Everything in `events-tracker.xlsx` is public: anyone can download it from the site, including owners, notes and
attendance figures. Keep anything confidential out of the file you upload.

---

## Intel SFI dashboard (/IntelSFI/)

`IntelSFI/index.html` is a self-contained dashboard (data embedded, no participant names). To refresh it:

1. Open https://plans.classera.com/IntelSFI/ and click **Update data**.
2. Upload the latest Classera SFI enrollment export (.xlsx) and check the preview.
3. Click **Download updated dashboard** (saves `index.html`).
4. On GitHub, open the **IntelSFI** folder, click **Add file > Upload files**, drop in `index.html` and commit.

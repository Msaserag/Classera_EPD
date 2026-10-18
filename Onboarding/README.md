# Classera Onboarding Hub: how to update the site

**You edit one Google Sheet: [Classera Onboarding Hub - Tracker](https://docs.google.com/spreadsheets/d/1zrB5BAlwFmOT8zq4plKr_3aQiXG2QwjiNEGkSMPNqEU/edit).**
Every product, role, track, description and link on the page comes from its `Products` and `Tracks` tabs.
The page design and the fixed text stay in the HTML and never need touching.

---

## Update the site (no upload needed)

1. Open the Google Sheet and edit the `Products` or `Tracks` tab. Google saves automatically.
2. Reload the Onboarding page. Changes show within a few minutes.

You can tell which source the page is using: the footer shows a green dot and
**Content live from Google Sheets** when the sheet was read, **Content live from Excel (backup)** when it
fell back to `onboarding-tracker.xlsx`, and a grey dot and **Built-in content** when both failed.

The sheet must stay shared as **Anyone with the link: Viewer**. If you turn that off, the page
silently falls back to the Excel backup.

### Order of sources

1. Google Sheet (tabs `Products` and `Tracks`, read as CSV through the sheet link)
2. `onboarding-tracker.xlsx` next to `index.html` (backup, only changes when you upload it)
3. Built-in copy inside `index.html`

---

## Sign-in buttons (top note and bottom band)

The sign-in buttons are built from the **Products** tab, so you never edit them in the page.
There is one button per product. It shows the product name and its **Platform Host**, and opens
`https://<Platform Host><Login Path>`.

- Change a host or login path in the Products tab and both notes update on the next load.
- A product with an **empty Platform Host** (C-Pay, Edumalls and C-Inspire for now) shows a dashed
  "Coming soon" chip instead of a link, and its track cards hide the host tag and the Copy link button.
  Fill in the host and login path later and the chip becomes a working sign-in button.
- A product with status `Hidden` is left out. A new product gets its own button automatically.
- Buttons follow the **Order** column and sit on one line on wide screens.

---

## What the sheet controls

### Products sheet, one row per card in step 1

| Column | What changes on the site |
| --- | --- |
| Site Key | The internal id. Tracks are matched to a product by this value. **Never change an existing key** |
| Order | Position of the card in the grid. Lower comes first |
| Product (EN) / (AR) | The card title in each language |
| Description (EN) / (AR) | The line under the title |
| Icon | The glyph on the card: `lms`, `tms`, `erp`, `pay`, `mall`, `spark`, `book`, `chart` |
| Accent | The card color: `cyan`, `blue`, `gold`, `green` |
| Platform Host | Where tracks for this product open, for example `elearning.classera.com`. Host only, no `https://` |
| Login Path | The sign-in path on that host, normally `/login` |
| Status | `Live`, `Coming soon` (shows a badge), or `Hidden` (removes the card) |

### Tracks sheet, one row per track card in step 3

| Column | What changes on the site |
| --- | --- |
| Site Key | The internal id for this track. Never change an existing one |
| Product Key | Must match a Site Key on the Products sheet |
| Role Key / Role Order | The role chip in step 2. A role appears as soon as one track uses its key. Role Order sets the chip order |
| Role (EN) / (AR) | The label on the role chip |
| Track Order | Position of the track card within that role |
| Track (EN) / (AR) | The track card title |
| Description (EN) / (AR) | The line under the title |
| Level | `Essential`, `Core` or `Advanced`. Sets the colored tag |
| Modules / Minutes | The two chips on the card, and the total shown above the track list |
| **Course Link** | The **Start track** button. Paste a full URL or a `sh.classera.com` short link |
| **Manual Link** | The **Read the manual** button. Leave empty and the button is hidden |
| **Plan Link** | Optional **View the plan** button, for example `https://plans.classera.com/#acc` on the accreditation tracks. Leave empty and the button is hidden |
| Status | `Live`, `Coming soon` (button disabled) or `Hidden` (row removed) |

### Summary tab

Read only. Live counts per product: roles, tracks, live tracks, how many course links and manual
links are filled in. This is your content backlog in one view.

---

## Rules that keep it working

- Keep the tab names `Products` and `Tracks` and keep the column headers unchanged.
- **Site Key** connects a row to its card. Never change an existing key. Add rows, never columns.
- A track whose **Product Key** does not match any product simply does not appear.
- **Course Link empty**: the button still works. It opens the platform sign-in and the card shows
  "Course link will be updated soon".
- Tracking is added automatically to every link
  (`utm_source=onboarding`, `utm_medium=hub`, `utm_campaign=<product>`, `utm_content=<role>`),
  except on `sh.classera.com` short links, which are passed through untouched so your own
  tracking stays intact.
- The **Copy link** button on each card gives you the exact URL to register as a short link.

## If something goes wrong

If the Google Sheet cannot be read (renamed tab, link sharing turned off, Google unreachable), the page
uses the Excel backup, then the built-in copy, and nothing breaks. Fix the sheet and the page
switches back to it automatically.

## Important

The sheet is readable by anyone who has its link, and the page exposes that link. Keep anything
confidential out of it.

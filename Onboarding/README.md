# Classera Onboarding Hub: how to update the site

**You edit one file: `onboarding-tracker.xlsx`.** Every product, role, track, description and link
on the page comes from it. The page design and the fixed text stay in the HTML and never need touching.

---

## Update the site in four steps

1. Edit the tracker in Excel (keep your own versions in OneDrive: v2, v3...).
2. On GitHub, open the repository root and click **Add file > Upload files**.
3. Drop in the latest tracker **renamed to `onboarding-tracker.xlsx`**. It replaces the old one.
4. Click **Commit changes**. The site refreshes within about a minute.

You can tell which source the page is using: the footer shows a green dot and
**Content live from Excel** when the file was read, and a grey dot and **Built-in content** when it
fell back.

---

## What the Excel file controls

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
| Status | `Live`, `Coming soon` (button disabled) or `Hidden` (row removed) |

### Summary sheet

Read only. Live counts per product: roles, tracks, live tracks, how many course links and manual
links are filled in. This is your content backlog in one view.

---

## Rules that keep it working

- Keep the file name exactly `onboarding-tracker.xlsx` and keep the column headers unchanged.
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

If the Excel file is missing, misnamed or cannot be read, the page shows its built-in copy of the
content and nothing breaks. Upload a corrected file and the site switches back to Excel
automatically.

## Important

Everything in `onboarding-tracker.xlsx` is public once uploaded: anyone can download it from the
site. Keep anything confidential out of the file you publish.

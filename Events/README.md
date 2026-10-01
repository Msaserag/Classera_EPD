# Classera Events Dashboard: how it updates

**Live page:** https://plans.classera.com/Events/

## Nothing to edit here

The dashboard reads **`events-tracker.xlsx`** from the repository root, the same file that drives
the plan pages. Update the tracker, upload it to GitHub (same name), commit, and the dashboard
shows the new numbers within about a minute.

The header shows where the data came from:

- Green dot, **Live from events-tracker.xlsx**: the file was read.
- Grey dot, **Built-in copy**: the file could not be read, so the page shows the copy embedded on
  the day the dashboard was published. It switches back to live automatically.

## Columns the dashboard uses (Events sheet)

| Column | Used for |
| --- | --- |
| Program, Track, Partner / Host, Delivery Mode | Filters and breakdowns |
| Start Date, End Date, Date Status, Time (KSA) | Trend, period filter, countdowns |
| Event Status, Announcement Status | Status charts, needs-attention list |
| Registration Link | Register buttons, "Add link" alerts |
| Registrations, Attendees, Satisfaction % | Outcome KPIs and the outcomes table |

Timing, days-to-go and action flags are recalculated live from today's date, so they never go stale.

## Partners

Hosts that are Classera itself or its own units and brands are not counted as partners.
The list is at the top of the script in `index.html` (`INTERNAL_HOSTS`). A host such as
"Classera & Intel" counts Intel as the partner.

## Satisfaction %

Enter it as 92 or 92% or 0.92: all three read as 92%.

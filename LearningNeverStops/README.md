# Learning Never Stops: landing page

Landing page for the Learning Never Stops initiative. It sends each role to its "Getting Started with Classera" course on the Classera LMS (elearning.classera.com).
Published at plans.classera.com/LearningNeverStops.

## Update the courses (no code)
1. Open `lns-courses.xlsx` and edit the **Courses** sheet (one row per course card).
2. Upload it over the old file in this folder. The page reads it on every load.

Status: `Live` shows the card, `Soon` shows a Coming soon card, `Hidden` removes it.
Icon: `teacher`, `leader`, `supervisor`, `admin`, `book`. Accent: `cyan`, `blue`, `gold`, `green`.

## Notes
- Learners must sign in to the LMS first; the top note and bottom band carry a sign-in button.
- Course links get `utm_source=lns&utm_medium=landing&utm_campaign=<key>` for tracking.
- Design, fonts, dark mode and Arabic/English switch are shared with the Onboarding hub.

## Initiative guide (PDF and online page)
- `LearningNeverStops-Guide-v1.0.pdf` is the downloadable guide. The landing page links to it from the hero and from the guide section.
- `guide/index.html` is the same content as a web page (goals, 16 services with roles, 8-week plan) at plans.classera.com/LearningNeverStops/guide/, with a role filter and search.
- When the guide changes, replace the PDF with a new version number and update the file name in both pages, and update the text in `guide/index.html`.

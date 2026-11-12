# PS Training HUB

Static front end (no build) for the Classera Partner Success hub. Data and login live in a Google Apps Script web app backed by a Google Sheet.

## Deploy on Vercel
1. Import this repo in Vercel. Framework preset: **Other**. No build command, output directory empty (root).
2. Add the custom domain you want (for example `hub.classera.com`) and send the DNS record to the domain team.

## Configure
Edit `config.js`:
- `API_URL`: the Apps Script `/exec` URL (already set).
- `RECAPTCHA_SITE_KEY`: reCAPTCHA v2 site key (public). Put the secret key in Apps Script, Project Settings, Script properties, as `RECAPTCHA_SECRET`.

Set `API_URL` to `"mock"` to run with sample data (login `demo` / `demo`).

## Files
- `index.html`, `styles.css`, `app.js`: the app
- `favicon.svg`: tab icon
- `vercel.json`: security headers

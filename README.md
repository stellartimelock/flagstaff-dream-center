# Flagstaff Dream Center

Simplified, accessibility-first static website.

Live preview: https://stellartimelock.github.io/flagstaff-dream-center/

Published from the `main` branch root (no build step).

To turn on the live preview (repo admin, once):
1. Open https://github.com/stellartimelock/flagstaff-dream-center/settings/pages
2. Set **Source** to **Deploy from a branch**
3. Set **Branch** to `main` and **folder** to `/ (root)`
4. Save

The site will be at https://stellartimelock.github.io/flagstaff-dream-center/

## Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Notes

- Call, Email, and Apply appear once, in the sticky bottom bar.
- Donate in the sticky top bar opens `donate.html`. The Subsplash button on that page is a placeholder. Do not connect PayPal or another processor until a Subsplash URL is ready.
- Who we are, Program, Our story, and Contact live in the hamburger menu. Donate stays in the top bar, not in the menu.
- Apply form is a local placeholder only. It does not submit to email or any backend.
- Hours (Google listing): Monday–Thursday 8:30 AM–4:00 PM; Friday–Sunday closed.
- Photos are Isaac’s real Flagstaff Dream Center photos (van “We are” hero, kitchen/community).

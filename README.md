# Flagstaff Dream Center

Preview on the Sand Echo concepts host. Search engines are told to skip it.

Published from the `main` branch root (no build step). The site lives in `/dream-center/`. The root page is Sand Echo Concepts and links to this preview.

Preview: https://concepts.sandecho.com/dream-center/

## Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/` for Concepts, or `http://localhost:8080/dream-center/` for the site.

## Notes

- Call, Email, and Apply appear once, in the sticky bottom bar.
- Donate in the sticky top bar opens `donate.html`. The on-page form (amount, name, email, note) is a placeholder. Subsplash is the eventual processor. Do not connect PayPal or another processor until a Subsplash URL is ready.
- Who we are, Program, Our story, and Contact live in the hamburger menu. Donate stays in the top bar, not in the menu.
- Apply form is a local placeholder only. It does not submit to email or any backend.
- Hours (Google listing): Monday–Thursday 8:30 AM–4:00 PM; Friday–Sunday closed.
- Photos are Isaac’s real Flagstaff Dream Center photos (van “We are” hero, kitchen/community, Food Bank serve team).
- Preview pages are noindex/nofollow. Do not add a sitemap.

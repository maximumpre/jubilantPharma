# Jubilant Pharma

## Changelog

### 2026-10-27 — Step 1 multi-viewport UI mock-up from Aptia HOLL08 login
- **Completed:** Rebuilt `index.html` + `aptia-login.css` against live `https://auth.aptia365.com/HOLL08/login`. Authentic logos (`HOLL08.png`, Aptia 365), Proxima Nova webfonts, measured colors (footer `#123646`, links `#00722b`, CTA border `#00d17c`), disabled→enabled Login button, mobile stack (Aptia logo hidden <641px), authentic outbound links (privacy, terms, hints, MFA, register).
- **Files affected:** `index.html`, `aptia-login.css`, `fonts/*`, `images/HOLL08.png`, `images/Aptia-365-RGB-Light-bg.png`, `images/favicon.png`, `forgot-username.html`, `forgot-password.html`, `README.md`
- **Verification:** Browser DOM/CSSOM capture + desktop/mobile screenshots of live Aptia; local static server smoke on assets.
- **Outcome:** Static HTML mock-up aligned to Aptia365 login chrome; project remains non-Next (no Astro Hybrid — stack is static Tailwind/HTML).



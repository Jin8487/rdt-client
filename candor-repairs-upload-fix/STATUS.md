# Implementation status — 30 Jul 2026 — COMPLETE ✅

## Final state
* **Live site fixed and verified.** https://repairs.candorhousing.com serves the patched
  app on every path including the homepage (`LIVE SITE PATCHED - VERIFIED`,
  worker-hunt/full-replace runs in Jin8487/GPT-Test Actions).
* **Backend proven end-to-end** with valid input: ticket MNT-0011 created via the live
  pipeline with both photos assembled and `_tmp` cleaned up.
* **Lost report recovered:** MNT-0011 is Majed Ahmed's report re-filed with his actual
  photos recovered from the stranded upload chunks.

## Root causes fixed
1. Frontend `dataUrl.split(',')[1]` destroyed every video (video mime types contain a
   comma in the codec list) — fixed to slice after the `;base64,` marker.
2. Recorded/gallery video mime now sanitised (`.split(';')[0]`); empty recordings rejected.
3. Retries no longer re-upload completed files (no more duplicate chunks/tickets).

## The deployment saga (for future reference)
The site is a Cloudflare **Worker** (`candor-repairs`) on a custom domain — not Pages.
The original deployment shipped the HTML as a **Workers static asset**, which is served
for `/` *before* the worker script runs, ignores query strings, and is untouched by any
cache purge. Script-only updates via the `/content` endpoint retain assets, which is why
the homepage kept serving the old page after deploy + purges. Fixed with a full worker
replace (classic `PUT /workers/scripts/{name}`), which drops retained assets so every
request runs the script. Future frontend deploys: run the `full-replace` workflow in
Jin8487/GPT-Test.

## Remaining housekeeping (manual, optional)
* Close MNT-0003…MNT-0009 in Baserow as duplicates of MNT-0011; close MNT-0010 (test entry).
* Recommended: paste `apps-script-fix.gs` into the bound Apps Script for per-slot
  resilience + `_tmp` sweeper, deploy a new version.
* The `CLOUDFLARE_API_TOKEN` GitHub secret (Workers edit + zone cache purge) stays in
  Jin8487/GPT-Test for future deploys; rotate it in the Cloudflare dashboard if desired.

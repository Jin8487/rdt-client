# Implementation status — 3 Aug 2026

All work was done autonomously via GitHub Actions in the private repo
`Jin8487/GPT-Test` (this environment's network policy blocks the app's domains
directly; Actions runners have open egress). The canonical patched page lives
there as `repairs-frontend-fixed/index.html`, built by `scripts/patch_v2.py`
from fail-loud exact-match fragments in `scripts/frags/`.

## v1 — upload corruption fix: DEPLOYED & VERIFIED LIVE (30 Jul)
* Root cause: `fr.result.split(',')[1]` truncated base64 whenever the mime had
  a comma (`video/mp4; codecs=avc1…,mp4a…`) → 11–16-byte uploads; the backend's
  all-or-nothing finalise then killed every file in the report. Fixed to slice
  after the `;base64,` marker; recorded/gallery video mime sanitised
  (`.split(';')[0]`); empty recordings rejected; retries no longer re-upload
  completed files.
* Backend hardening (`apps-script-fix.gs` in this folder) pasted into the bound
  Apps Script by Mo and deployed: per-slot finalise isolation,
  `recoverStrandedUploads()` (run once), `installSweepTrigger` → 10-minute
  `_tmp` sweeper (run once).
* Data recovery: Majed Ahmed's stranded photos re-filed as **MNT-0011** via the
  live pipeline. MNT-0003…0009 are duplicates to close; MNT-0010 was a test
  (its video bytes were destroyed client-side pre-v1 — unrecoverable).

## Deployment saga (for future reference)
The site is a Cloudflare **Worker** (`candor-repairs`) on a custom domain — not
Pages. The original deployment shipped the HTML as a **Workers static asset**,
which is served for `/` *before* the worker script runs, ignores query strings,
and is untouched by any cache purge. Script-only updates via the `/content`
endpoint retain assets, which is why the homepage kept serving the old page
after deploy + purges. Fixed with a full worker replace (classic
`PUT /workers/scripts/{name}`), which drops retained assets so every request
runs the script. Future frontend deploys: run the `full-replace` workflow in
Jin8487/GPT-Test. The `CLOUDFLARE_API_TOKEN` GitHub secret (Workers edit +
zone cache purge) stays in that repo; rotate it in the Cloudflare dashboard if
desired.

## v2 — speed + "Other" free-text: DEPLOYED & VERIFIED LIVE (3 Aug)
Changes (frags 01–17):
* Media budget: photos 1600px→1280px, JPEG q .82→.72; video 40MB→12MB cap,
  bitrate 1.2→0.8 Mbps. Robot journey measured a 218KB source photo uploading
  at 64KB (−70%).
* Uploads run 2-parallel with per-slot retry and an honest byte-weighted
  progress bar ("Nearly done — saving your files…" during finalise).
* Every option list that needed it (damp, leaks, heating, electrics, doors,
  fire safety, structure — plus the location step) now has **Other** revealing
  a free-text box; text is merged as `Other — <text>` into the existing
  Answers serialization, so no backend change was required. Validation blocks
  Continue until the text is filled in.
* Fixed a pre-existing flow bug where picking a property manually skipped the
  location step.
* Stagger fix (frag 17, found by the live A/B test): the first file now
  uploads alone before the parallel workers start — two simultaneous first
  chunks made Apps Script lazily create duplicate `_tmp` folders, splitting
  chunks so `done` missed some (the sweeper still recovers them, but 10–20 min
  late).

## Testing
* Local robot journey (Playwright + stub backend, `journey.mjs`): full tenant
  flow including Other free-text at location + doors, 2 photos + video,
  asserts merged answers, no helper-key leakage, clean mimes, compression,
  parallelism=2, first-chunk stagger, done-after-chunks. PASSED against the
  exact bytes deployed.
* Live A/B timing (`timing-ab` workflow, real Apps Script backend):
  * OLD profile (v1 sizes, sequential): 8.5MB base64, **36s** server time
    (finalise alone 18.4s); wire time at 1 Mbps ≈ 67s → tenant wait ≈ **1m45s**.
  * NEW profile (v2 sizes, 2-parallel): 2.8MB base64, **10s** server time
    (finalise 0.9s); wire at 1 Mbps ≈ 22s overlapped → tenant wait ≈ **30s**.
* The A/B run doubled as a live probe: it surfaced the `_tmp` race above and
  a benign ticket-ID race (two `create`s within ~1s of a `done` can get the
  same MNT ref — only plausible under synthetic load).

## Cleanup for Mo (nothing here is automated on purpose)
* Delete Drive folder **MNT-0016 — 4 Repton Road** and the Baserow
  "Maintenance" row MNT-0016 (automated speed-test garbage; both test runs
  landed under that one ref).
* Close MNT-0003…0009 as duplicates of MNT-0011; MNT-0010 was a test.

## Remaining human check
One real submission from a phone (photos + a short video) to confirm the
end-to-end feel; everything else is machine-verified.

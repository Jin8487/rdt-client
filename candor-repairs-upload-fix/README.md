# Candor Repairs app — media upload failure: diagnosis & fix

**System:** `repairs.candorhousing.com` (Cloudflare frontend) → Google Apps Script web app
(bound to the *Candor Maintenance Log* sheet) → Drive evidence folders + sheet + Baserow.

**Symptom:** tenant fills the report, taps *Send report*, the app sticks on
"Uploading photo…" and shows:

> Something went wrong — please tap Send to try again.
> Details: `Exception: Impossible de décoder la chaîne`

Staff-side, every ticket's *Evidence* folder contains only a `_tmp` folder full of
extension-less `text/plain` files — no photos, no video.

---

## Root cause (three bugs chained together)

### Bug 1 — frontend: `split(',')[1]` destroys every video
The uploader turns each captured file into a data URL and extracts the base64 with
`dataUrl.split(',')[1]`. That works for photos (`data:image/jpeg;base64,…` has one
comma) but **video mime types contain a comma in the codec list**:

```
data:video/mp4; codecs=avc1.42000a,mp4a.40.2;base64,AAAA….
                                  ^ split here → payload lost
```

`split(',')[1]` returns the literal text `mp4a.40.2;base64` (16 bytes) — the entire
video is discarded. Byte-level proof from the stranded chunks:

| Chunk file | Size | Actual content |
|---|---|---|
| `ch_MNT-0010_video_0\|1\|video/mp4; codecs=avc1.42000a,mp4a.40.2` | 16 B | `mp4a.40.2;base64` |
| `ch_MNT-0003_video_0\|1\|video/mp4;codecs=avc1,opus` | 11 B | `opus;base64` |

Photo chunks are unaffected and fully intact (verified: they decode to valid JPEGs).

### Bug 2 — Apps Script: all-or-nothing finalise
The finalise step decodes every slot's chunks in one pass. `Utilities.base64Decode()`
throws on the garbage video payload — `Could not decode string`, shown in the tenant's
screenshot in the script locale as *"Impossible de décoder la chaîne"* — and the whole
finalise aborts. **The perfectly valid photos are never assembled either**, `_tmp` is
never cleaned up, and the error bubbles back to the tenant. A missing slot (manifest
says a video exists but its chunk never arrived) aborts the same way.

### Bug 3 — retry loop multiplies the damage
"Tap Send to try again" re-runs the whole submission:

* Re-sending under the **same ref** duplicates identically-named chunk files in `_tmp`
  (MNT-0010 has every chunk twice). A finaliser that concatenates all name-matches then
  fails base64 decode even for good photos (padding `=` ends up mid-stream).
* Restarting the form mints a **new ticket per attempt** — MNT-0004…MNT-0009 are six
  duplicates of MNT-0003 created by one tenant retrying for 6 minutes.

The previous (non-chunked) iteration worked — MNT-0001/0002 have real JPEGs — which is
why this looks like a regression introduced with the chunked-upload iteration.

---

## Fix

### 1. Frontend (`frontend-upload-fix.js`)
* Extract base64 after the `;base64,` marker (never `split(',')`), or skip data URLs
  entirely via `blob.arrayBuffer()`.
* Send a **sanitised mime** — `blob.type.split(';')[0]` — so codec strings never reach
  filenames or headers.
* Retries reuse the same ref and tell the server to wipe that ref's `_tmp` first
  (idempotent), and *Send report* is disabled while in flight → no duplicate tickets.

### 2. Apps Script (`apps-script-fix.gs`)
* Per-slot try/catch: one bad slot can no longer kill the others; the response reports
  per-slot success/failure.
* Dedupes duplicate chunk files (keeps newest), validates base64 before decoding,
  strips stray data-URL headers server-side as defence in depth.
* `recoverStrandedUploads()` — **one-time sweeper that restores the photos already
  stranded in every existing ticket's `_tmp`** (they are intact), then archives `_tmp`.
* Optional time-driven sweep so any future stranded upload self-heals.

### 3. Deploy correctly (easy to miss)
Apps Script web apps keep serving the **old code** until you create a *new version*:
**Deploy → Manage deployments → ✏️ Edit → Version: “New version” → Deploy.**

---

## Clean-up after deploying
1. Run `recoverStrandedUploads()` once from the Apps Script editor → photos reappear in
   each ticket's evidence folder.
2. Close MNT-0004…MNT-0009 as duplicates of MNT-0003.
3. Videos from the broken period are unrecoverable (the bytes never left the phone) —
   ask the two reporters to resend if video matters for those tickets.

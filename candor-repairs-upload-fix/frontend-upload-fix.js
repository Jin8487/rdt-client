/**
 * CANDOR REPAIRS — frontend upload fix (repairs.candorhousing.com).
 *
 * Three changes to the uploader. Search the deployed page's JS for
 * `split(',')` — that line is the root cause of every broken video.
 */

// ---------------------------------------------------------------------------
// FIX 1 (root cause): never extract base64 with dataUrl.split(',')[1].
// Video mime types contain a comma ("video/mp4; codecs=avc1.42000a,mp4a.40.2"),
// so split(',')[1] returns the literal text "mp4a.40.2;base64" and the whole
// video is thrown away. The server then dies with
// "Exception: Could not decode string" / "Impossible de décoder la chaîne".
// ---------------------------------------------------------------------------

// Preferred: skip data URLs entirely — encode straight from the blob.
async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const STEP = 0x8000; // keep String.fromCharCode within arg limits
  for (let i = 0; i < bytes.length; i += STEP) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP));
  }
  return btoa(bin);
}

// If you must keep FileReader.readAsDataURL, replace split(',')[1] with:
function dataUrlToBase64(dataUrl) {
  const i = dataUrl.indexOf(';base64,');
  if (i === -1) throw new Error('Unexpected data URL format');
  return dataUrl.slice(i + ';base64,'.length);
}

// ---------------------------------------------------------------------------
// FIX 2: sanitise the mime before it goes into chunk names / params.
// Codec suffixes ("; codecs=…") must never leave the browser.
// ---------------------------------------------------------------------------
function cleanMime(blob, fallback) {
  return (blob.type || fallback || 'application/octet-stream').split(';')[0].trim();
}

// ---------------------------------------------------------------------------
// FIX 3: make retries idempotent — same ticket ref, wiped staging, and a
// disabled Send button while in flight. Today each retry duplicates the
// chunk files (same names again in _tmp) and each full restart creates a
// brand-new ticket (MNT-0004…0009 were six duplicates of MNT-0003).
// ---------------------------------------------------------------------------
async function submitReport(api, ticket, slots /* {wide, close, video?} as Blobs */) {
  const sendBtn = document.querySelector('#sendReport');
  sendBtn.disabled = true;
  try {
    // Reuse the ref from a previous failed attempt instead of minting a new ticket.
    ticket.ref = sessionStorage.getItem('pendingRef') || await api.createTicket(ticket);
    sessionStorage.setItem('pendingRef', ticket.ref);

    // Clear any half-uploaded chunks from a previous attempt (server trashes _tmp).
    await api.post({ action: 'resetUpload', ref: ticket.ref });

    for (const [slot, blob] of Object.entries(slots)) {
      if (!blob) continue;
      if (!blob.size) throw new Error(`The ${slot} file is empty — please retake it.`);
      const b64 = await blobToBase64(blob);          // FIX 1
      const mime = cleanMime(blob);                  // FIX 2
      const CHUNK = 1.5 * 1024 * 1024;               // chars of base64 per request
      const total = Math.ceil(b64.length / CHUNK);
      for (let i = 0; i < total; i++) {
        await api.post({
          action: 'chunk',
          ref: ticket.ref,
          slot, idx: i, total, mime,
          data: b64.slice(i * CHUNK, (i + 1) * CHUNK),
        });
      }
    }

    // Finalise and trust only an explicit per-slot result.
    const result = await api.post({ action: 'finalise', ref: ticket.ref });
    if (!result.ok) {
      const why = result.failed.map(f => `${f.slot}: ${f.reason}`).join('; ');
      throw new Error(`Some files did not upload (${why}). Your report was saved.`);
    }
    sessionStorage.removeItem('pendingRef');
    return result;
  } finally {
    sendBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Notes for the POST helper (Apps Script quirks):
//  * Send bodies as text/plain (JSON.stringify into the body) — Apps Script web
//    apps cannot answer CORS preflights, and text/plain avoids one entirely.
//  * Use ordinary CORS mode (NOT no-cors) so the JSON response is readable.
//  * When recording video, request a plain container if supported:
//      new MediaRecorder(stream, { mimeType: 'video/mp4' })  // or 'video/webm'
//    and build the final blob only after recorder.onstop.
// ---------------------------------------------------------------------------

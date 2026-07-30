/**
 * CANDOR REPAIRS — server-side upload fix.
 *
 * Paste into the Apps Script project bound to "Candor Maintenance Log" and wire
 * finaliseTicketUpload_() into the existing doPost finalise branch (replacing the
 * current assemble logic). Chunk-file naming stays exactly as today:
 *
 *     _tmp/ch_<REF>_<slot>_<idx>|<total>|<mime>
 *
 * so already-uploaded chunks remain readable. After pasting: Deploy → Manage
 * deployments → Edit → Version: "New version" → Deploy. The /exec URL serves the
 * OLD code until a new version is deployed.
 */

// ---------- helpers ----------

// Safe even when the mime contains commas ("video/mp4; codecs=avc1.42000a,mp4a.40.2").
function stripDataUrlHeader_(s) {
  s = String(s || '');
  var i = s.indexOf(';base64,');
  return (s.slice(0, 5) === 'data:' && i !== -1) ? s.slice(i + 8) : s;
}

function sanitizeMime_(mime) {
  mime = String(mime || '').split(';')[0].trim().toLowerCase();
  return mime || 'application/octet-stream';
}

function isLikelyBase64_(s) {
  return /^[A-Za-z0-9+/\r\n]+={0,2}[\r\n]*$/.test(s);
}

var EXT_BY_MIME_ = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov'
};

var SLOT_LABELS_ = { wide: '1 wide shot', close: '2 close-up', video: '3 video' };

// "ch_MNT-0010_wide_0|1|image/jpeg" -> {ref, slot, idx, total, mime}
function parseChunkName_(name) {
  var m = name.match(/^ch_(.+?)_(wide|close|video)_(\d+)\|(\d+)\|([\s\S]*)$/);
  if (!m) return null;
  return { ref: m[1], slot: m[2], idx: Number(m[3]), total: Number(m[4]), mime: sanitizeMime_(m[5]) };
}

// ---------- finalise (per-slot isolation: one bad slot no longer kills the rest) ----------

/**
 * Assembles every slot found in <ticketFolder>/_tmp into real files in ticketFolder.
 * Returns {ok, saved:[{slot,name}], failed:[{slot,reason}]}.
 * _tmp is trashed when nothing failed, renamed to _failed otherwise (nothing is lost).
 */
function finaliseTicketUpload_(ticketFolder) {
  var saved = [], failed = [];
  var tmpIt = ticketFolder.getFoldersByName('_tmp');
  if (!tmpIt.hasNext()) return { ok: true, saved: saved, failed: failed };
  var tmp = tmpIt.next();

  // Group chunks by slot; dedupe identical names keeping the NEWEST (retry overwrites).
  var bySlot = {};
  var files = tmp.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var meta = parseChunkName_(f.getName());
    if (!meta) continue;
    var slot = (bySlot[meta.slot] = bySlot[meta.slot] || {});
    var key = meta.idx;
    if (!slot[key] || f.getDateCreated() > slot[key].file.getDateCreated()) {
      slot[key] = { file: f, meta: meta };
    }
  }

  Object.keys(bySlot).forEach(function (slotName) {
    try {
      var entries = Object.keys(bySlot[slotName])
        .map(function (k) { return bySlot[slotName][k]; })
        .sort(function (a, b) { return a.meta.idx - b.meta.idx; });
      var total = entries[0].meta.total;
      if (entries.length !== total) {
        throw new Error('expected ' + total + ' chunk(s), found ' + entries.length);
      }
      var b64 = entries.map(function (e) {
        return stripDataUrlHeader_(e.file.getBlob().getDataAsString()).replace(/\s+/g, '');
      }).join('');
      if (!b64 || !isLikelyBase64_(b64)) {
        throw new Error('payload is not base64 (client sent a corrupt/empty file)');
      }
      var mime = entries[0].meta.mime;
      var ext = EXT_BY_MIME_[mime] || 'bin';
      var name = (SLOT_LABELS_[slotName] || slotName) + '.' + ext;
      var bytes = Utilities.base64Decode(b64);
      if (bytes.length < 100) throw new Error('decoded file is only ' + bytes.length + ' bytes');
      ticketFolder.createFile(Utilities.newBlob(bytes, mime, name));
      saved.push({ slot: slotName, name: name });
    } catch (err) {
      failed.push({ slot: slotName, reason: String(err && err.message || err) });
    }
  });

  if (failed.length === 0) {
    tmp.setTrashed(true);
  } else {
    tmp.setName('_failed'); // keep raw chunks for inspection, but unblock the ticket
  }
  return { ok: failed.length === 0, saved: saved, failed: failed };
}

// Wire into doPost, e.g.:
//   if (action === 'finalise') {
//     var result = finaliseTicketUpload_(DriveApp.getFolderById(folderIdForRef(ref)));
//     return ContentService.createTextOutput(JSON.stringify(result))
//                          .setMimeType(ContentService.MimeType.JSON);
//   }
// Also add an idempotent reset for client retries:
//   if (action === 'resetUpload') { /* trash <ticketFolder>/_tmp if present, return {ok:true} */ }

// ---------- one-time recovery of the tickets already stuck ----------

/**
 * Run ONCE from the editor after deploying. Sweeps every ticket folder inside the
 * "Candor Maintenance" folder (located via this bound spreadsheet's parent), and
 * assembles whatever is still parked in _tmp. Stranded photos are intact and WILL
 * be restored; the 11–16 byte video stubs will be reported as failed (their bytes
 * never left the tenant's phone — unrecoverable).
 */
function recoverStrandedUploads() {
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var parents = ssFile.getParents();
  if (!parents.hasNext()) throw new Error('Spreadsheet has no parent folder');
  var root = parents.next(); // "Candor Maintenance"
  var tickets = root.getFolders();
  var report = [];
  while (tickets.hasNext()) {
    var folder = tickets.next();
    if (!folder.getFoldersByName('_tmp').hasNext()) continue;
    var res = finaliseTicketUpload_(folder);
    report.push(folder.getName() + ' → saved: [' +
      res.saved.map(function (s) { return s.name; }).join(', ') + '] failed: [' +
      res.failed.map(function (f) { return f.slot + ': ' + f.reason; }).join('; ') + ']');
  }
  Logger.log(report.length ? report.join('\n') : 'Nothing stranded — all clean.');
  return report;
}

// ---------- optional: self-healing sweep every 10 minutes ----------

function installSweepTrigger() {
  ScriptApp.newTrigger('sweepStrandedUploads_').timeBased().everyMinutes(10).create();
}

function sweepStrandedUploads_() {
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var parents = ssFile.getParents();
  if (!parents.hasNext()) return;
  var tickets = parents.next().getFolders();
  var cutoff = Date.now() - 10 * 60 * 1000; // only touch uploads older than 10 min
  while (tickets.hasNext()) {
    var folder = tickets.next();
    var tmpIt = folder.getFoldersByName('_tmp');
    if (tmpIt.hasNext() && tmpIt.next().getDateCreated().getTime() < cutoff) {
      finaliseTicketUpload_(folder);
    }
  }
}

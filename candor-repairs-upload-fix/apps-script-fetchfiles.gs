/**
 * CANDOR REPAIRS — fetchFiles: pull staged media server-to-server.
 *
 * The phone now stages photos/videos on repairs.candorhousing.com (Cloudflare)
 * the moment they are captured — fast and reliable even on poor signal. At
 * Send, this action makes Apps Script PULL those files over Google's own
 * network, so the submission no longer depends on the tenant's uplink at all.
 * Until this is pasted, the app automatically falls back to the old direct
 * upload, so nothing breaks in the meantime.
 *
 * PASTE: into the same Apps Script project as before (open the "Candor
 * Maintenance Log" sheet → Extensions → Apps Script), at the bottom of the
 * upload-fix file (or its own new file — either works).
 *
 * WIRE: in doPost, next to the existing checks for 'create' / 'chunk' /
 * 'done', add this block (use the SAME variable name the neighbouring checks
 * use for the parsed request — data / j / body):
 *
 *   if (data.action === 'fetchFiles') {
 *     return ContentService.createTextOutput(JSON.stringify(handleFetchFiles_(data)))
 *                          .setMimeType(ContentService.MimeType.JSON);
 *   }
 *
 * DEPLOY: Deploy → Manage deployments → pencil icon → Version: "New version"
 * → Deploy. (The live /exec URL serves the old code until you do this.)
 */

var FF_STAGE_PREFIX_ = 'https://repairs.candorhousing.com/stage/';
var FF_SLOT_LABELS_ = { wide: '1 wide shot', close: '2 close-up', plate: '3 model-plate', video: '4 video' };
var FF_EXT_ = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov'
};

function ffMime_(m) {
  m = String(m || '').split(';')[0].trim().toLowerCase();
  return m || 'application/octet-stream';
}

function ffName_(slot, mime) {
  slot = String(slot || 'file');
  var label = FF_SLOT_LABELS_[slot]
    || slot.replace(/^extraP(\d+)$/, '5 extra photo $1').replace(/^extraV(\d+)$/, '6 extra video $1');
  return label + '.' + (FF_EXT_[mime] || 'bin');
}

function ffTicketFolder_(ref) {
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var parents = ssFile.getParents();
  if (!parents.hasNext()) throw new Error('spreadsheet has no parent folder');
  var it = parents.next().getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf(ref) === 0) return f;
  }
  throw new Error('no folder found for ' + ref);
}

function handleFetchFiles_(req) {
  try {
    var ref = String(req.t || '').trim();
    if (!/^[A-Z]{2,6}-\d{1,6}$/.test(ref)) return { ok: false, error: 'bad ticket ref' };
    var folder = ffTicketFolder_(ref);
    var saved = [], failed = [];
    (req.files || []).slice(0, 12).forEach(function (f) {
      try {
        var url = String(f.url || '');
        if (url.indexOf(FF_STAGE_PREFIX_) !== 0) throw new Error('url not allowed');
        var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (resp.getResponseCode() !== 200) throw new Error('HTTP ' + resp.getResponseCode());
        var bytes = resp.getContent();
        if (bytes.length < 100) throw new Error('file is only ' + bytes.length + ' bytes');
        var mime = ffMime_(f.mime);
        folder.createFile(Utilities.newBlob(bytes, mime, ffName_(f.slot, mime)));
        saved.push(String(f.slot || ''));
      } catch (e) {
        failed.push({ slot: String(f.slot || ''), reason: String(e && e.message || e) });
      }
    });
    return { ok: failed.length === 0, saved: saved, failed: failed };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

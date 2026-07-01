// Helpers for detecting Telegram WebApp capabilities.
//
// File uploads in a Telegram Mini App rely on the host client's WebView
// supporting native <input type="file">. Very old Telegram clients ship
// outdated WebViews where the file picker either never opens or silently
// returns nothing — leaving the user thinking a file was attached when it
// was not. We detect this proactively from the reported WebApp version and
// also verify the picked FileList after the fact.

// Minimum Bot API / WebApp version we treat as "modern enough" for reliable
// file selection in the in-app WebView.
const MIN_FILE_VERSION = '6.0';

export function getWebApp() {
  return (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) || null;
}

// Returns { supported, version, reason } describing whether file uploads
// are expected to work in the current Telegram client.
export function getFileUploadSupport() {
  const tg = getWebApp();

  // Not running inside Telegram (e.g. opened in a normal browser) — native
  // file inputs work fine, so don't block the user.
  if (!tg || !tg.initData) {
    return { supported: true, version: tg?.version || null, reason: null };
  }

  const version = tg.version || null;

  // Use Telegram's own version comparison when available.
  if (typeof tg.isVersionAtLeast === 'function') {
    if (!tg.isVersionAtLeast(MIN_FILE_VERSION)) {
      return { supported: false, version, reason: 'outdated' };
    }
    return { supported: true, version, reason: null };
  }

  // Fallback: if we can't even read a version, the client is very old.
  if (!version) {
    return { supported: false, version, reason: 'outdated' };
  }

  return { supported: true, version, reason: null };
}

export const UPLOAD_ERROR_OUTDATED =
  'Файлни юклаб бўлмади. Эҳтимол сиз Telegram'
  + 'нинг эски версиясидан фойдаланмоқдасиз, у Mini App'
  + 'да файл юклашни қўлламайди. Илтимос, Telegram'
  + 'ни энг сўнгги версиягача янгиланг ва қайта уриниб кўринг.';

export const UPLOAD_ERROR_GENERIC =
  'Файлни юклаб бўлмади. Telegram'
  + 'нинг энг сўнгги версияси ўрнатилганини текширинг ва қайта уриниб кўринг.';

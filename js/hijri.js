// Today's date in the Hijri calendar, converted live by the Aladhan API
// (https://aladhan.com/islamic-calendar-api). No key or account needed, and
// the API allows cross-origin requests, so it works from file:// too.
//
// The panel has three states, loading, result and error, and setState() is
// the only code that shows or hides them, so exactly one is visible.
//
// Every failure is turned into a plain message. The browser's own strings,
// such as "Failed to fetch", are never shown.

const HIJRI_API = "https://api.aladhan.com/v1/gToH/";
const HIJRI_TIMEOUT = 8000;   // ms before the request is abandoned

// Messages for each kind of failure. Keys are HijriError kinds.
const HIJRI_MESSAGES = {
  offline: "Your device is offline. Connect to the internet, then try again.",
  timeout: "The date service took more than 8 seconds to answer. It may be busy, so try again in a moment.",
  network: "The date service could not be reached. Check your connection, or a network filter may be blocking it.",
  server: "The date service had a problem on its side. Try again in a moment.",
  data: "The date service sent back a reply this page could not read, so no date is shown."
};

/**
 * An error with a `kind` that picks the message above.
 * @param {"offline"|"timeout"|"network"|"server"|"data"} kind
 * @param {string} [detail] logged to the console, never shown
 */
class HijriError extends Error {
  constructor(kind, detail) {
    super(detail || kind);
    this.name = "HijriError";
    this.kind = kind;
    this.detail = detail || kind;
  }
}

/**
 * Today's date on the visitor's device as DD-MM-YYYY, the format the API
 * wants. Built from local parts on purpose: toISOString() is UTC and would
 * give the wrong day for part of the day in Saudi Arabia (UTC+3).
 * @param {Date} date
 * @returns {string}
 */
function toApiDate(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return dd + "-" + mm + "-" + date.getFullYear();
}

/**
 * Checks the reply has every field the panel shows. Throws a "data" error
 * otherwise, so a changed or broken API never prints "undefined".
 * @returns {object} the hijri part of the reply
 */
function readHijri(body) {
  const hijri = body && body.code === 200 && body.data && body.data.hijri;
  const ok = hijri &&
    hijri.day && hijri.year &&
    hijri.month && hijri.month.en && hijri.month.ar &&
    hijri.weekday && hijri.weekday.en && hijri.weekday.ar;
  if (!ok) throw new HijriError("data", "Reply is missing expected fields");
  return hijri;
}

/** Writes a number with Arabic-Indic digits, for the Arabic line. */
function arabicDigits(value) {
  return new Intl.NumberFormat("ar-SA-u-nu-arab", { useGrouping: false }).format(Number(value));
}

/**
 * Requests the conversion. Resolves with the hijri object or rejects with
 * a HijriError. fetch does not reject on HTTP errors such as 500, so the
 * status is checked here explicitly.
 * @param {Date} date
 * @returns {Promise<object>}
 */
function fetchHijri(date) {
  if (navigator.onLine === false) {
    return Promise.reject(new HijriError("offline"));
  }

  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, HIJRI_TIMEOUT);

  return fetch(HIJRI_API + toApiDate(date), { signal: controller.signal })
    .then(function (response) {
      if (!response.ok) throw new HijriError("server", "HTTP " + response.status);
      return response.json().catch(function () {
        throw new HijriError("data", "Reply was not valid JSON");
      });
    })
    .then(readHijri)
    .catch(function (err) {
      if (err instanceof HijriError) throw err;
      if (err && err.name === "AbortError") throw new HijriError("timeout");
      // fetch rejects with a TypeError when the request never completes.
      // The connection may have dropped while it was in flight.
      if (navigator.onLine === false) throw new HijriError("offline");
      throw new HijriError("network", String(err));
    })
    .finally(function () { clearTimeout(timer); });
}

UI.init("hijri", function () {
  const panel = document.getElementById("hijri-panel");
  if (!panel) return;

  // The script is running, so the "needs JavaScript" text no longer applies.
  const fallback = document.getElementById("hijri-fallback");
  if (fallback) fallback.hidden = true;

  const states = {
    loading: document.getElementById("hijri-loading"),
    result: document.getElementById("hijri-result"),
    error: document.getElementById("hijri-error")
  };
  const en = document.getElementById("hijri-en");
  const ar = document.getElementById("hijri-ar");
  const greg = document.getElementById("hijri-greg");
  const errorMessage = document.getElementById("hijri-error-message");
  const refresh = document.getElementById("hijri-refresh");
  const retry = document.getElementById("hijri-retry");

  /** Shows one state and hides the other two. */
  function setState(name) {
    Object.keys(states).forEach(function (key) {
      states[key].hidden = key !== name;
    });
    panel.setAttribute("aria-busy", String(name === "loading"));
  }

  function showResult(hijri, today) {
    // English names and spellings are the API's own transliterations.
    // A no-break space ( ) keeps the era marker on the year's line.
    en.textContent = hijri.weekday.en + ", " + hijri.day + " " + hijri.month.en + " " + hijri.year + " AH";
    ar.textContent = hijri.weekday.ar + "، " + arabicDigits(hijri.day) + " " +
      hijri.month.ar + " " + arabicDigits(hijri.year) + " هـ";
    greg.textContent = today.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    setState("result");
  }

  function showError(err) {
    console.warn("[hijri] " + err.detail);
    errorMessage.textContent = HIJRI_MESSAGES[err.kind] || HIJRI_MESSAGES.network;
    setState("error");
  }

  /**
   * Loads the date. `moveFocus` is set when a button started the load: the
   * button disappears with its state, so focus goes to the new state's
   * button instead of being lost.
   */
  function load(moveFocus) {
    setState("loading");
    const today = new Date();
    fetchHijri(today)
      .then(function (hijri) {
        showResult(hijri, today);
        if (moveFocus) refresh.focus();
      })
      .catch(function (err) {
        // fetchHijri only rejects with HijriError, so anything else came
        // from formatting the reply in showResult.
        showError(err instanceof HijriError ? err : new HijriError("data", String(err)));
        if (moveFocus) retry.focus();
      });
  }

  refresh.addEventListener("click", function () { load(true); });
  retry.addEventListener("click", function () { load(true); });

  load(false);
});

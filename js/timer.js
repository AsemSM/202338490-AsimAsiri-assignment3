// How long the visitor has had this page open, shown in the footer.
//
// Rules:
//   - Only time with the tab visible counts. The clock pauses when the
//     visitor switches tab or minimises the window, and resumes when they
//     come back, so the number means time actually spent on the page.
//   - The total is kept in sessionStorage, so a reload in the same tab
//     carries on from where it was, while a new tab or a new visit starts
//     from zero. If storage is blocked, the count still works for the visit.
//   - The display updates on each whole second of counted time, and the
//     timer stops completely while the tab is hidden, so it costs nothing
//     in the background.
//
// The footer line is not a live region on purpose: a screen reader would
// otherwise announce it every second.

const TIMER_KEY = "visit-seconds";

/**
 * Pure: "45s", "2m 05s", "1h 02m". Seconds are dropped once an hour has
 * passed, since they no longer matter at that scale.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatDuration(totalSeconds) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = function (n) { return String(n).padStart(2, "0"); };

  if (hours > 0) return hours + "h " + pad(minutes) + "m";
  if (minutes > 0) return minutes + "m " + pad(seconds) + "s";
  return seconds + "s";
}

/**
 * Pure: the same duration as an ISO 8601 value for <time datetime>, such
 * as "PT2M5S", so the number is machine readable too.
 * @param {number} totalSeconds
 * @returns {string}
 */
function isoDuration(totalSeconds) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return "PT" + (hours ? hours + "H" : "") + (minutes ? minutes + "M" : "") + seconds + "S";
}

/**
 * Pure: the saved count as a whole number of seconds, or 0 if it is
 * missing, negative or not a number (for example edited by hand).
 * @param {string|null} raw
 * @returns {number}
 */
function readSavedSeconds(raw) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

UI.init("timer", function () {
  const wrapper = document.getElementById("visit-timer");
  const output = document.getElementById("visit-time");
  if (!wrapper || !output) return;

  // Counted time is split in two: `banked` holds earlier visible spells,
  // `visibleSince` marks the start of the current one (null while hidden).
  // performance.now() is used rather than Date.now() because it never
  // jumps when the device clock is changed.
  let banked = readSavedSeconds(UI.load(TIMER_KEY, null, "session")) * 1000;
  let visibleSince = document.hidden ? null : performance.now();
  let tick = null;

  /** @returns {number} counted milliseconds so far */
  function elapsed() {
    return banked + (visibleSince === null ? 0 : performance.now() - visibleSince);
  }

  function paint() {
    const seconds = elapsed() / 1000;
    output.textContent = formatDuration(seconds);
    output.dateTime = isoDuration(seconds);
  }

  /** Schedules the next paint for the next whole second of counted time. */
  function schedule() {
    clearTimeout(tick);
    tick = setTimeout(function () {
      paint();
      schedule();
    }, 1000 - (elapsed() % 1000));
  }

  function persist() {
    UI.save(TIMER_KEY, String(Math.floor(elapsed() / 1000)), "session");
  }

  function pause() {
    if (visibleSince === null) return;
    banked += performance.now() - visibleSince;
    visibleSince = null;
    clearTimeout(tick);
    persist();
  }

  function resume() {
    if (visibleSince !== null) return;
    visibleSince = performance.now();
    paint();
    schedule();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause(); else resume();
  });
  // Saves on reload or close too. pagehide fires where unload may not,
  // including when the page goes into the back/forward cache.
  window.addEventListener("pagehide", persist);

  paint();
  if (visibleSince !== null) schedule();
  wrapper.hidden = false;
});

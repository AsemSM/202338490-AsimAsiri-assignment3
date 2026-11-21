// Shared helpers used by every feature script. Everything lives on one UI
// object so plain (non-module) scripts do not collide on top-level names.
// Sections: feature start-up, storage, timing, network requests, reduced
// motion, toasts, scroll reveal.

const UI = (function () {
  /**
   * Runs a feature's setup once the DOM is ready. Each feature registers on
   * its own, and an error is caught and logged here, so one broken feature
   * cannot stop the others from starting.
   * @param {string} name  feature name, used in the log message
   * @param {Function} setup
   */
  function init(name, setup) {
    function run() {
      try {
        setup();
      } catch (err) {
        console.error("[" + name + "] failed to start:", err);
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }

  // ---------- Storage ----------
  // Web Storage wrappers. setItem throws rather than failing quietly when
  // storage is disabled or full, and even reading window.localStorage can
  // throw when site data is blocked, so every access is guarded.
  // `area` is "local" (kept between visits, the default) or "session"
  // (kept until the tab is closed).

  /** @returns {Storage} the storage area to use; may throw */
  function storageArea(area) {
    return area === "session" ? window.sessionStorage : window.localStorage;
  }

  /** @returns {string|null} the stored value, or fallback if unreadable */
  function load(key, fallback, area) {
    try {
      const value = storageArea(area).getItem(key);
      return value === null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  /** @returns {boolean} true if the value was saved */
  function save(key, value, area) {
    try {
      storageArea(area).setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  /** @returns {boolean} true if the key was removed */
  function remove(key, area) {
    try {
      storageArea(area).removeItem(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---------- Timing ----------
  /**
   * Returns a version of fn that runs only once calls stop for `wait` ms.
   * Used by the project search so it filters when typing pauses, not on
   * every keystroke.
   * @param {Function} fn
   * @param {number} wait milliseconds
   * @returns {Function} the delayed function, with .cancel() to drop a pending call
   */
  function debounce(fn, wait) {
    let timer = null;
    function delayed() {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, wait);
    }
    delayed.cancel = function () { clearTimeout(timer); };
    return delayed;
  }

  // ---------- Network requests ----------
  // Shared by js/hijri.js and js/github.js, so both APIs fail in the same
  // well-defined ways and each feature only decides what to say.

  /**
   * A failed request. `kind` says what went wrong, so each feature can pick
   * its own message; `detail` is for the console only, never the page.
   *   offline  the device reported no connection
   *   timeout  no complete reply within the time limit
   *   network  the request never completed (blocked, DNS, dropped)
   *   http     a reply came back with an error status; see `response`
   *   data     the reply was not usable JSON, or not the expected shape
   */
  class RequestError extends Error {
    constructor(kind, detail, response) {
      super(detail || kind);
      this.name = "RequestError";
      this.kind = kind;
      this.detail = detail || kind;
      this.response = response || null;
    }
  }

  /**
   * Fetches a URL and parses the reply as JSON, rejecting only with a
   * RequestError. fetch itself does not reject on HTTP errors such as 404
   * or 500, so the status is checked here. The time limit covers reading
   * the body too, not just the first byte.
   * @param {string} url
   * @param {number} timeout milliseconds before the request is abandoned
   * @returns {Promise<*>} the parsed body
   */
  async function fetchJSON(url, timeout) {
    if (navigator.onLine === false) throw new RequestError("offline");

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new RequestError("http", "HTTP " + response.status, response);
      }
      try {
        return await response.json();
      } catch (err) {
        if (err.name === "AbortError") throw err;   // timed out mid-body
        throw new RequestError("data", "Reply was not valid JSON");
      }
    } catch (err) {
      if (err instanceof RequestError) throw err;
      if (err && err.name === "AbortError") throw new RequestError("timeout");
      // fetch rejects with a TypeError when the request never completes.
      // The connection may have dropped while it was in flight.
      if (navigator.onLine === false) throw new RequestError("offline");
      throw new RequestError("network", String(err));
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- Reduced motion ----------
  const motionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  /** @returns {boolean} true if the visitor asked the OS for less motion */
  function prefersReducedMotion() {
    return motionQuery ? motionQuery.matches : false;
  }

  // ---------- Toasts ----------
  const TOAST_LIMIT = 3;        // older toasts are dropped beyond this
  const TOAST_DURATION = 3500;  // ms on screen before it starts to leave
  const TOAST_EXIT = 200;       // ms, matches the toast-out animation in CSS

  /**
   * Shows a short message in the bottom corner, then removes it.
   * The region is a polite live region, so screen readers announce it.
   * @param {string} message
   * @param {"info"|"success"|"error"} [type]
   */
  function toast(message, type) {
    const region = document.getElementById("toast-region");
    if (!region) return;

    while (region.children.length >= TOAST_LIMIT) {
      region.firstElementChild.remove();
    }

    const item = document.createElement("p");
    item.className = "toast toast-" + (type || "info");
    item.textContent = message;
    region.appendChild(item);

    setTimeout(function () {
      item.classList.add("toast-leaving");
      setTimeout(function () { item.remove(); }, TOAST_EXIT);
    }, TOAST_DURATION);
  }

  /** Removes every toast at once, for when earlier ones no longer apply. */
  function clearToasts() {
    const region = document.getElementById("toast-region");
    if (region) region.replaceChildren();
  }

  // ---------- Scroll reveal ----------
  /**
   * Fades elements in the first time they scroll into view. Elements are
   * only hidden once this has confirmed it can show them again: without
   * IntersectionObserver, or with reduced motion on, nothing is hidden.
   *
   * Nothing is hidden until the observer's first report, which arrives
   * with every element's position. Elements already on screen then are
   * marked visible in the same step, so they never blink out and back in.
   * Reading positions from the report rather than getBoundingClientRect()
   * avoids forcing an extra layout while the page is still starting up
   * (Lighthouse flagged about 40 ms of forced reflow here).
   * @param {string} selector
   */
  function reveal(selector) {
    if (!("IntersectionObserver" in window) || prefersReducedMotion()) return;

    let firstReport = true;
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const onScreenAtLoad = firstReport && entry.boundingClientRect.top < window.innerHeight;
        if (!entry.isIntersecting && !onScreenAtLoad) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);   // once only
      });
      if (firstReport) {
        firstReport = false;
        document.documentElement.classList.add("reveal-enabled");
      }
    }, { rootMargin: "0px 0px -10% 0px" });

    document.querySelectorAll(selector).forEach(function (item) {
      observer.observe(item);
    });
  }

  init("reveal", function () { reveal("[data-reveal]"); });

  return {
    init: init,
    load: load,
    save: save,
    remove: remove,
    debounce: debounce,
    RequestError: RequestError,
    fetchJSON: fetchJSON,
    prefersReducedMotion: prefersReducedMotion,
    toast: toast,
    clearToasts: clearToasts,
    reveal: reveal
  };
})();

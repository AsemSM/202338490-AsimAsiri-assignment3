// Shared helpers used by every feature script. Everything lives on one UI
// object so plain (non-module) scripts do not collide on top-level names.
// Sections: feature start-up, storage, reduced motion, toasts, scroll reveal.

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
  // localStorage wrappers. setItem throws rather than failing quietly when
  // storage is disabled or full, so both directions are guarded.

  /** @returns {string|null} the stored value, or fallback if unreadable */
  function load(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  /** @returns {boolean} true if the value was saved */
  function save(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  /** @returns {boolean} true if the key was removed */
  function remove(key) {
    try {
      localStorage.removeItem(key);
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
   * Elements already on screen are marked visible straight away so they
   * do not blink out and back in.
   * @param {string} selector
   */
  function reveal(selector) {
    if (!("IntersectionObserver" in window) || prefersReducedMotion()) return;

    const items = document.querySelectorAll(selector);
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);   // once only
      });
    }, { rootMargin: "0px 0px -10% 0px" });

    items.forEach(function (item) {
      if (item.getBoundingClientRect().top < window.innerHeight) {
        item.classList.add("is-visible");
      } else {
        observer.observe(item);
      }
    });
    document.documentElement.classList.add("reveal-enabled");
  }

  init("reveal", function () { reveal("[data-reveal]"); });

  return {
    init: init,
    load: load,
    save: save,
    remove: remove,
    debounce: debounce,
    prefersReducedMotion: prefersReducedMotion,
    toast: toast,
    clearToasts: clearToasts,
    reveal: reveal
  };
})();

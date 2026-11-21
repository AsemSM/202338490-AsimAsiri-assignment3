// Light and dark theme toggle.
// The inline script in the <head> picks the theme before first paint: a
// saved choice if there is one, otherwise the device setting. This file
// wires the toggle button, saves the visitor's choice, and keeps following
// the device setting until the visitor picks a theme themselves.

const Theme = (function () {
  const KEY = "theme";
  const FADE = 300;   // ms, matches the .theme-fading transition in CSS
  const root = document.documentElement;

  /** @returns {"light"|"dark"} the theme currently on the page */
  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  /** @returns {"light"|"dark"} */
  function other(theme) {
    return theme === "light" ? "dark" : "light";
  }

  /**
   * Puts a theme on the page. The colour cross-fade is switched on only
   * for the moment of the change, so normal hover transitions are not
   * slowed, and it is skipped when reduced motion is on.
   * @param {"light"|"dark"} theme
   */
  function apply(theme) {
    if (!UI.prefersReducedMotion()) {
      root.classList.add("theme-fading");
      setTimeout(function () { root.classList.remove("theme-fading"); }, FADE);
    }
    root.setAttribute("data-theme", theme);
  }

  /**
   * Applies a theme and tries to remember it.
   * @param {"light"|"dark"} theme
   * @returns {boolean} true if the choice was saved
   */
  function setTheme(theme) {
    apply(theme);
    return UI.save(KEY, theme);
  }

  /** Updates the button's label to say what pressing it will do. */
  function updateButton(button) {
    const label = "Switch to " + other(current()) + " theme";
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  UI.init("theme", function () {
    const button = document.getElementById("theme-toggle");
    if (!button) return;

    // Set once the visitor presses the button, even if saving failed, so
    // the device setting stops overriding their choice for this visit.
    let chosen = UI.load(KEY, null) !== null;

    updateButton(button);
    button.hidden = false;

    button.addEventListener("click", function () {
      const next = other(current());
      const saved = setTheme(next);
      chosen = true;
      updateButton(button);

      const name = next === "light" ? "Light" : "Dark";
      if (saved) {
        UI.toast(name + " theme on.", "success");
      } else {
        UI.toast(name + " theme on, but it could not be saved. " +
                 "Your browser is blocking storage, so it resets when you reload.", "error");
      }
    });

    // Follow the device setting live until the visitor makes a choice.
    if (window.matchMedia) {
      const query = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = function (event) {
        if (chosen) return;
        apply(event.matches ? "light" : "dark");
        updateButton(button);
      };
      // addListener is the older form, for Safari before 14.
      if (query.addEventListener) query.addEventListener("change", onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  });

  return { current: current, setTheme: setTheme };
})();

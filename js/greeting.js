// Personal greeting. Picks a greeting from the visitor's local hour and,
// once they save a name, adds it: "Good evening, Sara". The name is kept in
// localStorage so it survives a reload.
//
// Exactly one of two states is on screen: the name form (no name yet) or
// the "Not Sara? Clear name" line. render() is the only place that switches
// between them, so the two can never show together.

const NAME_KEY = "visitorName";
const NAME_MAX = 32;

/**
 * Returns a greeting for the given hour (0-23).
 * @param {number} hour
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Cleans a typed name: trims the ends and collapses inner runs of spaces.
 * @param {string} raw
 * @returns {string}
 */
function cleanName(raw) {
  return String(raw).trim().replace(/\s+/g, " ");
}

/**
 * Checks a cleaned name. Pure, no DOM, so it is easy to reason about.
 * @param {string} name already cleaned
 * @returns {string} an error message, or "" if the name is fine
 */
function validateName(name) {
  if (name === "") return "Please enter your name.";
  if (name.length > NAME_MAX) {
    return "Keep it to " + NAME_MAX + " characters or fewer (this is " + name.length + ").";
  }
  return "";
}

UI.init("greeting", function () {
  const greetingEl = document.getElementById("greeting");
  // If the element is missing, the HTML fallback text ("Hello") stays.
  if (!greetingEl) return;

  const form = document.getElementById("visitor-form");
  const input = document.getElementById("visitor-name");
  const error = document.getElementById("visitor-name-error");
  const saved = document.getElementById("visitor-saved");
  const savedName = document.getElementById("visitor-saved-name");
  const clearButton = document.getElementById("visitor-clear");

  // The name in use this visit. Kept here as well as in storage, so the
  // greeting still works when storage is blocked.
  let name = "";

  // A stored value is checked again, in case it was edited by hand.
  const stored = cleanName(UI.load(NAME_KEY, ""));
  if (validateName(stored) === "") name = stored;

  function render() {
    const hello = getGreeting(new Date().getHours());
    // textContent, never innerHTML: a typed "<b>" shows as text.
    greetingEl.textContent = name ? hello + ", " + name : hello;

    if (!form || !saved) return;   // greeting alone still works
    form.hidden = Boolean(name);
    saved.hidden = !name;
    savedName.textContent = name;
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    input.setAttribute("aria-invalid", "true");
  }

  function clearError() {
    error.textContent = "";
    error.hidden = true;
    input.removeAttribute("aria-invalid");
  }

  render();
  if (!form || !saved) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const candidate = cleanName(input.value);
    const problem = validateName(candidate);
    if (problem) {
      showError(problem);
      input.focus();
      return;
    }

    clearError();
    name = candidate;
    input.value = "";
    render();
    // Focus moves to the Clear button, since the input just disappeared.
    clearButton.focus();

    if (UI.save(NAME_KEY, name)) {
      UI.toast("Saved. Hi, " + name + ".", "success");
    } else {
      UI.toast("Hi, " + name + ". Your browser is blocking storage, " +
               "so your name won't be remembered after this visit.", "error");
    }
  });

  // The error clears as soon as the visitor starts fixing it.
  input.addEventListener("input", function () {
    if (!error.hidden) clearError();
  });

  clearButton.addEventListener("click", function () {
    name = "";
    render();
    input.focus();

    if (UI.remove(NAME_KEY)) {
      UI.toast("Name cleared.", "success");
    } else {
      UI.toast("Name cleared for this visit, but your browser is blocking " +
               "storage, so a saved name may come back after a reload.", "error");
    }
  });
});

// Contact form validation. Front end only: nothing is sent anywhere.
//
// validateContact() is pure: it takes the three values and returns a map of
// field name to message, with no DOM access. The UI.init block below is the
// only part that touches the page, so the rules can be read and checked on
// their own.

const MESSAGE_MIN = 10;

// Deliberately loose: something@something.something, no spaces. Real
// checking can only happen by sending an email, which this demo does not do.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Checks the contact form values.
 * @param {{name: string, email: string, message: string}} values
 * @returns {Object<string, string>} field name to error message; empty if valid
 */
function validateContact(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (name === "") errors.name = "Please enter your name.";

  if (email === "") errors.email = "Please enter your email address.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "That doesn't look like an email address. Check it has an @ and a domain, like name@example.com.";

  if (message === "") errors.message = "Please write a message.";
  else if (message.length < MESSAGE_MIN) {
    errors.message = "Your message needs at least " + MESSAGE_MIN + " characters (it has " + message.length + ").";
  }

  return errors;
}

/** The first word of a name, for "Thanks, Sara." */
function firstName(name) {
  return name.trim().split(/\s+/)[0];
}

UI.init("contact", function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const FIELDS = ["name", "email", "message"];   // also the order focus checks
  const success = document.getElementById("contact-success");
  const successTitle = document.getElementById("contact-success-title");

  function setFieldError(field, message) {
    const input = form.elements[field];
    const error = document.getElementById(field + "-error");
    if (message) {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute("aria-invalid", "true");
    } else {
      error.textContent = "";
      error.hidden = true;
      input.removeAttribute("aria-invalid");
    }
  }

  /** Shows the given errors and clears every field not in the map. */
  function showErrors(errors) {
    FIELDS.forEach(function (field) { setFieldError(field, errors[field] || ""); });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const values = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      message: form.elements.message.value
    };
    const errors = validateContact(values);
    const wrong = FIELDS.filter(function (field) { return errors[field]; });

    showErrors(errors);
    // A count from an earlier attempt would now be wrong.
    UI.clearToasts();

    if (wrong.length > 0) {
      // A confirmation from an earlier send no longer applies.
      success.hidden = true;
      form.elements[wrong[0]].focus();
      UI.toast(wrong.length === 1
        ? "1 field needs fixing."
        : wrong.length + " fields need fixing.", "error");
      return;
    }

    successTitle.textContent = "Thanks, " + firstName(values.name) + ".";
    form.reset();
    showErrors({});
    // Re-shown each time, so the entrance animation plays again.
    success.hidden = true;
    void success.offsetWidth;
    success.hidden = false;
    // The focused button is still there, but moving focus to the message
    // makes screen readers read it and shows keyboard users where it is.
    success.focus();
  });

  // Each field's error clears as soon as the visitor edits that field.
  FIELDS.forEach(function (field) {
    form.elements[field].addEventListener("input", function () {
      if (form.elements[field].hasAttribute("aria-invalid")) setFieldError(field, "");
    });
  });
});

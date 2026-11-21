// My public GitHub repositories, fetched live from the GitHub REST API
// (https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user).
// No key or token: the endpoint is public, allows cross-origin requests and
// works from file://. The catch is a limit of 60 requests an hour for each
// network, so replies are kept in localStorage and reused for 10 minutes.
//
// Loading follows four steps:
//   1. A saved copy under 10 minutes old is shown, with no request at all.
//   2. Otherwise GitHub is asked. On success the saved copy is replaced.
//   3. If that fails and an older saved copy exists, the copy is shown with
//      a warning saying how old it is and why it could not be refreshed.
//   4. With nothing saved, the error is shown with a Try again button.
// Pressing Refresh skips step 1.
//
// The panel has three states, loading, result and error, and setState() is
// the only code that shows or hides them, so exactly one is visible.
// Cards are built with createElement and textContent, never innerHTML.

const GITHUB_USER = "AsemSM";
const GITHUB_API = "https://api.github.com/users/" + GITHUB_USER + "/repos?per_page=100&sort=pushed";
const GITHUB_TIMEOUT = 8000;              // ms before the request is abandoned
const GITHUB_CACHE_KEY = "github-repos";
const GITHUB_CACHE_TTL = 10 * 60 * 1000;  // ms a saved copy counts as fresh

// Messages for each kind of failure. Most keys are UI.RequestError kinds;
// "ratelimit" and "notfound" are read from the HTTP reply by describeFailure.
const GITHUB_MESSAGES = {
  offline: "Your device is offline. Connect to the internet, then try again.",
  timeout: "GitHub took more than 8 seconds to answer. Try again in a moment.",
  network: "GitHub could not be reached. Check your connection, or a network filter may be blocking it.",
  ratelimit: "GitHub allows 60 requests an hour from one network without signing in, and that limit has been reached.",
  notfound: "The GitHub account could not be found.",
  http: "GitHub had a problem on its side. Try again in a moment.",
  data: "GitHub sent back a reply this page could not read."
};

// ---------- Reading the reply ----------

/**
 * Keeps only the fields the page uses from one repository, under GitHub's
 * own names. Returns null for anything unusable. The output is valid input,
 * so the same check runs on live replies and on saved copies, which are
 * stored in this shape. The link must point at github.com, so a tampered
 * saved copy cannot turn a card into a javascript: link.
 * @returns {object|null}
 */
function toRepo(raw) {
  if (!raw || typeof raw.name !== "string" || raw.name === "") return null;
  if (typeof raw.html_url !== "string" || raw.html_url.indexOf("https://github.com/") !== 0) return null;

  const pushed = new Date(raw.pushed_at || raw.updated_at);
  if (isNaN(pushed.getTime())) return null;

  return {
    name: raw.name,
    html_url: raw.html_url,
    description: typeof raw.description === "string" ? raw.description : "",
    language: typeof raw.language === "string" ? raw.language : "",
    stargazers_count: Number(raw.stargazers_count) || 0,
    fork: raw.fork === true,
    pushed_at: pushed.toISOString()
  };
}

/**
 * Pure: the repositories to show, most recently pushed first, ties by name.
 * Used for API replies and saved copies alike (see toRepo).
 * @param {*} list
 * @returns {object[]}
 */
function readRepos(list) {
  if (!Array.isArray(list)) throw new UI.RequestError("data", "Reply is not a list");
  return list
    .map(toRepo)
    .filter(Boolean)
    .sort(function (a, b) {
      return b.pushed_at.localeCompare(a.pushed_at) || a.name.localeCompare(b.name);
    });
}

/**
 * The message for a failed request. A 403 or 429 with no requests left is
 * GitHub's rate limit; its reset time comes from a response header, which
 * GitHub exposes to cross-origin pages.
 * @param {UI.RequestError} err
 * @returns {string}
 */
function describeFailure(err) {
  const response = err.response;
  if (err.kind === "http" && response) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if ((response.status === 403 || response.status === 429) && remaining === "0") {
      const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
      const when = reset > Date.now()
        ? " Try again after " + new Date(reset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "."
        : " Try again in a few minutes.";
      return GITHUB_MESSAGES.ratelimit + when;
    }
    if (response.status === 404) return GITHUB_MESSAGES.notfound;
  }
  return GITHUB_MESSAGES[err.kind] || GITHUB_MESSAGES.network;
}

// ---------- Dates ----------

// Largest unit first. A month counts as 30 days; close enough for "3
// months ago".
const RELATIVE_UNITS = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60]
];
const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Pure: "3 weeks ago", "yesterday", "just now". A date in the future, from
 * a wrong device clock, is treated as now.
 * @param {Date} date
 * @param {Date} now
 * @returns {string}
 */
function relativeTime(date, now) {
  const seconds = Math.min(0, Math.round((date - now) / 1000));
  for (const [unit, size] of RELATIVE_UNITS) {
    if (-seconds >= size) return relativeFormat.format(Math.trunc(seconds / size), unit);
  }
  return "just now";
}

// ---------- Saved copy ----------

/** @returns {{savedAt: number, repos: object[]}|null} the saved copy, if readable */
function readCache() {
  const raw = UI.load(GITHUB_CACHE_KEY, null);
  if (raw === null) return null;
  try {
    const cache = JSON.parse(raw);
    if (cache && typeof cache.savedAt === "number") {
      const repos = readRepos(cache.repos);
      // Entries were saved but none survived the check: the copy is broken
      // (or from an older version of this page), not an empty account.
      if (repos.length > 0 || cache.repos.length === 0) {
        return { savedAt: cache.savedAt, repos: repos };
      }
    }
  } catch (err) {
    // Falls through: a broken copy is treated as no copy.
  }
  console.warn("[github] Ignored an unreadable saved copy");
  return null;
}

/** Saves the list. Failing to save is harmless: the next visit asks again. */
function writeCache(repos, savedAt) {
  UI.save(GITHUB_CACHE_KEY, JSON.stringify({ savedAt: savedAt, repos: repos }));
}

/**
 * Pure: is a copy saved at `savedAt` still fresh at `now`? A time in the
 * future means the device clock changed, so the copy is not trusted.
 */
function isFresh(savedAt, now) {
  const age = now - savedAt;
  return age >= 0 && age < GITHUB_CACHE_TTL;
}

// ---------- Cards ----------

// Cards enter one after another, like the project cards. Own constant, not
// the one in js/projects.js, so this file works even if that one fails.
const REPO_STAGGER_CAP = 8;

/**
 * Builds the card for one repository. The whole card is clickable through
 * the title link, which CSS stretches over it.
 * @returns {HTMLElement}
 */
function buildRepoCard(repo, index, now) {
  const card = document.createElement("li");
  card.className = "repo";
  card.style.setProperty("--i", Math.min(index, REPO_STAGGER_CAP));

  const title = document.createElement("h3");
  const link = document.createElement("a");
  link.href = repo.html_url;
  link.textContent = repo.name;
  title.appendChild(link);
  if (repo.fork) {
    const badge = document.createElement("span");
    badge.className = "repo-badge";
    badge.textContent = "Fork";
    title.append(" ", badge);
  }

  const desc = document.createElement("p");
  desc.className = "repo-desc";
  if (repo.description) {
    desc.textContent = repo.description;
  } else {
    desc.textContent = "No description on GitHub.";
    desc.classList.add("is-empty");
  }

  const meta = document.createElement("p");
  meta.className = "repo-meta";
  const parts = [];
  if (repo.language) parts.push(repo.language);
  const stars = repo.stargazers_count;
  if (stars > 0) parts.push(stars + (stars === 1 ? " star" : " stars"));
  meta.textContent = parts.length ? parts.join(" · ") + " · " : "";

  const pushed = new Date(repo.pushed_at);
  const time = document.createElement("time");
  time.dateTime = repo.pushed_at;
  time.title = pushed.toLocaleString();
  time.textContent = "Updated " + relativeTime(pushed, now);
  meta.appendChild(time);

  card.append(title, desc, meta);
  return card;
}

// ---------- Panel ----------

UI.init("github", function () {
  const panel = document.getElementById("github-panel");
  if (!panel) return;

  // The script is running, so the "needs JavaScript" text no longer applies.
  const fallback = document.getElementById("github-fallback");
  if (fallback) fallback.hidden = true;

  const states = {
    loading: document.getElementById("github-loading"),
    result: document.getElementById("github-result"),
    error: document.getElementById("github-error")
  };
  const list = document.getElementById("github-list");
  const count = document.getElementById("github-count");
  const source = document.getElementById("github-source");
  const errorMessage = document.getElementById("github-error-message");
  const refresh = document.getElementById("github-refresh");
  const retry = document.getElementById("github-retry");

  /** Shows one state and hides the other two. */
  function setState(name) {
    Object.keys(states).forEach(function (key) {
      states[key].hidden = key !== name;
    });
    panel.setAttribute("aria-busy", String(name === "loading"));
  }

  /**
   * Shows a list of repositories with a line saying where it came from.
   * @param {object[]} repos
   * @param {string} sourceText
   * @param {boolean} warn true when the list is an old copy shown because
   *   GitHub failed, which styles the line as a warning
   */
  function showResult(repos, sourceText, warn) {
    const now = new Date();
    if (repos.length === 0) {
      const empty = document.createElement("li");
      empty.className = "repo-empty";
      empty.textContent = "There are no public repositories on this account yet.";
      list.replaceChildren(empty);
    } else {
      list.replaceChildren.apply(list, repos.map(function (repo, index) {
        return buildRepoCard(repo, index, now);
      }));
    }
    count.textContent = repos.length + (repos.length === 1 ? " public repository" : " public repositories");
    source.textContent = sourceText;
    source.classList.toggle("is-warning", warn);
    setState("result");
  }

  function savedCopyText(savedAt) {
    return "Saved copy from " + relativeTime(new Date(savedAt), new Date()) + ".";
  }

  /**
   * Runs the four loading steps described at the top of this file.
   * `force` skips the fresh saved copy (Refresh and Try again).
   * `moveFocus` is set when a button started the load: the button
   * disappears with its state, so focus goes to the new state's button.
   */
  async function load(force, moveFocus) {
    const cache = readCache();

    // Step 1: a fresh saved copy, no request.
    if (!force && cache && isFresh(cache.savedAt, Date.now())) {
      showResult(cache.repos, savedCopyText(cache.savedAt) + " Press Refresh to check GitHub again.", false);
      return;
    }

    setState("loading");
    try {
      // Step 2: ask GitHub and replace the saved copy.
      const repos = readRepos(await UI.fetchJSON(GITHUB_API, GITHUB_TIMEOUT));
      writeCache(repos, Date.now());
      showResult(repos, "Live from GitHub, checked just now.", false);
      if (moveFocus) refresh.focus();
    } catch (err) {
      const failure = err instanceof UI.RequestError ? err : new UI.RequestError("data", String(err));
      console.warn("[github] " + failure.detail);

      if (cache) {
        // Step 3: an old copy is better than nothing, as long as it says so.
        showResult(cache.repos, savedCopyText(cache.savedAt) + " It could not be updated: " + describeFailure(failure), true);
        if (moveFocus) refresh.focus();
      } else {
        // Step 4: nothing to show.
        errorMessage.textContent = describeFailure(failure);
        setState("error");
        if (moveFocus) retry.focus();
      }
    }
  }

  refresh.addEventListener("click", function () { load(true, true); });
  retry.addEventListener("click", function () { load(true, true); });

  load(false, false);
});

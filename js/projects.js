// Project cards with live search, topic filters and sorting.
//
// The visible list is always derived from one state object (topic, query,
// sort). Every control writes to that object and calls render(), so the
// three combine correctly without knowing about each other.
//
// Cards are built with createElement and textContent, never innerHTML, so
// project text and the visitor's search never reach the HTML parser.

const SEARCH_DELAY = 180;   // ms of no typing before the search runs
const ALL_TOPICS = "All";

/**
 * Lower-cases and collapses spaces, so "  React   Native " matches
 * "react native".
 * @param {string} text
 * @returns {string}
 */
function normalise(text) {
  return String(text).toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Checks one entry from PROJECTS has every field the page uses.
 * @returns {boolean}
 */
function isValidProject(project) {
  return Boolean(project) &&
    typeof project.name === "string" && project.name !== "" &&
    typeof project.description === "string" &&
    typeof project.year === "number" &&
    Array.isArray(project.tags) &&
    Array.isArray(project.topics);
}

/**
 * The text a project is searched by: names, description and technologies.
 * @returns {string} normalised
 */
function searchText(project) {
  const parts = [project.name, project.description].concat(project.tags);
  if (project.nameNative) parts.push(project.nameNative.text);
  return normalise(parts.join(" "));
}

const SORTERS = {
  // Array order in js/data.js is the featured order.
  featured: function () { return 0; },
  newest: function (a, b) {
    return b.year - a.year || a.name.localeCompare(b.name);
  },
  alphabetical: function (a, b) { return a.name.localeCompare(b.name); }
};

/**
 * Pure: which projects to show, in which order, for a given state.
 * Every word of the query must appear somewhere in the project's text.
 * @param {object[]} projects
 * @param {{topic: string, query: string, sort: string}} state
 * @returns {object[]} a new array
 */
function visibleProjects(projects, state) {
  const words = normalise(state.query).split(" ").filter(Boolean);
  const sorter = SORTERS[state.sort] || SORTERS.featured;

  return projects
    .filter(function (project) {
      if (state.topic !== ALL_TOPICS && project.topics.indexOf(state.topic) === -1) return false;
      const text = searchText(project);
      return words.every(function (word) { return text.indexOf(word) !== -1; });
    })
    // Array.prototype.sort is stable, so "featured" keeps data order.
    .sort(sorter);
}

// Cards enter one after another; past this many they all share the last
// delay, so a long list never keeps the visitor waiting.
const STAGGER_CAP = 8;

/**
 * Builds the card element for one project.
 * @param {object} project an entry from PROJECTS
 * @param {number} index position in the visible list, for the entrance delay
 * @returns {HTMLElement}
 */
function buildProjectCard(project, index) {
  const card = document.createElement("article");
  card.className = "project";
  // Read by the card-in animation delay in css/styles.css.
  card.style.setProperty("--i", Math.min(index || 0, STAGGER_CAP));

  const top = document.createElement("div");
  top.className = "project-top";

  // Event first, then the result.
  const meta = document.createElement("p");
  meta.className = "project-meta";
  meta.textContent = [project.event, project.result].filter(Boolean).join(" · ");

  const year = document.createElement("p");
  year.className = "project-year";
  year.textContent = project.year;

  top.append(meta, year);

  const title = document.createElement("h3");
  title.textContent = project.name;
  if (project.nameNative) {
    const native = document.createElement("span");
    native.lang = project.nameNative.lang;
    native.dir = "rtl";
    native.textContent = "(" + project.nameNative.text + ")";
    title.append(" ", native);
  }

  const desc = document.createElement("p");
  desc.className = "project-desc";
  desc.textContent = project.description;

  const chips = document.createElement("ul");
  chips.className = "chips";
  chips.setAttribute("aria-label", "Technologies");
  project.tags.forEach(function (tag) {
    const chip = document.createElement("li");
    chip.textContent = tag;
    chips.appendChild(chip);
  });

  card.append(top, title, desc, chips);
  return card;
}

/**
 * Replaces the grid with an error message. Used when there is no usable
 * project data, so the visitor sees why instead of an empty section.
 */
function showProjectsError(grid, message) {
  const notice = document.createElement("p");
  notice.className = "notice notice-error";
  notice.setAttribute("role", "alert");
  notice.textContent = message;
  grid.replaceWith(notice);
}

UI.init("projects", function () {
  const grid = document.getElementById("project-grid");
  if (!grid) return;

  // ---------- Data checks ----------
  if (typeof PROJECTS === "undefined" || !Array.isArray(PROJECTS)) {
    console.error("[projects] PROJECTS is missing. Check that js/data.js loads before js/projects.js and has no syntax errors.");
    showProjectsError(grid, "The project list could not be loaded. Please refresh the page. " +
      "If it keeps happening, my CV has the main projects.");
    return;
  }

  // Bad entries are skipped and reported, so one typo does not hide the rest.
  const projects = PROJECTS.filter(function (project, index) {
    if (isValidProject(project)) return true;
    console.warn("[projects] Skipped entry " + index + " in js/data.js: it is missing a name, description, year, tags or topics.", project);
    return false;
  });

  if (projects.length === 0) {
    showProjectsError(grid, "There are no projects to show right now. Please check back later.");
    return;
  }

  const controls = document.getElementById("project-controls");
  const search = document.getElementById("project-search");
  const clearSearch = document.getElementById("project-search-clear");
  const sortSelect = document.getElementById("project-sort");
  const filterGroup = document.getElementById("project-filters");
  const count = document.getElementById("project-count");
  const empty = document.getElementById("project-empty");
  const emptyMessage = document.getElementById("project-empty-message");
  const reset = document.getElementById("project-reset");

  // Seeded from the controls, since a browser may restore their values on
  // reload, so the list always matches what the controls show.
  const state = {
    topic: ALL_TOPICS,
    query: search.value,
    sort: SORTERS[sortSelect.value] ? sortSelect.value : "featured"
  };

  // ---------- Filter buttons, generated from the data ----------
  // Only topics that at least one valid project uses, in PROJECT_TOPICS order.
  const topicOrder = typeof PROJECT_TOPICS !== "undefined" && Array.isArray(PROJECT_TOPICS) ? PROJECT_TOPICS : [];
  const usedTopics = topicOrder.filter(function (topic) {
    return projects.some(function (project) { return project.topics.indexOf(topic) !== -1; });
  });

  const filterButtons = [ALL_TOPICS].concat(usedTopics).map(function (topic) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.textContent = topic;
    button.dataset.topic = topic;
    button.setAttribute("aria-pressed", String(topic === state.topic));
    filterGroup.appendChild(button);
    return button;
  });

  // ---------- Render ----------
  function render() {
    const list = visibleProjects(projects, state);

    grid.replaceChildren.apply(grid, list.map(buildProjectCard));
    grid.hidden = list.length === 0;

    count.textContent = "Showing " + list.length + " of " + projects.length +
      (projects.length === 1 ? " project" : " projects");

    filterButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.topic === state.topic));
    });

    clearSearch.hidden = search.value === "";

    empty.hidden = list.length !== 0;
    if (list.length === 0) {
      const where = state.topic === ALL_TOPICS ? "" : " in " + state.topic;
      emptyMessage.textContent = state.query.trim()
        ? "No projects match “" + state.query.trim() + "”" + where + "."
        : "No projects" + where + " yet.";
    }
  }

  // ---------- Controls ----------
  const runSearch = UI.debounce(function () {
    state.query = search.value;
    render();
  }, SEARCH_DELAY);

  function clearQuery() {
    runSearch.cancel();
    search.value = "";
    state.query = "";
  }

  search.addEventListener("input", function () {
    // The clear button reacts at once; the filtering waits for a pause.
    clearSearch.hidden = search.value === "";
    runSearch();
  });

  search.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || search.value === "") return;
    // Stops the browser's own clear, so the list updates through render().
    event.preventDefault();
    clearQuery();
    render();
  });

  clearSearch.addEventListener("click", function () {
    clearQuery();
    render();
    search.focus();
  });

  filterGroup.addEventListener("click", function (event) {
    const button = event.target.closest(".filter-button");
    if (!button) return;
    state.topic = button.dataset.topic;
    render();
  });

  sortSelect.addEventListener("change", function () {
    state.sort = sortSelect.value;
    render();
  });

  reset.addEventListener("click", function () {
    clearQuery();
    state.topic = ALL_TOPICS;
    render();
    search.focus();
  });

  render();
  controls.hidden = false;
});

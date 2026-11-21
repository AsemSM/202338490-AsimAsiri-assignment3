# Technical Documentation

SWE 363 Assignment 3, Asim Asiri. How the portfolio is built and why. For setup and a feature walkthrough, see the [README](../README.md).

## 1. Overview

A single page: header, hero, Skills, Projects, GitHub, Today, Contact and footer. Plain HTML, CSS and JavaScript, about 3,400 lines across eleven files. No frameworks, no libraries, no build step.

The main constraint: the page must work when `index.html` is opened straight from disk (`file://`). Several decisions below come from that.

Assignment 3 added:

- A GitHub section with live data from the GitHub REST API, a 10-minute cache and rate-limit handling (`js/github.js`).
- A shared request function used by both APIs (`UI.fetchJSON` in `js/ui.js`).
- A visit timer (`js/timer.js`).
- A performance pass measured with Lighthouse.

## 2. Architecture

### Separate plain scripts, not modules

The JavaScript is split into nine files with one job each:

| File | Lines | Job |
| --- | --- | --- |
| `js/data.js` | 124 | `PROJECTS` (9 entries) and `PROJECT_TOPICS` (filter order) |
| `js/ui.js` | 249 | Shared helpers on one `UI` object: `init`, `load`, `save`, `remove`, `debounce`, `RequestError`, `fetchJSON`, `prefersReducedMotion`, `toast`, `clearToasts`, `reveal` |
| `js/theme.js` | 94 | Theme toggle, saving the choice, following the device setting |
| `js/greeting.js` | 133 | Time-based greeting, visitor name form and saved-name line |
| `js/projects.js` | 283 | Project cards, search, filters, sorting, count, empty and error states |
| `js/contact.js` | 113 | Contact form validation and confirmation |
| `js/github.js` | 328 | GitHub repositories: loading rules, cache, rate limit, cards |
| `js/hijri.js` | 139 | Hijri date: reply check, display, three-state panel |
| `js/timer.js` | 124 | Time on this page |

They are loaded as plain `<script defer>` tags at the end of `index.html`, in the order above. `defer` keeps that order and runs them after the HTML is parsed.

**Why not ES modules:** browsers block module scripts on `file://` because of CORS. Using modules would mean the page only works behind a server.

**Why data is a `.js` file:** fetching a local `.json` file is blocked on `file://` for the same reason. So the project list is a JavaScript array.

**Cost of plain scripts:** every top-level name is shared across files. To keep that manageable, all shared helpers live on the single `UI` object, and each feature file uses its own prefix for constants (`GITHUB_*`, `HIJRI_*`, `TIMER_*`). `github.js` deliberately has its own `REPO_STAGGER_CAP` rather than reading `STAGGER_CAP` from `projects.js`, so it does not break if that file fails to load.

### One feature cannot stop another

Each feature registers its setup through `UI.init(name, setup)`. That runs the setup on `DOMContentLoaded` inside a `try/catch` and logs `[name] failed to start` if it throws. A syntax error in one file only stops that file's own `<script>` element. So a broken feature never stops the others.

### Fallbacks in the HTML

Anything that needs JavaScript starts in a safe state in the HTML:

- The project grid, the GitHub panel and the Today panel each contain a "needs JavaScript" message. Their script hides or replaces it when it starts. This covers JavaScript being off and also one script failing to load, which `<noscript>` would not cover.
- The theme toggle, name form, project controls, the timer line and all GitHub and Hijri states start with the `hidden` attribute. Their script reveals them, so no dead button or half-built panel ever shows.
- `[hidden] { display: none !important; }` makes sure `hidden` always wins. Without `!important`, a component rule such as `display: flex` would beat the browser's default rule and show a hidden element.

## 3. State management

Every piece of state has one owner and one function that updates the page from it.

| State | Where it lives | Lifetime | Owner |
| --- | --- | --- | --- |
| Theme choice | `localStorage` `theme`, plus a variable | Across visits | `js/theme.js`, and the inline script in `<head>` before first paint |
| Visitor name | `localStorage` `visitorName`, plus a variable | Across visits | `js/greeting.js` |
| GitHub repositories | `localStorage` `github-repos`: `{ savedAt, repos }` | Fresh for 10 minutes, kept as a fallback after that | `js/github.js` |
| Time on this page | `sessionStorage` `visit-seconds`, plus two variables | Until the tab is closed | `js/timer.js` |
| Project view (topic, query, sort) | One `state` object | The visit | `js/projects.js` |
| Which panel state shows | The `hidden` attribute, changed only by `setState()` | The visit | `js/github.js`, `js/hijri.js` |

**Storage that fails.** Every read and write goes through `UI.load`, `UI.save` and `UI.remove`, which catch exceptions. `setItem` throws instead of failing quietly when storage is disabled or full, and in some browsers even reading `window.localStorage` throws when site data is blocked. Since Assignment 3 these helpers take an optional area, `"local"` (the default) or `"session"`, so the timer uses the same guarded code as the rest. Each feature also keeps its value in a variable, so it works for the visit even when nothing can be saved.

**Values are checked when read back.** A saved name is validated again on load. A saved GitHub copy goes through the same check as a live reply. A saved visit time that is negative or not a number counts as zero. So a value edited by hand, or written by an older version of the page, cannot break anything.

### Projects

```js
const state = { topic: "All", query: "", sort: "featured" };
```

Every control writes to `state` and calls `render()`. `render()` calls `visibleProjects(projects, state)`, a pure function that filters and sorts, then rebuilds the grid, the count, the filter buttons' `aria-pressed`, the clear button and the empty state. Because nothing else changes the page, search, filter and sort always combine correctly.

- **Search** matches every word of the query against the name, the Arabic name, the description and the technologies. It is case-insensitive and ignores extra spaces. It waits 180 ms after typing stops (`UI.debounce`).
- **Sorting:** Featured keeps the array order, which relies on `Array.prototype.sort` being stable. Newest sorts by year, then by name. A to Z sorts by name.
- **Filter buttons** are generated from `PROJECT_TOPICS`, keeping only topics that at least one project uses.

### Greeting

Two mutually exclusive states: the name form, or the "Not Sara? Clear name" line. Only `render()` in `greeting.js` changes them, always as a pair. `cleanName()` (trim and collapse spaces) runs before `validateName()` (empty, or over 32 characters).

### Contact form

`validateContact(values)` is pure. It takes the three values and returns a map of field name to error message, with no DOM access. Only after it returns an empty map is the confirmation shown.

### Rendering safely

Every piece of text that comes from data, the visitor or an API is written with `textContent` and `createElement`, never `innerHTML`. Repository names and descriptions from GitHub never reach the HTML parser. Repository links must start with `https://github.com/`, so a tampered saved copy cannot turn a card into a `javascript:` link. This was tested by saving such a copy by hand: it was rejected.

## 4. The request layer

Both APIs go through one function, `UI.fetchJSON(url, timeout)` in `js/ui.js`. In Assignment 2 the Hijri script had its own copy of this logic. Moving it into one place means the two APIs fail in exactly the same ways, and each feature only decides what to say.

`fetchJSON` is an `async` function. It resolves with the parsed body or rejects with a `UI.RequestError`, a class extending `Error` with a `kind`, a `detail` for the console, and the `response` when there was one.

| Kind | How it is detected |
| --- | --- |
| offline | `navigator.onLine` is false before the request, or after a failed one |
| timeout | An `AbortController` aborts the request after the given time. The timer covers reading the body, not just the first byte |
| network | `fetch` rejects with a `TypeError`: blocked, DNS failure, connection dropped |
| http | `response.ok` is false. `fetch` does not reject on a 404 or 500, so this is checked explicitly. The response is kept on the error so the caller can read its status and headers |
| data | The body is not valid JSON |

Each feature then adds its own checks on the shape of the reply, and throws a `data` error if something is missing. Browser strings such as "Failed to fetch" go to `console.warn` only and never reach the page.

## 5. Design

The Assignment 1 design is kept: a cool blue-black background with one warm amber accent, hairline dividers instead of boxes, and a two-column band for each section.

All colours, spacing and radii are custom properties in the first section of `css/styles.css`. `css/styles.css` is split into 16 numbered sections with a contents list at the top. Section 11, previously "Today", is now "API panels": the loading, result and error state rules (`.panel-state`, `.panel-loading`, `.panel-error`, `.panel-note`) are shared by GitHub and Today instead of being written twice.

Repository cards reuse the project card treatment: the same surface, the same lift, amber border and shadow on hover, and the same staggered entrance.

## 6. Features

### 6.1 Themes

Dark values are on `:root`. Light values are on `:root[data-theme="light"]`. A small inline script in the `<head>`, before the stylesheet, sets `data-theme` from the saved choice or, if there is none, the device setting, so the first paint already uses the right theme. `theme.js` keeps following live device changes until the visitor presses the toggle.

### 6.2 GitHub repositories

`js/github.js` requests `https://api.github.com/users/AsemSM/repos?per_page=100&sort=pushed`. The endpoint is public, needs no key or token, and allows any origin, so it works from `file://`. No secret is involved anywhere.

**The catch is the rate limit.** Without signing in, GitHub allows 60 requests an hour from one network. A visitor who reloads a few times, or several visitors on one campus network, could reach it. So replies are saved, and loading follows four steps:

1. A saved copy under 10 minutes old is shown, with no request at all.
2. Otherwise GitHub is asked. On success the saved copy is replaced.
3. If that fails and an older saved copy exists, the copy is shown with a warning saying how old it is and why it could not be refreshed. An old list is more useful than an error.
4. With nothing saved, the error is shown with a Try again button.

Refresh and Try again skip step 1. A saved time in the future (the device clock was changed) does not count as fresh.

**Reading the reply.** `toRepo()` keeps only the seven fields the page uses, under GitHub's own names: `name`, `html_url`, `description`, `language`, `stargazers_count`, `fork` and `pushed_at`. It returns `null` for anything unusable. Its output is valid input to itself, so the same check runs on live replies and on saved copies. If a saved copy had entries but none survive the check, it is treated as broken rather than as an empty account. `readRepos()` then sorts by last push, newest first, with ties by name.

**Failures.** The request kinds from section 4 are mapped to messages, with two more read from the HTTP reply:

| Case | How it is detected | Message shown |
| --- | --- | --- |
| Rate limit | Status 403 or 429 and the `x-ratelimit-remaining` header is `"0"`. GitHub exposes this header to cross-origin pages | GitHub allows 60 requests an hour from one network without signing in, and that limit has been reached. Try again after 07:55 PM. (The time comes from the `x-ratelimit-reset` header, in the visitor's own format) |
| Account not found | Status 404 | The GitHub account could not be found. |
| Other HTTP error | Any other status that is not OK, including a 403 that is not the rate limit | GitHub had a problem on its side. Try again in a moment. |
| offline, timeout, network | From `fetchJSON` | Each has its own message, as in the Hijri panel |
| data | Not JSON, or not a list | GitHub sent back a reply this page could not read. |

**Cards.** Each repository is a card with its name as a link, a "Fork" badge if it is a fork, the description (or "No description on GitHub." in italics), the language, stars if any, and "Updated 3 weeks ago". The date is a `<time>` element with the exact timestamp in `datetime` and in a tooltip. The relative wording comes from `relativeTime()`, a pure function using `Intl.RelativeTimeFormat`, so it reads "yesterday", "last week" and "just now" naturally. Long descriptions stop after four lines. The title link is stretched over the whole card with a `::after` layer, so the card is one large target while the page still has a single link per repository. The keyboard focus ring is drawn on that layer, so it outlines the whole card.

The grid has two columns, one on phones. An odd last card spans the row.

**How it was tested.** In Chromium through Playwright, `window.fetch` was replaced with fake versions and Refresh was pressed, first with a saved copy present and then with none. Each case showed the right message: rate limit with the reset time, a 403 that is not the rate limit, 404, 500, a reply that is not JSON, a reply that is not a list, a rejected request, offline, and a request that never answers, which timed out at 8.03 seconds. With a saved copy, every failure showed the copy with the warning instead. Try again recovered each time, with focus on the new state's button. A saved copy 5 minutes old loaded with zero requests to `api.github.com`. A copy 2 hours old with GitHub failing read "Saved copy from 2 hours ago. It could not be updated: ...". "Failed to fetch" never appeared on the page.

### 6.3 Hijri date

`js/hijri.js` calls `https://api.aladhan.com/v1/gToH/DD-MM-YYYY` with the visitor's date, now through `UI.fetchJSON`.

- **Local date, not UTC.** The date is built from `getDate()`, `getMonth()` and `getFullYear()`. `toISOString()` would give the previous day between midnight and 3 am in Saudi Arabia.
- **Display.** English line, Arabic line with `lang="ar"` and `dir="rtl"` and Arabic-Indic digits from `Intl.NumberFormat("ar-SA-u-nu-arab")`, and the Gregorian date underneath.
- **The reply's own fields are checked**, because Aladhan returns HTTP 200 even for an impossible date like `99-99-2026`.

After moving to the shared request function, the Hijri failures were tested again: offline, HTTP 500, a reply with `code: 400` and missing fields, and a rejected request each showed the same message as in Assignment 2, and Try again brought the date back with focus on Refresh.

### 6.4 Visit timer

`js/timer.js` shows "Time on this page: 2m 05s" in the footer.

**The rules:**

- Only time with the tab visible counts. It pauses on the `visibilitychange` event when the tab is hidden and resumes when it is shown again.
- The total is saved in `sessionStorage`, so a reload in the same tab continues the count, while a new tab or a new visit starts from zero. It is saved when the tab is hidden and on `pagehide`, which fires on reload, close and when the page enters the back/forward cache.
- Counted time is split into `banked` (earlier visible spells) and `visibleSince` (the start of the current one, or `null` while hidden). Times come from `performance.now()`, which does not jump if the device clock is changed.
- The next update is scheduled for the next whole second of counted time (`1000 - elapsed % 1000`), not with a fixed `setInterval`, so the display does not drift. While the tab is hidden there is no timer running at all.

**Formatting:** `formatDuration()` gives "45s", "2m 05s" or "1h 02m"; seconds are dropped after an hour. The value is a `<time>` element whose `datetime` holds the same duration in ISO 8601 (`PT2M5S`). Digits are tabular so the line does not shift each second. The line is deliberately not a live region, because a screen reader would announce it every second.

**How it was tested:** counted 3 seconds; with the tab reported hidden for 3 seconds the display stayed at 3s and the saved value was 3; after showing the tab again it reached 5s two seconds later. A reload continued from 13s. `formatDuration` checked at 0, 9, 59, 60, 65, 3599, 3600, 3725 and 36000 seconds; saved values `-5`, `abc`, missing and `Infinity` all read as 0. With storage throwing, the helpers returned the fallback and `false` with no error.

### 6.5 Contact form

The form has `novalidate`, so the browser's own popups never show. `validateContact()` checks the name is not empty, the email is not empty and looks like `something@something.something` with no spaces, and the message has at least 10 characters after trimming. Each error appears under its field with `aria-invalid`, focus moves to the first wrong field, and a notification says how many need fixing. Only a fully valid form shows the confirmation, which says plainly that nothing was sent.

### 6.6 Motion

All animations use only `opacity` and `transform`.

- **Section reveal:** `UI.reveal()` watches each section with an `IntersectionObserver`. Nothing is hidden until the observer's first report arrives. In that same step, sections already on screen (judged from the report's own `boundingClientRect`) are marked visible and `.reveal-enabled` is added, so nothing blinks out and back in. Assignment 2 measured each section with `getBoundingClientRect()` at start-up instead, which forced an extra layout; see section 10.
- **Card entrance** for projects and repositories: each card gets `--i` (its position, capped at 8) and an `animation-delay` of `--i × 45ms`.
- **Card hover:** lift 3px, amber border, shadow, also on keyboard focus.
- **Spinners** while either API loads.

**Reduced motion:** durations and delays become near zero, so everything shows at once. The card lift is removed for both card types. The spinners are slowed to 2.4 seconds per turn rather than stopped.

## 7. Responsiveness

| Breakpoint | Changes |
| --- | --- |
| 900px | Bands become one column. The hero photo moves above the text as a 3:2 crop, up to 560px wide. |
| 560px | Body text and form fields at 16px (iOS Safari zooms into smaller fields). Search and sort stack. Project and repository cards one per row. Notifications span the screen. |
| 380px | Nav links get narrower padding, so the four links and the theme button fit on one line at 320px. |

Checked at 1280, 1024, 768, 390, 360 and 320px in both themes: no sideways scrolling, no element past the right edge, the expected number of repository columns.

## 8. Accessibility

- A skip link is first in the tab order. `<main>` has `tabindex="-1"` so the link moves focus there.
- One focus ring for every control: a 2px amber outline on `:focus-visible`. On repository cards it outlines the whole card.
- Filter buttons use `aria-pressed`, and their style is driven by it.
- The project count, the notifications and both API panels are polite live regions. The API panels set `aria-busy` while loading. The timer is not a live region, on purpose.
- Form errors use `aria-invalid` and `aria-describedby`.
- When a button that disappears with its state is pressed (Refresh, Try again), focus moves to the new state's button instead of being lost.

**Contrast**, measured in the browser over every new Assignment 3 element in both themes, with the GitHub warning showing: lowest 4.84:1 in dark and 6.09:1 in light, against a 4.5:1 requirement. The new elements use the existing colour tokens, so they match the Assignment 2 audit (125 elements per theme, 0 axe-core violations).

Lighthouse accessibility is 100 on mobile and desktop. An axe-core run was planned for Assignment 3 too, but loading it into the test page from a CDN was blocked by the AI tool's permission system, so it was not run this time. The contrast check above was done by hand instead.

## 9. Responsive images

The profile photo is the largest thing above the fold.

```html
<picture class="hero-photo">
  <source type="image/webp"
          srcset="assets/images/profile-600.webp 600w, assets/images/profile.webp 900w"
          sizes="(max-width: 600px) calc(100vw - 32px), 580px" />
  <img src="assets/images/profile.jpg" ... width="900" height="600" fetchpriority="high" />
</picture>
```

- **WebP** at quality 80: 26 KB at 900px and 15 KB at 600px, against 50 KB for the JPEG. Quality 75 (22 KB) and 85 (32 KB) were also made for comparison; the quality 80 file was checked by eye and showed no visible loss.
- **`sizes`** is 580px above 600px wide, not the 385px box: on desktop the photo is a square crop with `object-fit: cover`, which scales the 3:2 image to about 1.5 times the box width.
- **`fetchpriority="high"`** asks the browser to fetch it before less important files.
- **`width` and `height`** reserve its space, so nothing shifts when it arrives.
- Browsers without WebP use the JPEG.

## 10. Performance

### What was done

- Responsive WebP photo, as above.
- `<link rel="preconnect" crossorigin>` for `api.github.com` and `api.aladhan.com`, so the connection setup for both APIs starts while the page loads. `crossorigin` is needed because `fetch` makes CORS requests, which use a separate connection.
- The GitHub cache: most reloads make no GitHub request at all.
- One shared `fetchJSON` instead of two copies of the request logic, and shared CSS rules for both API panels.
- The forced layout in the scroll reveal removed (section 6.6).
- Unused files removed: the empty `assets/images/.gitkeep`.
- Kept from Assignment 2: `defer` on every script, no web fonts, an inline SVG favicon, debounced search, `IntersectionObserver` instead of a scroll handler, and animations on `transform` and `opacity` only. The timer stops completely while the tab is hidden.

### Lighthouse results

Lighthouse 12.8.2, headless Chrome, local Python server. "Before" is the Assignment 2 code.

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Transfer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assignment 2, mobile | 99 | 100 | 100 | 100 | 1.1 s | 2.0 s | 0 ms | 0.03 | 138 KiB |
| Assignment 3 before the performance pass, mobile | 99 | 100 | 100 | 100 | 1.1 s | 2.0 s | 40 ms | 0 | 143 KiB |
| Assignment 3, mobile | 99 | 100 | 100 | 100 | 1.1 s | 2.0 s | 0 ms | 0.03 | 144 KiB |
| Assignment 2, desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.4 s | 0 ms | 0.018 | 138 KiB |
| Assignment 3, desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.4 s | 0 ms | 0.018 | 133 KiB |

The "before the performance pass" run already had the WebP photo but not the reveal fix or the responsive variant. Lighthouse attributed 40.8 ms of forced layout to `js/ui.js` line 219, the `getBoundingClientRect()` call in the reveal. After the fix, blocking time is 0 ms and the remaining 43 ms of forced layout is listed as "unattributed", not from the page's code.

### Lighthouse notes left as they are

| Note | Why it is left |
| --- | --- |
| Enable text compression, cache lifetimes | These are set by the web server. Python's test server sends neither. A host such as GitHub Pages compresses files and sets cache headers. |
| Minify CSS and JavaScript, unused CSS | Minifying needs a build step, which this project avoids so it can be opened straight from disk. The comments are part of the code quality requirement. The "unused" CSS covers states that are not on screen at load: errors, empty states, the light theme, phone layouts. |
| Render-blocking stylesheet | One local stylesheet. Inlining critical CSS would need a build step. |
| Image larger than displayed (mobile) | Lighthouse's phone is 412px wide at 1.75 times pixel density. The photo is drawn 378px wide there, which needs about 660 real pixels, so the browser correctly picks the 900px file over the 600px one. |

## 11. Testing

Every feature was checked in Chromium through Playwright, from `file://` and from a local server: console errors, behaviour, screenshots of both themes, phone widths, and a check that the Assignment 1 and Assignment 2 folders were unchanged. The specific tests are listed with each feature above and in the [AI usage report](ai-usage-report.md). Regression checks on the Assignment 2 features (theme toggle and saving, name with extra spaces, Games plus "godot", contact errors and confirmation) all passed with no console errors.

## 12. Limitations

- Tested in Chromium only. Not tested in Firefox, Safari or on real phones.
- Not deployed.
- The contact form sends nothing.
- The GitHub and Today sections need an internet connection and depend on those APIs being up. A saved GitHub copy covers GitHub being down after the first visit.
- The GitHub list shows everything public on the account. It is not filtered or curated.
- No axe-core run for Assignment 3 (see section 8).
- With JavaScript off, the theme is always dark and the projects and repositories do not show.
- There is no header link to the GitHub or Today sections, because a fifth link does not fit on a 320px phone.

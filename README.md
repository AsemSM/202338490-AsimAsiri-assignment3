# Asim Asiri Portfolio, SWE 363 Assignment 3

My personal portfolio from Assignments 1 and 2, extended with live data from the GitHub API, a visit timer, a shared request layer and a performance pass. It is plain HTML, CSS and JavaScript. There are no frameworks, no libraries, no build step and nothing to install.

**Repository:** https://github.com/AsemSM/202338490-AsimAsiri-assignment3
**Live demo:** not deployed.

## Documentation

- [Technical documentation](docs/technical-documentation.md): architecture, state, the request layer, the GitHub caching rules, the timer, themes, accessibility, performance and Lighthouse results, limitations
- [AI usage report](docs/ai-usage-report.md): tools used, who did what, testing, bugs found and fixed, usage log and declaration

## What is new since Assignment 2

| Area | Assignment 2 | Assignment 3 |
| --- | --- | --- |
| External API | Hijri date from Aladhan | My public GitHub repositories, live from the GitHub REST API, plus the Hijri date |
| Caching | None | GitHub replies saved in `localStorage` for 10 minutes; an older copy is shown with a warning if GitHub fails |
| Rate limits | Not relevant | GitHub's limit of 60 requests an hour is detected from its headers and the message gives the time to try again |
| Requests | Hijri had its own fetch code | One shared `UI.fetchJSON` for both APIs: timeout, offline, network, HTTP status and bad JSON handled in one place |
| Timer | None | Time on this page in the footer, counting only while the tab is visible, kept across reloads in the same tab |
| Photo | 50 KB JPEG | Responsive WebP, 15 KB or 26 KB depending on the screen, with the JPEG as a fallback |
| Start-up | Scroll reveal measured every section on load | Positions read from the observer instead, removing about 40 ms of forced layout flagged by Lighthouse |
| Lighthouse | Not run | Run before and after, mobile and desktop. Results below |
| Repository | One commit history on `main` | Feature branches merged into `main`, every AI-assisted commit marked `Assisted-by` |

## How it meets the requirements

| Requirement | Where it is met |
| --- | --- |
| API integration | GitHub repositories (`js/github.js`) and the Hijri date (`js/hijri.js`), both through `UI.fetchJSON` in `js/ui.js`. Every failure has a plain message and a Try again button. |
| Complex logic | The GitHub loader's four-step rule: fresh saved copy, else live request, else old copy with a warning, else error. Rate-limit detection from status plus headers. The project list's search, topic filter and sort combined through one state object. Contact form checks (not empty, email shape, message length) before the confirmation. The visit timer's pause and resume rules. |
| State management | Theme and visitor name in `localStorage`. GitHub cache with a timestamp. Visit time in `sessionStorage`. Project view and panel states each driven from one place. See the state table in the technical documentation. |
| Performance | Responsive WebP photo, high fetch priority for it, preconnect to both APIs, the GitHub cache (no request at all on most reloads), one shared request function instead of two copies, the forced reflow removed. Lighthouse 99 to 100 in every category. |
| AI integration | [AI usage report](docs/ai-usage-report.md), with the usage log and declaration. |
| Code quality | Nine single-purpose scripts, commented, one token set and spacing scale in the CSS. |
| Documentation | This README and the two docs linked above. |

## Setup

### Open the file directly (recommended)

1. Download or clone the repository:
   ```
   git clone https://github.com/AsemSM/202338490-AsimAsiri-assignment3.git
   ```
2. Open `index.html` in your browser by double-clicking it.

That is all. No install and no server.

**Why this works:** the page uses plain `<script>` tags, not ES modules, and the project data is a `.js` file, not a `.json` file. Browsers block modules and fetching local files when a page is opened from `file://`, so both were avoided on purpose. The two network requests go to the GitHub and Aladhan APIs, which both allow requests from any origin, so they work from `file://` too. You need an internet connection only for the GitHub and Today sections.

### Optional: run a local server

You do not need one, but either of these works:

- **VS Code Live Server:** install the Live Server extension, right-click `index.html` and choose "Open with Live Server".
- **Python:** in the project folder run `python -m http.server 8000`, then open `http://localhost:8000`.

## File structure

```
202338490-AsimAsiri-assignment3/
├── index.html                  page markup, inline favicon, inline theme script
├── css/
│   └── styles.css              all styles, 16 numbered sections with a contents list at the top
├── js/                         plain scripts, loaded in this order
│   ├── data.js                 the 9 projects and the filter topics
│   ├── ui.js                   shared helpers: start-up, storage, fetchJSON, notifications, reduced motion, debounce, scroll reveal
│   ├── theme.js                light and dark toggle
│   ├── greeting.js             time-based greeting and saved visitor name
│   ├── projects.js             project cards, search, filters, sorting, count, empty and error states
│   ├── contact.js              contact form validation and confirmation
│   ├── github.js               GitHub repositories: request, cache, rate limit, cards
│   ├── hijri.js                Hijri date from the Aladhan API
│   └── timer.js                time on this page
├── assets/
│   ├── Asim-CV.pdf
│   └── images/                 profile.jpg (fallback), profile.webp (900px), profile-600.webp
├── docs/
│   ├── technical-documentation.md
│   └── ai-usage-report.md
├── .gitignore
└── README.md
```

Each feature script starts on its own, so if one fails the others still work. The order matters only because every script reads the helpers in `ui.js`, and `projects.js` reads the data in `data.js`.

## Responsive breakpoints

| Width | Layout |
| --- | --- |
| Above 900px | Two columns: section name on the left, content on the right. Hero text beside a square photo. Two project cards and two repository cards per row. |
| 900px and below | One column. Photo first, as a landscape crop up to 560px wide. Section names sit above their content. Contact form below the email link. |
| 560px and below | Phone layout. Body text and form fields at 16px. Search and sort stacked. One project card and one repository card per row. Full-width notifications. |
| 380px and below | Narrower nav padding so the four nav links and the theme button stay on one line. |

Checked at 1280, 1024, 768, 390, 360 and 320px wide in both themes, with no sideways scrolling.

## How to try every feature

### New in Assignment 3

| Feature | What to do | What you should see |
| --- | --- | --- |
| GitHub repositories | Scroll to GitHub. | A spinner, then a card for each public repository with its description, language and when it was last updated. "Live from GitHub, checked just now." under the list. Click a card to open the repository. |
| Saved copy | Reload the page within 10 minutes. | The cards appear at once with no spinner, and the line reads "Saved copy from 2 minutes ago. Press Refresh to check GitHub again." In DevTools Network there is no request to `api.github.com`. |
| Refresh | Click Refresh in the GitHub section. | The spinner, then a live list again. |
| Old copy when GitHub fails | After the list has loaded once, open DevTools (F12), go to the Network tab and choose Offline. Click Refresh. | The saved list stays, with a red-edged line: "Saved copy from ... It could not be updated: Your device is offline..." |
| GitHub error with nothing saved | In DevTools, Application tab, Local Storage, delete `github-repos`. Set Network to Offline and reload. Then set it back to No throttling and click Try again. | "Couldn't load my GitHub repositories" with the offline message, then the list after Try again. |
| Visit timer | Look at the footer. Switch to another tab for a while, then come back. Reload. | "Time on this page" counts up each second. It does not count while the tab is hidden. After a reload it continues from where it was. A new tab starts from zero. |

The rate limit, timeout, server error, account not found and unexpected reply cases cannot be triggered easily by hand. They were tested by replacing `fetch` in an automated browser. See the [technical documentation](docs/technical-documentation.md#62-github-repositories).

### Carried over from Assignment 2

| Feature | What to do | What you should see |
| --- | --- | --- |
| Theme toggle | Click the sun or moon button at the right of the header. Reload the page. | The theme switches with a short fade and a green notification. After reloading, your choice is kept, with no flash of the other theme. |
| Theme follows the device | Use a fresh browser profile, or clear site data, then switch your system between light and dark mode. | Until you press the toggle, the page follows your system setting. |
| Personal greeting | Type your name in the "Your name" box under the greeting and press Save. Reload. | "Good evening, Sara" (or morning or afternoon) and a "Not Sara? Clear name" line. The name survives a reload. |
| Name errors | Press Save with the box empty, or with more than 32 characters. | A red message under the box. It clears as soon as you type. Extra spaces are removed before saving. |
| Project search | Type in "Search projects or technologies", for example `godot`, `leaflet` or `python`. | The list filters after a short pause. The count reads "Showing 1 of 9 projects". |
| Filters and sort | Click Games, then search `godot`. Use the Sort menu. | 1 project, Abra-Ca-Burger. Featured keeps my order, Newest puts 2026 first, A to Z sorts by name. |
| Empty state | Search `xyz`. | "No projects match "xyz"." Click "Show all projects" to reset. |
| Hijri date | Scroll to Today. | A spinner, then the date in English and Arabic with the Gregorian date underneath. |
| Hijri offline error | In DevTools Network choose Offline, click Refresh in Today, then set it back and click Try again. | "Your device is offline..." then the date returns. |
| Contact errors | Click "Send message" with the form empty. Then try `abc` as the email and `hi` as the message. | A message under each wrong field, a red border, the cursor on the first wrong field and a notification saying how many need fixing. |
| Contact success | Fill in a name, a valid email and a message of at least 10 characters, then click "Send message". | "Thanks, Sara." with a note that this is a front end demo and nothing was sent. |
| Skip link | Load the page and press Tab once. | "Skip to content" appears at the top left. |
| Reduced motion | In DevTools open the Rendering panel and set "Emulate CSS media feature prefers-reduced-motion" to reduce. Reload. | Everything shows at once with no fade or lift. The loading spinners still turn, more slowly. |
| JavaScript off | In DevTools, open the command menu (Ctrl+Shift+P), run "Disable JavaScript" and reload. | All sections are visible. Projects, GitHub and Today explain that they need JavaScript. The timer is hidden. |

## Lighthouse

Lighthouse 12.8.2 in headless Chrome, against a local Python server, before (the Assignment 2 code) and after (this code):

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assignment 2, mobile | 99 | 100 | 100 | 100 | 1.1 s | 2.0 s | 0 ms | 0.03 |
| Assignment 3, mobile | 99 | 100 | 100 | 100 | 1.1 s | 2.0 s | 0 ms | 0.03 |
| Assignment 2, desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.4 s | 0 ms | 0.018 |
| Assignment 3, desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.4 s | 0 ms | 0.018 |

Assignment 3 adds two scripts and a second API, and the scores held. On desktop the page is now lighter than Assignment 2 (133 KiB against 138 KiB) because of the WebP photo. Before the performance pass, Assignment 3 on mobile measured 40 ms of total blocking time, and Lighthouse attributed about 40 ms of forced layout to the scroll reveal in `js/ui.js`. After the fix, blocking time is 0 ms and no forced layout is attributed to the page's code. The remaining Lighthouse notes and why each is left are in the [technical documentation](docs/technical-documentation.md#10-performance).

## AI usage summary

I built this with Claude Code (Anthropic, Claude Opus 5.5) in one session. I chose the features (GitHub repositories as the API, keeping the Hijri panel, a visit timer), approved downloading Lighthouse, and had the work pushed from my own git account. Claude Code wrote the code and these docs, worked on feature branches, and checked every feature in a real browser with Playwright: it forced each kind of API failure, tested the cache rules with saved copies of different ages, tested the timer with the tab hidden and storage blocked, measured contrast, and ran Lighthouse before and after. Those checks caught three real bugs, listed with their fixes in the [AI usage report](docs/ai-usage-report.md). Every AI-assisted commit has an `Assisted-by` line.

## Browser support

The page uses CSS Grid, Flexbox, custom properties, `clamp()`, `aspect-ratio`, `:focus-visible`, `<picture>` with WebP and `-webkit-line-clamp`, plus `fetch`, `AbortController`, `async`/`await`, classes, `IntersectionObserver`, the Page Visibility API, `Intl.RelativeTimeFormat` and `Intl.NumberFormat` in JavaScript. All of these are supported by current versions of Chrome, Edge, Firefox and Safari.

**Tested:** Chromium only, through Playwright, at desktop, tablet and phone sizes, from `file://` and from a local server.
**Not tested:** Firefox, Safari and real phones.

## Limitations

- Not deployed.
- Only tested in Chromium.
- The contact form is a front end demo. Nothing is sent.
- The GitHub and Today sections need an internet connection. GitHub allows 60 requests an hour from one network without signing in; the 10-minute cache keeps a normal visitor far below that.
- The GitHub list shows what is public on my account, including the repositories for these assignments. It is not curated.
- There is no header link to the GitHub or Today sections, because a fifth link does not fit on a 320px phone.
- With JavaScript off, the page is always in the dark theme and the projects and repositories do not show.

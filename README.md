# Asim Asiri Portfolio, SWE 363 Assignment 2

My personal portfolio from Assignment 1, made interactive. It is plain HTML, CSS and JavaScript. There are no frameworks, no libraries, no build step and nothing to install.

**Live demo:** not deployed.

## Documentation

- [Technical documentation](docs/technical-documentation.md): architecture, state, rendering, themes, accessibility, performance, limitations
- [AI usage report](docs/ai-usage-report.md): tools used, who did what, testing, bugs found and fixed

## What is new since Assignment 1

Assignment 1 had two project cards written into the HTML, a time-based greeting, a card hover effect, and a contact form that did nothing. Assignment 2 keeps the same design and adds:

| Area | Assignment 1 | Assignment 2 |
| --- | --- | --- |
| Projects | 2 cards in the HTML | 9 projects in `js/data.js`, with live search, topic filters, sorting, a result count and an empty state |
| Greeting | Time of day only | Time of day plus the visitor's name, saved between visits |
| Theme | Dark only | Light and dark toggle that follows the device until you choose, then remembers your choice |
| API | None | Today's date in the Hijri calendar from the free Aladhan API, with loading and error states |
| Contact form | No validation | Validation with errors under each field and a confirmation message |
| Motion | Card hover | Sections fade up on scroll, cards enter one after another, theme cross-fade, animated notifications |
| Feedback | None | Notifications, inline errors, empty and error states, messages for when JavaScript is off |
| Accessibility | Basic | Skip link, keyboard focus rings, live regions, `aria-invalid` and `aria-pressed`, reduced motion support |
| Code | One script | Seven scripts, one job each |

The page title, description and footer now use my full name, and the footer says SWE 363 Assignment 2.

## How it meets the requirements

| Requirement | Where it is met |
| --- | --- |
| Dynamic content | Project search, filters and sort (`js/projects.js`). Greeting that updates with your name (`js/greeting.js`). Form and saved-name line that swap. |
| Data handling | Theme and name saved in `localStorage` (`js/theme.js`, `js/greeting.js`). Hijri date fetched from a public API (`js/hijri.js`). Contact form validation with a confirmation (`js/contact.js`). |
| Animation | Section reveal on scroll, staggered card entrance, card lift on hover, theme cross-fade, notification enter and exit, Hijri state fades and spinner, form confirmation (`css/styles.css`, section 3 Motion). |
| Error handling and feedback | Inline field errors, a notification counting the fields to fix, an empty search state, five different API error messages with Try again, a loading spinner, messages when project data is missing or JavaScript is off. |
| AI enhancement | [AI usage report](docs/ai-usage-report.md). |
| Documentation | This README and the two docs linked above. |

## Setup

### Open the file directly (recommended)

1. Download or clone the project.
2. Open `index.html` in your browser by double-clicking it.

That is all. No install and no server.

**Why this works:** the page uses plain `<script>` tags, not ES modules, and the project data is a `.js` file, not a `.json` file. Browsers block modules and fetching local files when a page is opened from `file://`, so both were avoided on purpose. The one network request goes to the Aladhan API, which allows requests from any origin, so it works from `file://` too. You need an internet connection only for the Today section.

### Optional: run a local server

You do not need one, but either of these works:

- **VS Code Live Server:** install the Live Server extension, right-click `index.html` and choose "Open with Live Server".
- **Python:** in the project folder run `python -m http.server 8000`, then open `http://localhost:8000`.

## File structure

```
assignment-2/
├── index.html                  page markup, inline favicon, inline theme script
├── css/
│   └── styles.css              all styles, 16 numbered sections with a contents list at the top
├── js/                         plain scripts, loaded in this order
│   ├── data.js                 the 9 projects and the filter topics
│   ├── ui.js                   shared helpers: start-up, storage, notifications, reduced motion, debounce, scroll reveal
│   ├── theme.js                light and dark toggle
│   ├── greeting.js             time-based greeting and saved visitor name
│   ├── projects.js             project cards, search, filters, sorting, count, empty and error states
│   ├── contact.js              contact form validation and confirmation
│   └── hijri.js                Hijri date from the Aladhan API
├── assets/
│   ├── Asim-CV.pdf
│   └── images/profile.jpg
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
| Above 900px | Two columns: section name on the left, content on the right. Hero text beside a square photo. Two project cards per row. |
| 900px and below | One column. Photo first, as a landscape crop up to 560px wide. Section names sit above their content. Contact form below the email link. |
| 560px and below | Phone layout. Body text and form fields at 16px. Search and sort stacked. One project card per row. Smaller tags, more space between skill rows, full-width notifications. |
| 380px and below | Narrower nav padding so the four nav links and the theme button stay on one line. |

Checked at 1280, 1024, 900, 768, 600, 390 and 360px wide with no sideways scrolling.

## How to try every feature

| Feature | What to do | What you should see |
| --- | --- | --- |
| Theme toggle | Click the sun or moon button at the right of the header. Reload the page. | The theme switches with a short fade and a green notification. After reloading, your choice is kept, with no flash of the other theme. |
| Theme follows the device | Use a fresh browser profile, or clear site data, then switch your system between light and dark mode. | Until you press the toggle, the page follows your system setting. |
| Personal greeting | Type your name in the "Your name" box under the greeting and press Save. Reload. | "Good evening, Sara" (or morning or afternoon) and a "Not Sara? Clear name" line. The name survives a reload. |
| Name errors | Press Save with the box empty, or with more than 32 characters. | A red message under the box. It clears as soon as you type. Extra spaces are removed before saving. |
| Clear name | Click "Clear name". | The box comes back with the cursor in it, and a notification confirms. |
| Project search | Type in "Search projects or technologies", for example `godot`, `leaflet` or `python`. | The list filters after a short pause. The count reads "Showing 1 of 9 projects". |
| Filters | Click All, AI, Web, Hackathon or Games. | The selected button is filled amber. Games shows 2 projects. |
| Combined | Click Games, then search `godot`. | 1 project, Abra-Ca-Burger. |
| Sort | Use the Sort menu: Featured, Newest or A to Z. | Featured keeps my order. Newest puts 2026 first, alphabetical within a year. |
| Clear search | Click the X in the search box, or press Escape. | The search clears and the full list returns. |
| Empty state | Search `xyz`. | "No projects match "xyz"." Click "Show all projects" to reset the search and filter. |
| Hijri date | Scroll to Today. | A spinner, then the date in English and Arabic with the Gregorian date underneath. |
| Hijri refresh | Click Refresh. | The spinner shows again, then the date. |
| Hijri offline error | Open DevTools (F12), go to the Network tab and choose Offline. Click Refresh in Today. Then set the network back to No throttling and click Try again. | "Your device is offline..." then, after Try again, the date returns. |
| Hijri blocked request | In DevTools Network, right-click the `api.aladhan.com` request, choose "Block request URL", then click Refresh. Remove the block and click Try again. | "The date service could not be reached..." then the date returns. |
| Contact errors | Click "Send message" with the form empty. Then try `abc` as the email and `hi` as the message. | A message under each wrong field, a red border, the cursor on the first wrong field and a notification saying how many need fixing. Each error clears as you type in that field. |
| Contact success | Fill in a name, a valid email and a message of at least 10 characters, then click "Send message". | "Thanks, Sara." with a note that this is a front end demo and nothing was sent. The form resets. |
| Skip link | Load the page and press Tab once. | "Skip to content" appears at the top left. Enter jumps to the main content. |
| Reduced motion | Turn on reduced motion in your system settings, or in DevTools open the Rendering panel and set "Emulate CSS media feature prefers-reduced-motion" to reduce. Reload. | Everything shows at once with no fade or lift. The loading spinner still turns, more slowly. |
| JavaScript off | In DevTools, open the command menu (Ctrl+Shift+P), run "Disable JavaScript" and reload. | All sections are visible. The Projects and Today areas explain that they need JavaScript. |

The timeout, server error and unexpected reply cases cannot be triggered easily by hand. They were tested by intercepting the request in an automated browser. See the [technical documentation](docs/technical-documentation.md#hijri-date-and-error-handling).

## AI usage summary

I built this with Claude Code (Anthropic). I wrote every prompt with the requirements and decisions: which features to add, the project list and order, the API, the validation rules, the breakpoints and the colour direction. Claude Code wrote the code and these docs, then checked every prompt's result in a real browser with Playwright. It forced each API failure, tested with storage blocked, with JavaScript off and with reduced motion, measured text contrast, and ran an axe-core accessibility audit. Those checks caught nine real bugs in the page, listed with their fixes in the [AI usage report](docs/ai-usage-report.md).

## Browser support

The page uses CSS Grid, Flexbox, custom properties, `clamp()`, `aspect-ratio` and `:focus-visible`, plus `fetch`, `AbortController`, `IntersectionObserver` and `Intl.NumberFormat` in JavaScript. All of these are supported by current versions of Chrome, Edge, Firefox and Safari.

**Tested:** Chromium only, through Playwright, at desktop, tablet and phone sizes.
**Not tested:** Firefox, Safari and real phones.

## Limitations

- Not deployed and not yet in a GitHub repository.
- Only tested in Chromium.
- The contact form is a front end demo. Nothing is sent.
- The Today section needs an internet connection and depends on the Aladhan API being up.
- English Hijri month and weekday names are the API's own spellings, for example "Al Ahad" and "Jumādá al-ūlá". They are shown as received.
- Today has no link in the header, because a fifth link does not fit on a 320px phone.
- With JavaScript off, the page is always in the dark theme and the projects do not show.
- Project cards have no links inside, so keyboard focus cannot land on them. The focus style is ready for when they get links.

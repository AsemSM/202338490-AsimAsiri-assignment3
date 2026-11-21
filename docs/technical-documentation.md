# Technical Documentation

SWE 363 Assignment 2, Asim Asiri. How the portfolio is built and why. For setup and a feature walkthrough, see the [README](../README.md).

## 1. Overview

A single page: header, hero, Skills, Projects, Today, Contact and footer. Plain HTML, CSS and JavaScript, about 2,700 lines across nine files. No frameworks, no libraries, no build step.

The main constraint: the page must work when `index.html` is opened straight from disk (`file://`). Several decisions below come from that.

## 2. Architecture

### Separate plain scripts, not modules

The JavaScript is split into seven files with one job each:

| File | Job |
| --- | --- |
| `js/data.js` | `PROJECTS` (9 entries) and `PROJECT_TOPICS` (filter order) |
| `js/ui.js` | Shared helpers on one `UI` object: `init`, `load`, `save`, `remove`, `debounce`, `prefersReducedMotion`, `toast`, `clearToasts`, `reveal` |
| `js/theme.js` | Theme toggle, saving the choice, following the device setting |
| `js/greeting.js` | Time-based greeting, visitor name form and saved-name line |
| `js/projects.js` | Project cards, search, filters, sorting, count, empty and error states |
| `js/contact.js` | Contact form validation and confirmation |
| `js/hijri.js` | Hijri date request, timeout, error kinds, three-state panel |

They are loaded as plain `<script defer>` tags at the end of `index.html`, in the order above. `defer` keeps that order and runs them after the HTML is parsed.

**Why not ES modules:** browsers block module scripts on `file://` because of CORS. Using modules would mean the page only works behind a server.

**Why data is a `.js` file:** fetching a local `.json` file is blocked on `file://` for the same reason. So the project list is a JavaScript array.

**Cost of plain scripts:** every top-level name is shared across files. To keep that manageable, all helpers live on the single `UI` object, and each feature file has a distinct job and naming (`HIJRI_*`, `NAME_*` and so on).

### One feature cannot stop another

Each feature registers its setup through `UI.init(name, setup)`. That runs the setup on `DOMContentLoaded` inside a `try/catch` and logs `[name] failed to start` if it throws. A syntax error in one file only stops that file's own `<script>` element. So a broken feature never stops the others.

This was tested by blocking `data.js`, `ui.js`, `projects.js` and `hijri.js` one at a time, by making `greeting.js` throw, and by giving `theme.js` a syntax error. In each case the rest of the page kept working.

### Fallbacks in the HTML

Anything that needs JavaScript starts in a safe state in the HTML:

- The project grid and the Today panel each contain a "needs JavaScript" message. Their script replaces it when it starts. This covers JavaScript being off and also one script failing to load, which `<noscript>` would not cover.
- The theme toggle, name form, project controls and all three Hijri states start with the `hidden` attribute. Their script reveals them, so no dead button or half-built panel ever shows.
- `[hidden] { display: none !important; }` in the CSS makes sure `hidden` always wins. Without `!important`, a component rule such as `display: flex` would beat the browser's default rule and show a hidden element.

## 3. State and rendering

The same pattern is used everywhere: state lives in one place, and one function updates the page from it.

### Projects

```js
const state = { topic: "All", query: "", sort: "featured" };
```

Every control writes to `state` and calls `render()`. `render()` calls `visibleProjects(projects, state)`, a pure function that filters and sorts, then rebuilds the grid, the count, the filter buttons' `aria-pressed`, the clear button and the empty state. Because nothing else changes the page, search, filter and sort always combine correctly.

- **Search** matches every word of the query against the name, the Arabic name, the description and the technologies. It is case-insensitive and ignores extra spaces. It waits 180 ms after typing stops (`UI.debounce`), so it filters once per pause, not once per key.
- **Sorting:** Featured keeps the array order, which relies on `Array.prototype.sort` being stable. Newest sorts by year, then by name within a year. A to Z sorts by name.
- **Filter buttons** are generated from `PROJECT_TOPICS`, keeping only topics that at least one project uses. Adding a topic needs no HTML change.
- **State starts from the controls.** Browsers can restore a `<select>` value on reload, so the sort is read from the control at start-up instead of assumed.
- **Data checks:** if `PROJECTS` is missing, the grid is replaced with an alert explaining the list could not load, and the console says which file to check. An entry with a missing field is skipped with a console warning, so one typo does not hide the other projects. An empty list gets its own message.

### Greeting

The greeting has two mutually exclusive states: the name form, or the "Not Sara? Clear name" line. Only `render()` in `greeting.js` changes them, and always as a pair. The name is also held in a variable, so it works for the visit even when storage is blocked.

`cleanName()` (trim and collapse spaces) runs before `validateName()` (empty, or over 32 characters), so the limit applies to the cleaned name. A stored name is validated again on load and ignored if it is invalid, for example if it was edited by hand.

### Hijri panel

The panel has three states: loading, result and error. `setState(name)` is the only code that shows or hides them, so exactly one is visible at a time. It also sets `aria-busy` while loading.

### Contact form

`validateContact(values)` is pure. It takes the three values and returns a map of field name to error message, with no DOM access. The submit handler is the only code that touches the page: it shows or clears each error, moves focus, shows a notification and shows or hides the confirmation.

### Rendering safely

Every piece of text that comes from data, the visitor or the API is written with `textContent` and `createElement`, never `innerHTML`. A name like `<img src=x onerror=alert(1)>` is shown as text. This was tested in the name form, the search box and the contact form: no element was created and no alert ran.

## 4. Design

The Assignment 1 design is kept: a cool blue-black background with one warm amber accent, hairline dividers instead of boxes, and a two-column band for each section (section number and name on the left, content on the right).

All colours, spacing and radii are custom properties in the first section of `css/styles.css`. Values that were hard coded in Assignment 1 (the header background, hover tints, link underlines) are now tokens, so the light theme can override them in one place.

`css/styles.css` is split into 16 numbered sections with a contents list at the top: tokens, base, motion, typography, layout, masthead, buttons, hero, skills, projects, today, contact, footer, feedback, responsive, reduced motion.

## 5. Themes

### Two token sets

Dark values are on `:root`. Light values are on `:root[data-theme="light"]`: a warm off-white background (`#f7f3ec`), white cards, dark text and a darker amber (`#985a0b`), so amber text stays above 4.5:1 on a light background.

### Avoiding the theme flash

A small inline script in the `<head>`, before the stylesheet, picks the theme and sets `data-theme` on `<html>`:

1. If a valid choice is saved in `localStorage`, use it.
2. Otherwise use the device setting (`prefers-color-scheme`).

Because this runs before the stylesheet is applied, the first paint already uses the right theme. This was verified by checking that `data-theme` is already set at the moment the stylesheet `<link>` is parsed. The storage read is wrapped in `try/catch`, because storage can throw when it is blocked.

Resolving the device setting in the script, rather than with a CSS media query, means the light tokens are written once instead of twice. The cost is that with JavaScript off the page is always dark.

### After load

`theme.js` keeps following live device changes until the visitor presses the toggle. After that the choice wins. The "has chosen" flag is also kept in memory, so this works even when saving fails.

Pressing the toggle adds a `.theme-fading` class for 300 ms. It cross-fades colours, then is removed, so normal hover transitions are not slowed down. It is skipped when reduced motion is on.

If saving fails, the theme still switches and a red notification explains it will reset on reload. The button's `aria-label` and `title` always say what a press will do, for example "Switch to light theme", and the icon shows the theme it switches to.

## 6. Responsiveness

The layout uses CSS Grid and Flexbox, with three width breakpoints:

| Breakpoint | Changes |
| --- | --- |
| 900px | Bands become one column. The hero photo moves above the text and becomes a 3:2 landscape crop, up to 560px wide. The contact form moves below the email link. |
| 560px | Body text and form fields at 16px. Search and sort stack. Cards one per row. Tags smaller (11px). Skill rows stack with 24px padding. Notifications span the screen. Panels get tighter padding. |
| 380px | Nav links get narrower padding, so the four links and the theme button fit on one line at 320px. |

Form fields are 16px on phones for a second reason: iOS Safari zooms the page into any focused field with smaller text.

The project grid is `repeat(auto-fit, minmax(300px, 1fr))`. The band body is always under 950px wide, so there are never more than two columns. An odd last card spans the full row, so a filter that leaves 1, 3 or 5 results never leaves half a row empty.

Checked at 1280, 1024, 900, 768, 600, 390 and 360px: no sideways scrolling, no clipped text, nav on one line. 320px was also checked after the theme toggle was added.

## 7. Features

### Hijri date and error handling

`js/hijri.js` calls `https://api.aladhan.com/v1/gToH/DD-MM-YYYY` with the visitor's date. The API needs no key and allows any origin, so it works from `file://`.

**Local date, not UTC.** The date is built from `getDate()`, `getMonth()` and `getFullYear()`. Using `toISOString()` would give the UTC date, which is the previous day between midnight and 3 am in Saudi Arabia. Tested at 01:30 Riyadh time: the request asked for 26 October, not 25.

**Display.** English line: weekday, day, month, year and AH. Arabic line with `lang="ar"` and `dir="rtl"`, Arabic-Indic digits from `Intl.NumberFormat("ar-SA-u-nu-arab")` and هـ. The visitor's Gregorian date is underneath. A no-break space keeps AH and هـ on the same line as the year. The English month and weekday spellings, such as "Al Ahad" and "Jumādá al-ūlá", are the API's own transliterations and are shown as received.

**Failures.** Each failure becomes a `HijriError` with a kind, and each kind has its own message. Browser strings such as "Failed to fetch" go to `console.warn` only and never reach the page.

| Kind | How it is detected | Message shown |
| --- | --- | --- |
| offline | `navigator.onLine` is false before the request, or after a failed request | Your device is offline. Connect to the internet, then try again. |
| timeout | An `AbortController` aborts the request after 8 seconds | The date service took more than 8 seconds to answer. It may be busy, so try again in a moment. |
| network | `fetch` rejects with a `TypeError` | The date service could not be reached. Check your connection, or a network filter may be blocking it. |
| server | `response.ok` is false. `fetch` does not reject on a 500, so this is checked explicitly | The date service had a problem on its side. Try again in a moment. |
| data | The reply is not JSON, its `code` is not 200, or a needed field is missing | The date service sent back a reply this page could not read, so no date is shown. |

The reply's own fields are checked as well as the HTTP status, because Aladhan returns HTTP 200 even for an impossible date like `99-99-2026`.

Every error has a Try again button. When a button started the load, focus moves to the new state's button, because the pressed button disappears.

**How the failures were tested.** In an automated Chromium browser (Playwright), each failure was forced on a page that had loaded normally: offline mode, an aborted request, HTTP 500, HTTP 404, a reply missing fields, a non-JSON reply, an API reply with `code: 400`, and a request that never answers. Each showed the right message. The timeout fired at 8.08 seconds. After each one, the network was restored and Try again brought the date back. Across 22 checks, exactly one state was visible every time.

### Contact form

The form has `novalidate`, so the browser's own popups never show. `validateContact()` checks:

- Name: not empty after trimming.
- Email: not empty, and matching `something@something.something` with no spaces. This is deliberately loose. Only sending an email can prove an address is real.
- Message: not empty, and at least 10 characters after trimming.

Each error appears under its field and sets `aria-invalid="true"`, which also gives the field its red border, so the look and what a screen reader hears always agree. Focus moves to the first wrong field, and a notification says how many fields need fixing. Each error clears as soon as that field is edited.

On a valid submit the visitor is thanked by first name, told this is a front end demo and nothing was sent, and given my email. The form and errors reset, and focus moves to the confirmation so screen readers read it. Earlier notifications are cleared on every submit, so a stale count never sits next to the thank you. A later invalid submit hides the confirmation.

### Notifications

`UI.toast(message, type)` adds a message to a fixed region in the bottom corner (full width on phones). Types are success (green), error (red) and info. At most three show at once. Each leaves after 3.5 seconds with a short fade.

### Motion

All animations use only `opacity` and `transform`.

- **Section reveal:** `UI.reveal()` adds `.reveal-enabled` only after checking that `IntersectionObserver` exists and reduced motion is off. Sections already on screen are marked visible at once, so they do not blink. Each reveals once and stays. The transition sits on the visible state only, so hiding is instant and only the reveal animates.
- **Card entrance:** each card gets `--i` (its position, capped at 8) and an `animation-delay` of `--i × 45ms`. The fill mode is `backwards`, so the animation does not hold `transform` after it ends and the hover lift still works.
- **Card hover:** lift 3px, amber border, shadow. The same style applies on `:focus-within`.
- **Spinner:** a rotating border while the Hijri date loads.

**Reduced motion:** all transition and animation durations become near zero and all animation delays become zero, so everything shows at once. The card lift is removed; the border and shadow still mark the hovered card. The spinner is the one exception: it is slowed to 2.4 seconds per turn rather than stopped, because a frozen spinner no longer says that something is happening.

## 8. Accessibility

- A skip link is first in the tab order and appears on focus. `<main>` has `tabindex="-1"`, so the link moves focus there, not only the scroll position.
- One focus ring for every control: a 2px amber outline on `:focus-visible`, so it shows for keyboard use and not for mouse clicks.
- Filter buttons use `aria-pressed`, and their style is driven by it. The selected filter is filled amber with dark text, so it differs by lightness, not only by hue.
- The project count and the notifications are live regions (`role="status"`), so changes are announced.
- Form errors use `aria-invalid` and `aria-describedby`. The name and search boxes have labels that are visually hidden but read by screen readers.
- The Arabic text has `lang="ar"` and `dir="rtl"`.
- The photo has a real description: "Asim Asiri in a white thobe and event lanyard, working on a laptop at a shared table, with other participants and a presentation screen in the background".
- The placeholder colour is set to the muted text token. The browser's default grey was about 4.0:1 on the dark field, below 4.5:1.
- Text fields have their own border token, `--field-border`, so their edges reach 3:1 against both the page and the field in both themes (dark 3.29:1 and 3.10:1, light 3.25:1 and 3.60:1). Cards and dividers keep the softer hairline.

**How it was checked:**

- Contrast was measured in the browser over every visible text element (125 per theme), with errors and notifications showing. No failures. The lowest is 4.84:1 in dark and 4.99:1 in light.
- An axe-core 4.10.2 audit for WCAG 2.1 AA plus best practices found 0 violations in both themes. Axe was loaded into the test browser only and is not part of the project.
- A keyboard-only walk covered 26 tab stops in a logical order. Each has a visible focus ring and none is off screen or under the header.

## 9. Performance

- About 135 KB loaded in total: HTML 15 KB, CSS 31 KB, JavaScript 37 KB, photo 51 KB. The CV is only downloaded on request.
- 10 local requests plus one API request. No web fonts (a system font stack). The favicon is an inline SVG, so it needs no request.
- Scripts use `defer`, so they never block the HTML from parsing.
- The photo has `width` and `height`, so the layout does not jump when it loads.
- Search is debounced. Scroll reveal uses `IntersectionObserver`, not a scroll handler, and stops watching each section once it is shown.
- Animations use only `transform` and `opacity`, which do not trigger layout.

## 10. Testing

Every prompt's result was checked in Chromium through Playwright, both from `file://` and from a local server: console errors, behaviour, screenshots of both themes, phone widths, and Assignment 1's files hashed to prove they were not changed. Specific tests are listed in the sections above and in the [AI usage report](ai-usage-report.md).

## 11. Limitations

- Tested in Chromium only. Not tested in Firefox, Safari or on real phones.
- Not deployed, and not yet in a GitHub repository.
- The contact form sends nothing.
- The Today section needs the Aladhan API and an internet connection.
- With JavaScript off, the theme is always dark and the projects do not show.
- Project cards contain no links, so keyboard focus cannot land inside them. The `:focus-within` style is ready for when they get links. The cards were not made into tab stops, because that adds nine stops on content you cannot interact with.
- There is no header link to the Today section, because a fifth link does not fit on a 320px phone.

# AI Usage Report

SWE 363 Assignment 2, Asim Asiri. This report covers only what happened while building Assignment 2. Every bug listed here really happened and was found the way described. Nothing is made up.

## 1. Tools used

| Tool | What it was used for |
| --- | --- |
| Claude Code (Anthropic), running the Claude Opus 5.5 model | Planning, writing all HTML, CSS and JavaScript, running the browser tests, writing these docs |
| Playwright, driven by Claude Code | Opening the page in a real Chromium browser after every prompt: checking console errors, clicking and typing, taking screenshots, emulating phones, dark and light mode, reduced motion, JavaScript off, offline mode and blocked storage, and intercepting API requests to force failures |
| axe-core 4.10.2 | Automated accessibility audit, loaded into the test browser only. Not part of the project. |
| Python | `http.server` as a local test server, and `pypdf` to read the text of my CV so project details matched it |

Playwright, axe-core and Python are not AI tools, but Claude Code ran all of them.

A handoff note from an earlier planning chat (`HANDOFF.md`, outside this folder) gave the requirement list and the grading rubric at the start.

## 2. What the AI did and what I did

**What I did**

- Wrote every prompt, one feature area at a time: setup, theme, greeting, projects, the Hijri API, the contact form, polish and these docs.
- Made the decisions in each prompt: keep the Assignment 1 design, plain HTML, CSS and JS that works when opened directly, the theme colours, the nine projects with their order, results, technologies and topics, the Aladhan API, the validation rules (32-character name limit, 10-character message), the breakpoints, and what to test.
- Required a browser check after every prompt, plus a check that Assignment 1 was not changed.
- Supplied the facts the AI did not have, such as the results and technologies for the four projects that are not in my CV.

**What the AI did**

- Wrote all the code and the comments in it.
- Chose the implementation details: one state object and one render function for the projects, pure validation functions, the five API error kinds, a timeout using `AbortController`, building the request date from local time, the in-page fallbacks for when JavaScript fails.
- Tested every prompt's result in the browser and fixed what the tests found.
- Kept `CLAUDE.md` up to date with a session log after each prompt, which this report is based on.
- Wrote the README and both docs.

## 3. How the work was tested

After each prompt, Claude Code opened the page in Chromium and checked it, instead of assuming the code worked. The main techniques:

- **Opening `index.html` from `file://`** as well as from a local server, to prove the "open the file directly" setup works.
- **Fresh browser contexts** with a set colour scheme, reduced motion setting, time zone, clock or phone size.
- **Blocking storage** by making `localStorage.getItem`, `setItem` and `removeItem` throw, to test the theme and name fallbacks.
- **Breaking scripts on purpose:** blocking `data.js`, `ui.js`, `projects.js` and `hijri.js` one at a time, making `greeting.js` throw, and giving `theme.js` a syntax error, to prove one failure does not stop the rest.
- **Fixed clocks** at 11:59, 12:00, 17:59, 18:00 and 00:30 to test the greeting boundaries, and 01:30 Riyadh time to prove the Hijri request uses the local date, not UTC.
- **Measuring instead of eyeballing:** text contrast computed from real colours, horizontal overflow from `scrollWidth`, which elements were visible, and the order focus moves through.
- **Screenshots** of both themes and phone widths, which caught several layout bugs the numbers did not.
- **Hashing every file in Assignment 1** before and after each prompt. They never changed.

### Forced API failures

The Hijri section was tested by intercepting the request to `api.aladhan.com` and replacing the reply. On a page that had already loaded the date, each failure was forced and then Refresh was pressed:

| Forced failure | Result |
| --- | --- |
| Browser set offline | Offline message |
| Request aborted | "Could not be reached" message |
| HTTP 500 and HTTP 404 | Server problem message |
| Reply missing the date fields | Unreadable reply message |
| Reply that was not JSON | Unreadable reply message |
| Reply with `code: 400` | Unreadable reply message |
| Request that never answers | Timeout message after 8.08 seconds |
| Offline on the very first load | Offline message |

After each one, the network was restored and Try again was pressed. The date came back every time, with focus on the Refresh button. The words "Failed to fetch" never appeared on the page.

Before writing the error handling, the AI also called the real API with an impossible date (`99-99-2026`). It returned HTTP 200 with a made-up date, which showed that checking the HTTP status alone is not enough. That is why the reply's own fields are checked too.

## 4. Bugs found and fixed

These are the bugs the browser checks found in the page. Each one was in code the AI had just written.

| # | Bug | How it was found | Fix |
| --- | --- | --- | --- |
| 1 | When scroll reveal switched on, sections below the screen faded out over 0.6 s instead of hiding at once | Reading the computed opacity of each section straight after load | Moved the transition onto the visible state only, so hiding is instant and only the reveal animates |
| 2 | The new theme toggle made the page scroll sideways: by 1px at 360px and by 21px at 320px. Assignment 1 fit at 320px | Comparing `scrollWidth` with the window width at several sizes, then measuring which elements stuck out | Tighter header gaps and a smaller toggle under 560px, narrower nav padding under 380px |
| 3 | The placeholder text in the name box was the browser's default grey, about 4.0:1 on the dark field, below 4.5:1 | Contrast measurement | Set `::placeholder` to the muted text colour with `opacity: 1` (4.84:1 dark, 6.09:1 light) |
| 4 | With one project left in the data, the count read "Showing 1 of 1 projects" | The test that feeds in broken data | Singular "project" when the total is 1 |
| 5 | On a phone, the search placeholder was cut off ("...technolog") | Screenshot at 360px | Shorter placeholder: "Search projects or technologies" |
| 6 | An odd number of results left half of the last row empty | Screenshot of the Hackathon filter (5 results) | An odd last card spans the full row |
| 7 | On a 320px phone, the Arabic era marker هـ wrapped onto a line by itself | Screenshot | A no-break space between the year and هـ, and the same for AH |
| 8 | After a failed submit then a valid one, the old "fields need fixing" notifications stayed on screen next to the thank you | Screenshot | New `UI.clearToasts()`, called on every submit |
| 9 | Pill-shaped buttons turned into near-square boxes while they had keyboard focus | Screenshot of a focused filter button | Removed `border-radius` from the global focus rule. Outlines follow the element's own corners |

**Problems in the process, not the page:**

- On the first check, the project cards did not appear. The test browser was serving JavaScript files with the same names from its cache, from an earlier build on the same port. Found by comparing the served file with the file on disk. Fixed by forcing a fresh load and using a new port for later tests.
- Some of the AI's own test readings were wrong, and the page was fine each time:
  - The focus ring check read the 2px outline as 1.6px because of display scaling, and reported 24 controls as having no ring. A screenshot showed the rings were there.
  - The reduced motion check read card opacity in the same frame the page loaded and reported cards as not fully visible. Reading again after 100 ms showed all of them at full opacity.
  - The contact form check read the field borders while their colour was still fading in and reported them as not red. Reading after the fade showed the red border.
  - One early test cleared its own list of console errors before reporting it, so it would have missed errors. The browser's console log file was read instead, and showed only the errors caused on purpose.
- Three times, an edit the AI made with a shell command did not apply. Once a stray command waited for input, once a wrong input redirect fed the script nothing, and once an exact-match check stopped the script because of one capital letter. Each time the AI checked the file, saw the change was missing, and applied it again.

## 5. Benefits

- **Speed.** Each feature area took one prompt, including its tests.
- **Testing I would not have done by hand.** Forcing eight kinds of API failure, blocking storage, breaking individual scripts, setting the clock to just after midnight in Riyadh, and measuring contrast on 125 elements per theme would each take a long time manually.
- **Bugs caught before submission.** All nine bugs above were found by the AI's own browser checks, not by me noticing them later.
- **Consistent structure.** Every feature follows the same pattern (state, one render function, safe start in the HTML), which makes the code easier to read and explain.

## 6. Challenges

- **The AI does not know what it has not been told.** My CV does not describe Tahseel, Nahj, AI File Manager or Abra-Ca-Burger, so their descriptions only repeat the facts I gave. They need a line from me on what each project does.
- **Its first version is not always right.** Nine bugs got through the first version of the code. They were caught only because every prompt required a real browser check.
- **Its tests can be wrong.** Three false failures and one test that could have missed errors came from the test code itself, not the page.
- **Only Chromium.** The automated browser was Chromium, so Firefox and Safari are untested.

## 7. Responsible use

- **No invented content.** Project descriptions come from my CV or from what I wrote in the prompts. Where neither said what a project does, the description says only what is known.
- **No invented bugs or results.** This report lists only what the session log in `CLAUDE.md` recorded.
- **Honest limits.** The docs say plainly what was not tested. When the contrast check found the text field borders were below the 3:1 guideline, that was reported instead of hidden, and fixed when I asked.
- **No hidden code.** There are no libraries or copied code, and every script is plain, commented JavaScript I can read.
- **Privacy.** The contact form sends nothing and says so. The only data stored is the theme and the name the visitor types, both in their own browser.
- **My own words where it counts.** Learning Outcomes is left for me to write.

## 8. Modifications to the AI's output

The changes below were made after the AI's first version, in response to the browser checks or to my prompts:

- The nine bug fixes in section 4.
- The light theme was changed from a cool grey to a warm off-white with white cards, after my prompt asked for it.
- The theme was changed from "saved choice only" to "follow the device until the visitor chooses".
- `<noscript>` messages were replaced with messages inside the Projects and Today areas, so they also show when one script fails, not only when JavaScript is off.
- On phones, form fields were raised to 16px so iOS Safari does not zoom in on focus.
- Text field borders were raised to 3:1 contrast in both themes after my prompt asked for it, using a new `--field-border` token so cards, dividers and the rest of the design stay the same.

Changes recorded in the session log were made through prompts.

## 9. Learning Outcomes

_To be written by me, in my own words, before submission._

# AI Usage Report

SWE 363 Assignment 3, Asim Asiri. This report covers only what happened while building Assignment 3. Every bug listed here really happened and was found the way described. Nothing is made up. The full conversation is in the AI evidence ZIP submitted on Blackboard.

## 1. Tools used and use cases

| Tool | What it was used for |
| --- | --- |
| Claude Code (Anthropic), running the Claude Opus 5.5 model | Reading Assignments 1 and 2 and the new brief, planning, writing all new HTML, CSS and JavaScript, refactoring the Hijri request onto a shared function, running the browser tests and Lighthouse, writing these docs, making the commits on feature branches |
| Playwright, driven by Claude Code | Opening the page in a real Chromium browser: checking console errors, clicking and typing, keyboard navigation, screenshots, phone widths, both themes, JavaScript off, opening from `file://`, and replacing `fetch` to force every API failure |
| Lighthouse 12.8.2, run by Claude Code | Performance, accessibility, best practices and SEO audits, mobile and desktop, before and after the changes |
| Python, run by Claude Code | `http.server` as a local test server, Pillow to make the WebP versions of the photo, and short scripts to summarise the Lighthouse reports |
| Git and the GitHub CLI, run by Claude Code | Branches, commits and pushing to my repository from my own account |

Playwright, Lighthouse, Python and Git are not AI tools, but Claude Code ran all of them.

All the work was done in one Claude Code session (C01 in section 9).

## 2. What the AI did and what I did

**What I did**

- Asked Claude Code to read Assignments 1 and 2 first, then gave it the Assignment 3 brief and asked it to set up the folder from my Assignment 2 GitHub repository.
- Made the feature decisions when asked. For the API I chose my GitHub repositories, and to keep the Hijri panel as well. From four offered features (visit timer, experience level picker, remembering the project view, a stricter contact flow) I chose only the visit timer.
- Decided the repository should be pushed from my own account through git in the terminal, so the commits are mine.
- Approved downloading Lighthouse to run the audits the brief asks for.

**What the AI did**

- Wrote all the new code and the comments in it: `js/github.js`, `js/timer.js`, `UI.fetchJSON` and `UI.RequestError` in `js/ui.js`, the new HTML sections and the CSS for them.
- Chose the implementation details: the four-step loading rule with a 10-minute cache, detecting the rate limit from GitHub's headers, checking saved copies with the same function as live replies, rejecting links that do not point at github.com, counting only visible time with `performance.now()`, scheduling the timer on whole seconds, and the responsive image sizes.
- Moved the Hijri request onto the shared function, so the two APIs do not have duplicate code.
- Tested every feature in the browser and fixed what the tests found.
- Ran Lighthouse before and after, and acted on what it found.
- Wrote the README and both docs, and kept a session log in a working notes file (`CLAUDE.md`, not part of the repository).
- Made the commits on feature branches, each with an `Assisted-by` line.

## 3. How the work was tested

After each feature, Claude Code opened the page in Chromium and checked it, instead of assuming the code worked.

- **Forcing API failures.** `window.fetch` was replaced with fake versions that return a 403 with the rate-limit headers, a 403 without them, a 404, a 500, a reply that is not JSON, a reply that is not a list, a rejected request, and a request that never answers. Each was run twice, once with a saved copy of the repositories and once without.
- **Saved copies of different ages.** The saved timestamp was edited to 5 minutes ago, 2 hours ago and 1 hour in the future, to test each branch of the cache rule. A saved copy with a `javascript:` link was written by hand to test that it is rejected.
- **The timer.** The page was told the tab was hidden by overriding `document.hidden` and firing `visibilitychange`, to check the count stops and resumes. The page was reloaded to check the count continues. Storage was made to throw.
- **Counting requests.** The browser's resource timing list was read after a reload, to prove a fresh saved copy makes no request to GitHub.
- **Measuring.** Sideways overflow at six widths in both themes, text contrast of every new element in both themes, the number of grid columns, and the tab order to the repository cards.
- **JavaScript off and `file://`.** Separate browser contexts with JavaScript disabled and with the page opened from disk.
- **Regression.** The Assignment 2 features (theme, name, search and filter, contact form) were run again after the changes.
- **Lighthouse,** mobile and desktop, on the Assignment 2 code and on this code.

### Forced GitHub failures

| Forced failure | With no saved copy | With a saved copy |
| --- | --- | --- |
| 403 with `x-ratelimit-remaining: 0` | Rate limit message with the reset time | Saved list plus the rate limit message |
| 403 without the rate-limit header | Server problem message | Saved list plus the server message |
| 404 | Account not found message | Saved list plus that message |
| 500 | Server problem message | Saved list plus that message |
| Reply not JSON | Unreadable reply message | Saved list plus that message |
| Reply not a list | Unreadable reply message | Saved list plus that message |
| Rejected request | Could not be reached message | Saved list plus that message |
| Offline | Offline message | |
| Never answers | Timeout message after 8.03 seconds | |

After each one, the real `fetch` was put back and Try again was pressed. The list came back every time, with focus on the Refresh button. "Failed to fetch" never appeared on the page. The Hijri panel was put through offline, 500, missing fields and a rejected request after its refactor, and behaved exactly as in Assignment 2.

## 4. Bugs found and fixed

These are the bugs the checks found. Each one was in code the AI had just written, except number 3, which was in the AI's Assignment 2 code.

| # | Bug | How it was found | Fix |
| --- | --- | --- | --- |
| 1 | After a reload, the GitHub section said "0 public repositories" and "There are no public repositories on this account yet", although four were saved. The saved objects used the field name `url`, but the check that reads them back required GitHub's `html_url`, so every saved repository was thrown away | The first browser check of the section | The page now keeps GitHub's own field names, so the same check works on live replies and saved copies. A saved copy whose entries all fail the check is now treated as broken and ignored, instead of being shown as an empty account |
| 2 | On wide screens the four repository cards were laid out as a row of three and one card alone | Screenshot at 1280px | A fixed two-column grid, one column on phones, with an odd last card spanning the row like the project grid |
| 3 | The scroll reveal measured every section with `getBoundingClientRect()` at start-up, forcing an extra layout. Lighthouse attributed 40.8 ms to it on mobile | Lighthouse forced reflow audit | Positions are now read from the IntersectionObserver's first report, which provides them without forcing a layout. Re-tested: sections on screen still show at once, the rest fade in on scroll, and loading at `#contact` shows everything above it |

One more problem was caught by reading the code before it ran: the first version of `js/github.js` used `STAGGER_CAP`, a constant defined in `js/projects.js`. That works while both files load, but would throw if `projects.js` failed, which goes against the rule that one feature cannot stop another. It got its own constant.

**Problems in the process, not the page:**

- The first test of the scroll reveal fix reported that no section appeared when scrolled to. The app's browser pane was hidden at the time, and a hidden page does not run IntersectionObserver callbacks. Run again in Playwright's browser, it worked.
- One test script went from `/` to `/#github`, which only changes the hash and does not reload the page. So each check read the page from the previous step, and the dark and light results looked swapped.
- The test browser kept serving an old copy of `styles.css`, so the grid fix looked like it had not worked. Comparing the stylesheet the page had loaded with the file on the server showed the difference. A forced reload fixed it.
- The first Lighthouse summary script failed because Python on Windows read the report with the wrong text encoding. It was run again with UTF-8.
- An axe-core accessibility run, done in Assignment 2, was blocked this time by Claude Code's permission system, because it loads a script from a CDN into the page. It was not worked around. Contrast was measured by hand instead, and Lighthouse's accessibility audit scored 100.

## 5. Benefits and challenges

### Benefits

- **Testing I would not have done by hand.** Forcing nine kinds of API failure in two situations each, editing cache timestamps, faking a hidden tab and counting network requests would each take a long time manually.
- **Measured performance work.** Lighthouse was run before and after, and the one real problem it found in the page's code (the forced layout) was fixed and confirmed gone.
- **Less duplicated code.** Adding a second API was the point where the AI moved the request logic into one shared function instead of copying it.
- **A clean history.** Each feature was built on its own branch and merged, with a commit message that says what changed and why.

### Challenges

- **Its first version is not always right.** Bug 1 would have shown an empty GitHub section to every returning visitor. It was found only because the feature was opened in a browser.
- **Its tests can be wrong.** Three test readings were wrong (the hidden pane, the hash-only navigation, the cached stylesheet). Each time the page was fine and the test had to be fixed.
- **Tool limits.** The axe-core run could not happen. Only Chromium was available, so Firefox and Safari are untested.
- **It needs my decisions.** The AI asked before choosing the API, the features, downloading Lighthouse and pushing. Those were real choices with trade-offs, not things it could look up.

## 6. Learning Outcomes

_To be written by me, in my own words, before submission._

## 7. Responsible use and modifications

### Responsible use

- **No invented data.** The GitHub section shows exactly what GitHub returns for my account. No numbers or results are made up.
- **No secrets.** The GitHub and Aladhan APIs need no key or token. No password, token or `.env` content was shared with the AI or put in the repository.
- **No invented bugs or results.** This report lists only what the session log recorded, and the C01 conversation shows each test being run.
- **Honest limits.** The docs say plainly what was not tested and what Lighthouse still lists.
- **Evidence kept out of the repository.** The conversation and the intermediate files are in the AI evidence ZIP, not in the repository. `.gitignore` excludes `conversations/`, `artifacts/` and the ZIP.
- **Credit in the history.** Every commit with AI-assisted code has an `Assisted-by: Claude Code (Claude Opus 5.5)` line.

### Modifications to the AI's output

These changes were made after the AI's first version, in response to the browser checks, Lighthouse, or my decisions:

- The three bug fixes in section 4, and the `STAGGER_CAP` change.
- Long repository descriptions were limited to four lines after the first screenshot showed one card much taller than the rest.
- The photo quality was chosen by comparing the file sizes of three WebP qualities (75, 80 and 85) and checking the chosen one by eye. A 600px version was added after measuring how wide the photo is actually drawn.
- The scope of the new features was cut to what I chose: the GitHub section and the visit timer. The other three offered features were not built.

## 8. Code I need to understand before submitting

These are the parts of the new code worth being able to explain:

- `UI.fetchJSON` in `js/ui.js`: why `fetch` needs an explicit `response.ok` check, and how `AbortController` gives a timeout.
- `load()` in `js/github.js`: the four steps, and why an old copy with a warning is better than an error.
- `describeFailure()` in `js/github.js`: how a 403 is told apart from the rate limit.
- `toRepo()` in `js/github.js`: why its output must be valid input to itself.
- `elapsed()`, `pause()` and `resume()` in `js/timer.js`: why `performance.now()` and not `Date.now()`.
- `reveal()` in `js/ui.js`: why reading `entry.boundingClientRect` avoids a forced layout.

## 9. Usage Log

| ID | Tool (model) | Date | Purpose | Files affected | What I changed and how I verified it |
| --- | --- | --- | --- | --- | --- |
| C01 | Claude Code (Claude Opus 5.5) | 2026-11-21 | Read Assignments 1 and 2, create the Assignment 3 folder from my Assignment 2 GitHub repository, then build Assignment 3: shared request function, GitHub repositories section, visit timer, performance pass with Lighthouse, tests, documentation, commits and push | `index.html`, `css/styles.css`, `js/ui.js`, `js/hijri.js`, `js/github.js` (new), `js/timer.js` (new), `assets/images/profile.webp` and `profile-600.webp` (new), `README.md`, `docs/technical-documentation.md`, `docs/ai-usage-report.md` | I chose the API (GitHub, keeping Hijri), cut the new features to the visit timer only, approved the Lighthouse download, and had it pushed from my account. Verified in Chromium through Playwright: every API failure forced with and without a saved copy, the cache rules, the timer, six widths in both themes, contrast, keyboard, JavaScript off, `file://`, Assignment 2 features, and Lighthouse before and after. Three bugs found and fixed, listed in section 4 |
| A01 | Claude Code (Claude Opus 5.5) | 2026-11-21 | The project files as the AI produced them at the end of C01, before any edits of mine | Every file in the repository | Included in the AI evidence ZIP under `artifacts/` |
| A02 | Lighthouse 12.8.2, run by Claude Code | 2026-11-21 | Lighthouse reports for this code, mobile and desktop | None (reports only) | Included in the AI evidence ZIP under `artifacts/`. The scores are in the README and the technical documentation |

## 10. Declaration

I declare that this report and the attached evidence document all of my AI use in this assignment, with complete and unedited conversations, and that I understand and can explain all the code I submitted after it was generated. I understand that undeclared AI use or a false declaration will be treated as plagiarism according to KFUPM regulations if i did not read the code before submiting.

**Name:** Asim Asiri
**Student ID:** 202338490
**Date:** 2026-11-21

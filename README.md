# Dashboard

My personal dashboard: a Chrome startup page and an installable Android app (PWA).

- **Dailies** (the main focus): a checklist that resets at local midnight, with optional
  links and **drag-to-reorder**
- **Points and a daily target:** every daily and task is worth points; today's score is a
  ring next to Dailies ("45 / 60 pts") with a small celebration when you reach the target
- **Statistics page:** a heatmap of your days, streaks, week/month totals and a 30-day chart,
  from a history that saves every day
- **To-Do:** one-off tasks with optional due dates, as a sorted **list** or a **month calendar**
- **Weekly major goal:** one goal per Sunday-to-Saturday week, a Sunday reminder, a countdown, and history
- **Words of affirmation:** a new one each day in its own font, plus a "show another" button
- **Goals:** short-term and life goals in two tabs
- **Ideas:** things you could do, a "Pick one for me" button, and one-tap "send to To-Do"
- To-Do, Goals and Ideas **fold into one-line summaries**, so Dailies stays the centrepiece
- **Double exposure background:** your own photos combined like analog film exposed twice
  (pure pixel math, no AI), as the full-page background, with optional slow animation
- Greeting with your name, light/dark/system theme, JSON backup export and import
- Works offline. Data stays on your device (`localStorage` + `IndexedDB`).

Built with Vite, React, TypeScript, Tailwind CSS v4, React Spring, dnd-kit, and (for the
optional live background) React Three Fiber.

---

## Run it locally

You need [Node.js](https://nodejs.org) (LTS).

```bash
npm install      # first time only: downloads dependencies into node_modules/
npm run dev      # starts a dev server at http://localhost:5173 with live reload
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks, then builds the production site into `dist/` |
| `npm run preview` | Serves `dist/` locally, to test the real build (including offline mode) |
| `npm run typecheck` | Type-checks only |
| `npm run generate-icons` | Regenerates the app icons from `public/favicon.svg` |

> **Testing on your phone during development:** run `npm run dev -- --host` and open the
> "Network" URL it prints on your phone (same Wi-Fi). Note that data saved there is
> separate from the data on the deployed site (see "Where my data lives" below).

---

## Deploy to GitHub Pages

Deploys happen automatically. The workflow in `.github/workflows/deploy.yml` builds and
publishes the site every time you push to `main`.

**One-time setup:** on GitHub, open the repo, then **Settings → Pages**. Under
**Build and deployment → Source**, choose **GitHub Actions**.

After that:

```bash
git add .
git commit -m "Describe your change"
git push
```

Watch progress in the repo's **Actions** tab. When it's green, the site is live at
**https://joaquinrodriguezph.github.io/dashboard/**

**How the base path works:** GitHub Pages serves the site under `/dashboard/`, not `/`.
`vite.config.ts` reads the `GITHUB_REPOSITORY` variable (which GitHub Actions sets to
`JoaquinRodriguezph/dashboard`) and uses `/dashboard/` as the base. If you rename the
repo, the base path follows automatically.

---

## Set it as your Chrome startup page

1. In Chrome, open **Settings → On startup**.
2. Choose **Open a specific page or set of pages → Add a new page**.
3. Enter `https://joaquinrodriguezph.github.io/dashboard/` and click **Add**.

Optional: to make the **Home** button open it too, go to **Settings → Appearance →
Show home button** and enter the same URL.

(Chrome doesn't let you replace the *New Tab* page with a URL without an extension.)

---

## Install it on Android

1. Open `https://joaquinrodriguezph.github.io/dashboard/` in **Chrome** on your phone.
2. Tap **⋮ → Add to Home screen → Install** (Chrome may also show an "Install app" banner).
3. It now opens full-screen from your home screen, like a normal app, and works offline.

**Updates:** when you push a new version, the app downloads it in the background
and uses it the next time you open it.

---

## Layout

```
Laptop (≥ 1024px), up to 1600px wide
┌──────────── greeting · date · [🎲 re-roll] [theme] [⚙] ────────────┐
├─────────────┬──────────────────────────────┬────────────────────────┤
│ Affirmation │                              │ › To-Do  2 due today   │
│ Weekly goal │      DAILIES (centre)        │                        │
├─────────────┴───────────────┬──────────────┴────────────────────────┤
│ › Goals  3 short-term · 5 life │ › Ideas  14 ideas                  │
└─────────────────────────────┴────────────────────────────────────────┘
(› = collapsed; tap a header to open it)

Phone / tablet: one column
greeting → Dailies → To-Do → Affirmation → Weekly goal → Goals → Ideas
```

### Collapsible sections (`components/CollapsibleCard.tsx`)

To-Do, Goals and Ideas fold into a one-line header so Dailies gets your attention. Dailies
itself never folds.

- **Click or tap the header** to open or close it; the chevron turns. While closed, the
  header shows a summary: To-Do "2 due today · 1 overdue" (or "3 open" / "Nothing to do"),
  Ideas "14 ideas", Goals "3 short-term · 5 life" (goals not yet completed).
- **Remembered on this device**, like the theme. All three start closed. It's stored in
  `localStorage` under `dash.device` (through `getDevicePrefs()`/`saveDevicePrefs()` in
  storage.ts) and is **not** part of backups, so your phone and laptop can be laid out
  differently and importing a backup never changes the layout.
- **Accessible:** the header is a real `<button>` inside the `<h2>` with `aria-expanded`,
  so Enter/Space and screen readers work, with a visible focus ring. Closed content is
  `inert` (Tab skips it). The card's buttons (Clear completed, Pick one…) appear only while open.
- **Animation:** height + fade (~250 ms) with React Spring, using a one-row grid that springs
  between `0fr` and `1fr`, so the content never has to be measured. Off with reduce motion.
- **Reusing it:** `const [open, toggle] = useCollapsible('ideas')` (from `lib/settings.tsx`), then
  `<CollapsibleCard title="…" summary="…" open={open} onToggle={toggle}>…</CollapsibleCard>`.
  A new collapsible section also needs its name added to `CollapsibleSection` in `types.ts`
  and to `DEFAULT_DEVICE_PREFS` in storage.ts.

- On Sundays without a weekly goal, a small **"Set this week's goal"** chip appears under the
  greeting. Tapping it scrolls to the weekly goal card and focuses its input. It's small on
  purpose, so it never pushes Dailies down.
- **How one set of cards makes both layouts** (`App.tsx` → `Sections`): each section has an
  `area` in the registry (`sections/index.ts`). `ROWS` defines the laptop rows: main
  (left · centre · right) and bottom (Goals · Ideas). Each row is a grid and each area a
  flex column. On phones, both wrapper levels get `display: contents` (the wrapper boxes
  disappear), so every card joins one single list, and CSS `order` sorts them by `mobileOrder`.
- **Feedback and motion:** cards lift on hover; buttons, rows and tabs have hover, pressed
  (for touch) and keyboard-focus states (`components/buttonStyles.ts`, `Card.tsx`). List rows
  animate in and out and slide when reordered (`components/AnimatedList.tsx`). With the OS
  "reduce motion" setting on, all of this is switched off.

---

## The sections

### To-Do (`sections/todo/`, logic in `lib/todos.ts` and `lib/calendar.ts`)

- **List | Calendar:** a toggle at the top switches views, remembered on this device. Both
  views show the same tasks: one is added in the list, it's on the calendar too.
- Add, edit, complete and **delete** tasks. Delete works on every task, completed ones too.
- **Due date (optional):** the browser's own date picker (Android's calendar on the phone,
  Chrome's popup on a laptop) plus quick chips: *Today*, *Tomorrow*, *Next week* (the coming
  Sunday, since weeks run Sunday–Saturday), *No date*.
- **Sorting:** overdue first (oldest first, with a red bar and a red "2 days overdue" chip),
  then today, then upcoming (soonest first), then tasks with no date, then completed ones.
- **Friendly dates:** "Today", "Tomorrow", "Sat, Nov 7" (the year only if it's not this
  year), "1 day overdue". A finished task just shows its date. Labels update by themselves at
  midnight.
- The 👁 button hides completed tasks; **Clear completed** deletes them permanently (it asks first).

#### Calendar view (`sections/todo/TodoCalendar.tsx`)

```
 ‹      November 2026      ›  [Today]
  S   M   T   W   T   F   S
  1   2   3   4   5   6   7
  8   9  10  11  12  13  14
          ∘
 15  16 [17] 18  19  20  21        15 = red: overdue, unfinished
  •      ••          •             dots = open tasks (up to 3, "+" for more)
 …                                 ∘ = only finished tasks that day
─────────────────────────────
 Tue, Nov 17 · Today
  ○ Submit report        ✎ 🗑
  ＋ Add task for Tue, Nov 17       (the due date is set to that day)
─────────────────────────────
 No date
  ○ Buy groceries        ✎ 🗑
```

- **‹ ›** change month (a short slide; none with reduce motion), **Today** jumps back.
  Today has an accent ring; the selected day is filled in.
- **Tap or click a day** to see its tasks below, where you can add (the date is preset),
  check off, edit (which can also move the date) and delete. Tasks without a date are in
  the **No date** list underneath, so nothing disappears. *Hide completed* applies here too.
- **Keyboard:** the selected day is the one Tab stop in the grid; **arrows** move by a day
  or a week, **Page Up/Down** by a month. Screen readers hear e.g. "Sunday, November 15,
  1 open task, overdue".
- **How the grid is made** (`lib/calendar.ts`, no library): find the Sunday on or before
  the 1st and list the next 42 days. Always 6 weeks, so the card doesn't change height from
  month to month. Local time, weeks start on Sunday like the weekly goal.
- **On a phone** the full month fits: each day is a ~45×44 px button, the recommended
  minimum for fingers.
- **Shared code:** both views use `TodoTaskList.tsx` for the rows, and `Todo.tsx` owns the
  data and the actions (check, edit, delete, add) and hands them to whichever view is showing.

### Goals (`sections/Goals.tsx`)

Short-term and life goals in two tabs. Add, edit, complete and delete; hide completed;
**Clear completed** deletes the completed goals *of the tab you're on* (it asks first).

### Ideas (`sections/Ideas.tsx`)

A place to dump things you could do.
- **Pick one for me:** the highlight hops between ideas for under a second, slowing down,
  then lands on one with a little pop ("How about this one?"). It prefers ideas you haven't
  sent to To-Do yet. With reduce motion, it shows the pick straight away.
- **Send to To-Do** (the list-plus icon): pick an optional due date and it becomes a To-Do
  task. The idea stays in the list, marked **"Added to To-Do"**.

### Dailies: drag to reorder (`sections/Dailies.tsx`, using @dnd-kit)

- **Drag the ⋮⋮ handle** on the left of a task, with a mouse or with your finger on the phone.
  Only the handle starts a drag (it has `touch-action: none`), so swiping anywhere else
  scrolls the page and tapping still checks tasks off.
- **Keyboard:** Tab to a handle, press **Space** to pick it up, **↑/↓** to move, **Space** to
  drop (Esc cancels). Screen readers announce the task name and position.
- The new order is saved straight away (`setDailyOrder` in storage.ts).
- The ↑/↓ buttons in **Edit** mode still work too.

### Words of affirmation: the font (`sections/Affirmations.tsx`)

The affirmation has its own voice: **Playfair Display italic**, in **plum** (light mode,
`oklch(0.42 0.09 350)`) or **dusty rose** (dark mode, `oklch(0.85 0.07 350)`). Both are
tokens in `index.css` (`--affirmation`, used as `text-affirmation`), and the font is the
Tailwind class `font-affirmation`.

- **Bundled, not downloaded from Google Fonts,** so it works offline: the file comes from the
  `@fontsource/playfair-display` package. Only the one style that's used is included:
  italic, weight 400, Latin characters, as a single ~22 kB `.woff2`. It's declared with
  one `@font-face` at the top of `index.css`, pointing straight at that file.
- **Offline:** `woff2` is in the service worker's precache list (`vite.config.ts`), so the
  installed app has the font with no internet.
- `font-display: swap` shows the text immediately in a fallback serif (Georgia) and switches
  when the font is ready. The text uses `font-normal` because only weight 400 is bundled; a
  bolder weight would be faked by the browser.
- **Readable on the photo background:** contrast measured at 8.0–10.6:1 (the minimum is 4.5)
  over bright, dark and busy photos, in light and dark mode, on phone and laptop.
- When it changes ("show another"), it cross-fades as before.

---

## Points, the daily target, and history

### Points and the daily target

- **Every daily and every To-Do task has points** (a whole number from 0 to 999, default
  10). Set them in the small **pts** box when you add or edit an item; each item shows a
  "10 pts" badge.
- **Scoring:**
  - Ticking a daily adds its points to **today's score**; unticking takes them away.
  - Completing a task adds its points to the score of **the day you complete it**,
    whatever its due date. Un-completing it the same day takes them away.
  - Un-completing a task you finished on an **earlier** day leaves that day as it was
    (past days are final); the task simply becomes open again.
- **Daily target** (Settings → Daily target): the score that makes it a good day. Next to the
  box is a suggestion, 80% of your dailies' total rounded to 5 (`suggestTarget()` in
  `lib/score.ts`), with a button to use it. Not 100%, so a good day doesn't require every
  single thing; tasks can make up the rest.
- **The ring next to Dailies** shows "score / target pts", counts up and down with a spring,
  and under the title says e.g. "3 of 5 done · 15 pts to go". The moment you first reach the
  target that day, the small burst plays, **once per day**: unticking and ticking again, or
  reloading the page, won't replay it (the day remembers `reachedAt`). With reduce motion,
  nothing animates.

### How the history is saved (`src/storage.ts` → "Score history")

- **One record per day with activity:** the date, every item you completed (its name,
  whether it was a daily or a task, its points, and the time), the total score, the target
  that applied that day, and whether you reached it.
- **The record *is* the score.** Ticking a daily or completing a task adds an item to
  **today's** record; unticking removes it. There's no separate number that could drift.
- **Snapshots:** each item's name and points are *copied* into the record when you complete
  it. Renaming, re-scoring or deleting an item later never changes a past day, and neither
  does changing the target: only today's record follows the current target.
- **Midnight:** only today's record is ever written, so when the date changes, yesterday's
  record is final simply because nothing writes to it any more. Nothing has to run at
  midnight, which is why it works the same whether the app stayed open overnight or was
  closed for a week.
- **Missed days** (no activity) aren't stored. `history.getRange()` fills them in with
  score 0 when the statistics read them.
- **History starts** the day this feature was installed (`historyStart`); days before it
  don't count as missed, and older days can't be filled in.
- **Reading it:** all through storage.ts:
  - `history.getDay(date)`: one record, or null
  - `history.getRange(from, to)`: one entry per day from the history start up to today,
    missed days included
  - `history.getStart()`

### Statistics page (`#/stats`, `src/pages/StatsPage.tsx`)

Open it with the **chart button** in the top-right of the header; **← Dashboard** (or your
phone's back button) goes back.

- **Current streak / best streak:** days in a row with the target reached. Today doesn't
  break your streak until it's over: in the morning your streak still shows.
- **This week / this month** (Sunday–today, 1st–today): days the target was reached
  ("4 of 5 days"), average daily score (missed days count as 0), and total points.
- **Activity heatmap:** one square per day, one column per week (Sunday at the top):
  accent = target reached, light accent = some points, grey = missed, faint = before
  history started. Today is outlined. On a phone it scrolls sideways and starts at today.
  Arrow keys move between days.
- **Last 30 days:** a bar per day (accent if the target was reached, grey if not) with the
  target as a dashed line, which steps where you changed it.
- **Day details:** tap a square or a bar to see that day's score vs target and the list of
  what you completed, as it was then.

How it's built:
- **Routing:** the page is `#/stats`. The part after `#` never reaches a server, so
  refreshing works on GitHub Pages and offline, and opening the page adds a history entry
  so the phone's back button returns (`lib/useHashRoute.ts`).
- **Lazy-loaded:** `React.lazy`, so its code (~5 kB) isn't part of the dashboard's startup;
  it's precached for offline use.
- **No chart library:** the heatmap is a CSS grid of buttons and the bar chart is plain SVG
  drawn at its real width, so labels stay crisp on a phone. The maths (streaks, totals) is in
  `lib/stats.ts` as plain functions.

---

## Double exposure background

Upload a few of your own photos in **Settings → Double exposure background** and the app
layers them like a roll of film that was exposed twice, then uses the result as the
**background of the whole page**. It's done entirely on your device with canvas pixel math:
no AI, and nothing is uploaded anywhere.

- **Re-roll** (🎲 in the header, or the button in Settings) picks a new random seed: the same
  photos, arranged differently.
- **Color:** *Natural* (default, your photos' true colours), *Warm film*, or *Black & white*.
- **Sliders:** exposure, grain, light leak, vignette, misalignment, frame overlap.
- **Download JPEG** saves the full 1800×1200 frame.
- **Use as page background** turns the whole feature on or off. Off (or no photos) gives a
  calm gradient that follows light/dark mode.

### Readability without tinting the photo

On top of the photo sits a **neutral** layer: pure white in light mode, pure black in dark
mode (80% behind the greeting at the top, 58% further down). The cards are frosted glass
(88% opaque with a strong background blur). There's no colour tint and no CSS filter on the
photo, which is why the background is exactly the image in the Settings preview. Text
contrast was measured over very bright, very dark and busy photos, in both themes, on phone
and laptop: every text meets WCAG AA (4.5:1 for normal text).

### Background animation (Settings → Background animation)

| Setting | Default | What it does |
|---|---|---|
| Slow pan and zoom | on | The photo drifts and zooms very slowly (50 s cycle) |
| Living film grain | on | A faint layer of grain that flickers 8 times a second |
| Drifting light | off | A soft white glow moving slowly across the photo |
| Live double exposure | off | Your photos blend **in real time** with WebGL and slowly drift past each other |

How they stay cheap:
- **The first three are CSS animations** that only change `transform` (`.bg-anim` in
  `index.css`), which the GPU handles without repainting the page.
- **Live mode** (`three/LiveExposure.tsx`) is a React Three Fiber shader doing the same maths as
  the still image, every frame.
  - Its code (with three.js) is **only downloaded when you switch it on**.
  - It's capped at **30 fps** and renders at 1× pixel density.
  - The still photo stays underneath while it loads, or if WebGL isn't available.
  - The Settings preview shows the still version.
- **Tab hidden:** everything pauses (`<html data-hidden="true">` in CSS, and the live loop
  checks `document.hidden`).
- **Reduce motion:** nothing animates, and live mode isn't loaded at all.

### How the effect works (`src/lib/exposure/render.ts`)

It follows what physically happens to film:

1. **Frames.** Each photo is drawn *cover-fit* (filling the frame, cropping the excess) onto
   the same 1800×1200 canvas with a small random offset, rotation and zoom (more with
   *Misalignment*). *Frame overlap* shifts each frame sideways, like a film advance that
   didn't wind far enough. All randomness comes from a seeded generator (`random.ts`),
   so the same photos, settings and seed always give the exact same image.
2. **Light adds up.** Pixels are converted from sRGB to **linear** light (sRGB 0.5 is only
   about 21% of the light of 1.0) and the frames are **added together**, scaled by
   `exposure / √(number of photos)`. That's why bright areas of one photo wash over the
   other while dark areas let it show through, just like film.
3. **Before developing**, still in linear light:
   - a **vignette** multiplies the light down towards the corners
   - the **colour mode** applies (*Warm film*: ×1.08 red, ×0.84 blue; *Natural* and
     *B&W*: nothing)
   - a **light leak** (a soft glow from just outside one random edge) is *added*: white
     light in Natural and B&W, orange in Warm film
   - *B&W* then turns the light into brightness only (Rec. 709 weights)
4. **Developing.** A film "shoulder" curve, `1 − exp(−light)`, rolls off bright highlights
   smoothly instead of clipping them, applied equally to R, G and B so it can't shift colour.
   Then the result is converted back to sRGB.
5. **Chromatic fringing.** Red is sampled 2px to the right and blue 2px to the left, giving
   the subtle colour edges of a cheap lens (skipped in B&W).
6. **Grain.** One random value per pixel (the same for R, G and B, so the grain is
   monochrome), scaled by `v × (1 − v)`. That's zero in pure black and white and strongest
   in the midtones, like real film grain.

### Where the old brown tint came from

Before this update every image had a brownish cast. I measured the pipeline with a perfectly
neutral grey input. **The light leak was the only cause:**

- **Its colour was fixed orange** (`1.0, 0.42, 0.1`) for every image.
- **Its radius was 35–60% of the frame *width***, so it covered the whole picture, not one
  edge. A grey input came out as `148, 126, 106` instead of grey.
- **It was added *after* the vignette darkened the photo,** so in darker areas the orange
  turned brown.

Everything else (vignette, shoulder curve, grain, fringing, the CSS around the image) was
already neutral. With the leak at 0 the output was grey to within ±1. Now *Natural* uses
a white leak that stays near one edge, and grey stays grey to within 1–2 levels. The orange
look is still available, on purpose, as *Warm film*.

**Performance of the still image:** the pixel work runs in a **Web Worker**
(`exposure.worker.ts`), a separate thread, so the page never freezes. One image takes about
0.6 s. The result is **cached**: on startup the app just shows the cached JPEG, and it only
regenerates after a re-roll, a photo change or a setting change (debounced while you drag a
slider). The worker isn't even downloaded until it's needed.

---

## Where my data lives

| What | Where | Why |
|---|---|---|
| Settings, dailies, to-dos, goals, ideas, affirmations, weekly goals | `localStorage` (keys `dash.v1.*`) | Small text data |
| Score history (one record per active day) and the day it started | `localStorage` (keys `dash.v1.history`, `dash.v1.historyStart`) | About 1 kB per day: years fit easily |
| This device's layout: which sections are collapsed, To-Do list or calendar | `localStorage` (key `dash.device`) | A display preference per device, like the theme. **Not in backups** |
| Your photos (downscaled to ≤1600px JPEG, ~100–300 KB each) and the cached double exposure | `IndexedDB` (database `dashboard`) | Binary images are too big for localStorage (~5 MB limit) |

Both are **per browser, per device**:

- Your laptop and phone each have their own copy, and `localhost` (dev) is separate from
  the deployed site.
- Clearing site data in the browser deletes it. **Use Settings → Export data now and then**
  to download a backup. Use **Import data** to restore it or move it to another device.

**The PWA and your photos:** the service worker only caches the app's own files (HTML, JS,
CSS, icons, the worker script and the live-mode code, so everything works offline). Photos
never go through it: they're read from IndexedDB and shown via `blob:` URLs.

### Backups

- A backup (format version 4) contains everything: settings (including the daily target),
  dailies and to-dos with their points, goals, ideas, affirmations, weekly goals, **the full
  score history** and, optionally, photos. Every history record is checked on import and its
  score recalculated from its items.
- **"Include photos"** (on by default) puts your photos into the backup file as base64
  text. That makes the backup complete, so one file moves everything to a new phone.
  The downside is size: photos grow by about a third as text, so 10 photos make roughly a
  3–5 MB file. Untick it for a small backup with just your lists.
- **Import is safe:** the whole file is validated *before* anything is written, including
  decoding every photo. A wrong or broken file shows an error and changes nothing. A valid
  one asks for confirmation first and says what will happen:
  - a backup **with** photos replaces your current photos
  - a backup **with** history replaces your current history
  - things an **older backup doesn't contain** (to-dos, ideas or history from before they
    existed, or photos) are **kept** as they are now; items without points get 10
- The generated image isn't included in backups; it's re-created from the seed.

### Data migrations

When the shape of saved data changes, `initStorage()` in `src/storage.ts` upgrades old data
automatically, once, before the app shows anything. It reads `dash.schemaVersion` and runs
each numbered step in `MIGRATIONS` that hasn't run yet:

| Step | What it adds |
|---|---|
| 2 | double exposure settings |
| 3 | To-Do (starts empty) and its "hide completed" setting |
| 4 | double exposure colour mode (Natural) |
| 5 | background animation settings |
| 6 | points (every existing daily and task gets 10), the daily target (set to the suggestion), the history start date, and whatever was already done that day goes into its record |

Your goals were never converted. They stay exactly as they were, just shown in the new
bottom row.

### Switching to Supabase later

All reading and writing goes through **one file: `src/storage.ts`**. Every function there
is `async` and returns plain data (`getDailies()`, `addTodo(…)`, `ideaToTodo(id, date)`,
`setDailyChecked(today, id, checked)`, `history.getRange(from, to)`, `getPhotos()`, …). To move to Supabase,
rewrite the insides of those functions, using tables for the lists and **Supabase Storage**
for the photos, and keep the same names and return types. No component needs to change.
(`lib/idb.ts` is a helper used only by storage.ts.) `onDataChange()` is how cards hear about
each other's changes (e.g. Ideas → To-Do); Supabase realtime could call it the same way.

(One exception: `dash.themeCache` stays in localStorage on purpose. It lets the tiny script
in `index.html` apply dark mode *before* the app loads, so the page never flashes white.)

---

## Project structure

```
src/
├─ main.tsx               Entry point: mounts React, sets reduced-motion for animations
├─ App.tsx                Page layout: background, dashboard or #/stats page, lazy settings
├─ index.css              Tailwind + light/dark color tokens + background animations
├─ storage.ts             ★ The only file that reads or writes data (+ migrations)
├─ types.ts               Data shapes (Daily, Todo, Goal, Idea, DayRecord, Photo, …)
├─ lib/
│  ├─ dates.ts            Local-time date helpers (weeks start Sunday)
│  ├─ todos.ts            Due-date status, friendly labels, sorting, quick dates
│  ├─ calendar.ts         Month grid (6 weeks from Sunday), task counts per day
│  ├─ score.ts            Suggested daily target, points parsing
│  ├─ stats.ts            Streaks and week/month summaries (pure functions)
│  ├─ useHashRoute.ts     The two-page router (#/stats)
│  ├─ useElementWidth.ts  Measures a box's width (for drawing the SVG chart at real size)
│  ├─ useToday.ts         Today's date; re-renders at midnight and when the tab wakes
│  ├─ settings.tsx        Settings shared via React context (useSettings)
│  ├─ useTheme.ts         Applies light/dark, follows the system in "system" mode
│  ├─ useReducedMotion.ts Reads the OS "reduce motion" setting
│  ├─ backup.ts           Export download + import validation (format v4, with history)
│  ├─ idb.ts              Tiny IndexedDB helper, used only by storage.ts
│  ├─ resizeImage.ts      Downscales uploads to ≤1600px JPEG
│  ├─ grainTexture.ts     The noise tile for the living grain
│  ├─ url.ts              Cleans up links (adds https://, blocks non-web links)
│  └─ exposure/           ★ Double exposure
│     ├─ render.ts        The film algorithm + colour modes (pure functions)
│     ├─ exposure.worker.ts  Runs render.ts off the main thread
│     ├─ client.ts        renderDoubleExposure(): talks to the worker
│     ├─ ExposureContext.tsx Photos + cached image + when to regenerate
│     └─ random.ts        Seeded random numbers (reproducible results)
├─ components/            Reusable UI: Card, CollapsibleCard, TextForm, DateField, CheckButton,
│                         IconButton, Tabs, Switch, ProgressRing, PointsBadge, AnimatedList,
│                         StrikeText, Celebration, buttonStyles, PageBackground
├─ sections/              One file per dashboard section, plus index.ts (the registry)
│  │                      and the header pieces (Header, SundayGoalChip)
│  └─ todo/               To-Do: Todo.tsx (card + data), TodoTaskList.tsx (rows, shared by
│                         both views), TodoCalendar.tsx (month view)
├─ pages/StatsPage.tsx    The Statistics page (lazy-loaded)
├─ stats/                 Its parts: Heatmap, ScoreChart (SVG), DayDetails
├─ settings/              The settings dialog (lazy-loaded) + DoubleExposureSettings,
│                         DailyTargetSetting
└─ three/LiveExposure.tsx ★ The only WebGL code: live mode (lazy-loaded, off by default)
```

### How a few things work

- **Midnight reset:** checks are saved together with the date they were made. If that date
  isn't today, nothing counts as checked. `useToday()` sets a timer for midnight and
  re-checks whenever the tab becomes visible again (phones freeze background timers), so
  this works even if the page stays open overnight. The To-Do date labels use the same hook.
- **Offline:** `vite-plugin-pwa` generates a service worker that precaches every built file,
  including the ~0.9 MB live-mode chunk (the cache limit is raised to 5 MB in `vite.config.ts`).

---

## Add a new section

1. Create `src/sections/MySection.tsx`:

   ```tsx
   import { Card } from '../components/Card'

   export function MySection() {
     return (
       <Card title="My section">
         <p>Hello!</p>
       </Card>
     )
   }
   ```

2. Register it in `src/sections/index.ts`:

   ```ts
   import { MySection } from './MySection'

   export const SECTIONS: SectionConfig[] = [
     // ...existing sections
     { id: 'my-section', component: MySection, area: 'right', mobileOrder: 7 },
   ]
   ```

   - `area`: `'left'`, `'center'`, `'right'` (main row) or `'bottomLeft'`, `'bottomRight'`
     (bottom row) on laptops. Sections in the same area stack in the order they're listed.
     A new row = one more entry in `ROWS`.
   - `mobileOrder`: position in the single phone column (lower = higher up).

3. **If it stores data:**
   - Add its type to `src/types.ts` and a field for it to `AllData` (and to the optional
     part of `ImportData`, so older backups without it still import).
   - Add a key and `get…`/`add…`/`update…`/`delete…` functions to `src/storage.ts`,
     and include it in `exportAll()` and `importAll()`.
   - Add validation for it in `validateData()` in `src/lib/backup.ts`.
   - If you change the shape of data that's already saved, add a step to `MIGRATIONS` in
     `src/storage.ts` and bump `CURRENT_SCHEMA`.

4. For lists, use `<AnimatedList>` to get the add/remove/reorder animations for free.

---

## Changing the look

- **Affirmation font and colour:** `--affirmation` (both themes) and `--font-affirmation` in
  `src/index.css`. For another @fontsource font, install it, point the `@font-face` at its
  `latin-…-italic.woff2` file, and update the font name.
- **Colors:** edit the CSS variables in `src/index.css` (`:root` for light, `.dark` for dark).
  Components use names like `bg-surface` and `text-muted`, never raw colors. `--scrim` and
  `--scrim-strong` control how much the photo background is dimmed behind the content.
- **Buttons and cards:** hover, pressed and focus styles live in `components/buttonStyles.ts`
  and `components/Card.tsx`.
- **Film look:** tune the defaults in `DEFAULT_DOUBLE_EXPOSURE` (`src/storage.ts`) or the
  maths in `src/lib/exposure/render.ts`. Bump `ALGORITHM_VERSION` there so cached images
  regenerate. The live shader in `three/LiveExposure.tsx` imports the same colour constants.
- **Background animations:** the keyframes are at the bottom of `src/index.css`.
- **App icon:** replace `public/favicon.svg` and run `npm run generate-icons`.

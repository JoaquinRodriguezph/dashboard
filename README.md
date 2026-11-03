# Dashboard

My personal dashboard: a Chrome startup page and an installable Android app (PWA).

- **Dailies** (the main focus): a checklist that resets at local midnight, with a progress
  ring, optional links, **drag-to-reorder**, and a small celebration when everything's done
- **To-Do:** one-off tasks with optional due dates, sorted overdue → today → upcoming
- **Weekly major goal:** one goal per Sunday-to-Saturday week, a Sunday reminder, a countdown, and history
- **Words of affirmation:** a new one each day, plus a "show another" button
- **Goals:** short-term and life goals in two tabs
- **Ideas:** things you could do, a "Pick one for me" button, and one-tap "send to To-Do"
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
│ Affirmation │                              │ To-Do                  │
│ Weekly goal │      DAILIES (centre)        │                        │
├─────────────┴───────────────┬──────────────┴────────────────────────┤
│ Goals  [Short-term | Life]  │ Ideas  [Pick one for me]              │
└─────────────────────────────┴────────────────────────────────────────┘

Phone / tablet: one column
greeting → Dailies → To-Do → Affirmation → Weekly goal → Goals → Ideas
```

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

### To-Do (`sections/Todo.tsx`, logic in `lib/todos.ts`)

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

- A backup (format version 3) contains everything: settings, dailies, to-dos, goals, ideas,
  affirmations, weekly goals and, optionally, photos.
- **"Include photos"** (on by default) puts your photos into the backup file as base64
  text. That makes the backup complete, so one file moves everything to a new phone.
  The downside is size: photos grow by about a third as text, so 10 photos make roughly a
  3–5 MB file. Untick it for a small backup with just your lists.
- **Import is safe:** the whole file is validated *before* anything is written, including
  decoding every photo. A wrong or broken file shows an error and changes nothing. A valid
  one asks for confirmation first and says what will happen:
  - a backup **with** photos replaces your current photos
  - things an **older backup doesn't contain** (to-dos and ideas from before they existed,
    or photos) are **kept** as they are now
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

Your goals were never converted. They stay exactly as they were, just shown in the new
bottom row.

### Switching to Supabase later

All reading and writing goes through **one file: `src/storage.ts`**. Every function there
is `async` and returns plain data (`getDailies()`, `addTodo(…)`, `ideaToTodo(id, date)`,
`setDailyChecked(today, id, checked)`, `getPhotos()`, `addPhoto(…)`, …). To move to Supabase,
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
├─ App.tsx                Page layout: background, header, sections rows, lazy settings
├─ index.css              Tailwind + light/dark color tokens + background animations
├─ storage.ts             ★ The only file that reads or writes data (+ migrations)
├─ types.ts               Data shapes (Daily, Todo, Goal, Idea, Photo, …)
├─ lib/
│  ├─ dates.ts            Local-time date helpers (weeks start Sunday)
│  ├─ todos.ts            Due-date status, friendly labels, sorting, quick dates
│  ├─ useToday.ts         Today's date; re-renders at midnight and when the tab wakes
│  ├─ settings.tsx        Settings shared via React context (useSettings)
│  ├─ useTheme.ts         Applies light/dark, follows the system in "system" mode
│  ├─ useReducedMotion.ts Reads the OS "reduce motion" setting
│  ├─ backup.ts           Export download + import validation (format v3)
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
├─ components/            Reusable UI: Card, TextForm, DateField, CheckButton, IconButton,
│                         Tabs, Switch, ProgressRing, AnimatedList, StrikeText, Celebration,
│                         buttonStyles, PageBackground (the full-page background layers)
├─ sections/              One file per dashboard section, plus index.ts (the registry)
│                         and the header pieces (Header, SundayGoalChip)
├─ settings/              The settings dialog (lazy-loaded) + DoubleExposureSettings
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

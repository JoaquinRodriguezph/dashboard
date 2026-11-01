# Dashboard

My personal dashboard: a Chrome startup page and an installable Android app (PWA).

- **Dailies** (the main focus): a checklist that resets at local midnight, with a progress
  ring, optional links, up/down reordering, and a small celebration when everything's done
- **Weekly major goal:** one goal per Sunday-to-Saturday week, a Sunday reminder, a countdown, and history
- **Words of affirmation:** a new one each day, plus a "show another" button
- **Goals:** short-term and life goals in two tabs, with an option to hide completed ones
- **Double exposure banner:** your own photos combined like analog film exposed twice
  (pure pixel math, no AI), shown behind the greeting
- Greeting with your name, light/dark/system theme, JSON backup export and import
- Works offline. Data stays on your device (`localStorage` + `IndexedDB`).

Built with Vite, React, TypeScript, Tailwind CSS v4, React Three Fiber, and React Spring.

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
Laptop (≥ 1024px): three columns, up to 1600px wide
┌──────────────── greeting + date (photo banner behind it, if you added photos) ────────────────┐
├──────────────┬─────────────────────────────────────────────┬──────────────────────────────────┤
│ Affirmation  │  DAILIES  (widest, featured, progress ring) │ Goals                            │
│ Weekly goal  │                                             │                                  │
└──────────────┴─────────────────────────────────────────────┴──────────────────────────────────┘

Phone / tablet: one column → greeting → Dailies → Weekly goal → Goals → Affirmation
```

- On Sundays without a weekly goal, a small **"Set this week's goal"** chip appears under the
  greeting. Tapping it scrolls to the weekly goal card and focuses its input. It's small on
  purpose, so it never pushes Dailies down.
- **How one set of cards makes both layouts** (`App.tsx` → `Sections`): every section is
  rendered once, inside a column wrapper. On laptops the wrappers are flex columns in a
  3-column grid. On phones the wrappers get `display: contents` (the wrapper box disappears,
  so its cards join one single list) and CSS `order` sorts the cards by `mobileOrder`.
- **Feedback and motion:** cards lift on hover. Buttons, rows and tabs have hover, pressed
  (for touch) and keyboard-focus states, all defined in `components/buttonStyles.ts` and
  `Card.tsx`. List rows animate in and out and slide when reordered (`components/AnimatedList.tsx`).
  With the OS "reduce motion" setting on, all of this is switched off.

---

## Double exposure

Upload a few of your own photos in **Settings → Double exposure** and the app layers them
like a roll of film that was exposed twice. It's done entirely on your device with canvas
pixel math: no AI, and nothing is uploaded anywhere.

- **Re-roll** (the dice on the banner, or the button in settings) picks a new random seed:
  the same photos, arranged differently.
- **Sliders:** exposure, grain, light leak, vignette, misalignment, frame overlap.
- **Download JPEG** saves the full 1800×1200 frame.
- **Show banner** turns the whole feature on or off.

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
3. **Before developing**, still in linear light: a **vignette** multiplies the light down
   towards the corners, and a warm orange **light leak** (a soft Gaussian glow from just
   outside a random edge) is *added*.
4. **Developing.** A film "shoulder" curve, `1 − exp(−light)`, rolls off bright highlights
   smoothly instead of clipping them. Then the result is converted back to sRGB.
5. **Chromatic fringing.** Red is sampled 2px to the right and blue 2px to the left, giving
   the subtle colour edges of a cheap lens.
6. **Grain.** One random value per pixel (the same for R, G and B, so the grain is
   monochrome), scaled by `v × (1 − v)`. That's zero in pure black and white and strongest
   in the midtones, like real film grain.

**Performance:**
- The pixel work runs in a **Web Worker** (`exposure.worker.ts`), a separate thread, so the
  page never freezes. In Chrome the worker also draws the photos and encodes the JPEG on an
  `OffscreenCanvas`. Other browsers fall back to drawing on the page.
- One image takes about 0.6 s.
- The result is **cached**. On startup the app just shows the cached JPEG; it only
  regenerates after a re-roll, a photo change or a slider change (debounced while you drag).
  The worker isn't even downloaded until it's needed.

---

## Where my data lives

| What | Where | Why |
|---|---|---|
| Settings, dailies, goals, affirmations, weekly goals | `localStorage` (keys `dash.v1.*`) | Small text data |
| Your photos (downscaled to ≤1600px JPEG, ~100–300 KB each) and the cached double exposure | `IndexedDB` (database `dashboard`) | Binary images are too big for localStorage (~5 MB limit) |

Both are **per browser, per device**:

- Your laptop and phone each have their own copy, and `localhost` (dev) is separate from
  the deployed site.
- Clearing site data in the browser deletes it. **Use Settings → Export data now and then**
  to download a backup. Use **Import data** to restore it or move it to another device.

**The PWA and your photos:** the service worker only caches the app's own files (HTML, JS,
CSS, icons, including the worker script so generating works offline). Photos never go
through it: they're read from IndexedDB and shown via `blob:` URLs.

### Backups and photos

- **"Include photos"** (on by default) puts your photos into the backup file as base64
  text. That makes the backup complete, so one file moves everything to a new phone.
  The downside is size: photos grow by about a third as text, so 10 photos make roughly a
  3–5 MB file. Untick it for a small backup with just your lists.
- **Import is safe:** the whole file is validated *before* anything is written, including
  decoding every photo. A wrong or broken file shows an error and changes nothing.
  A valid one asks for confirmation first and says what happens to your photos:
  - backup **with** photos → they replace your current photos
  - backup **without** photos (or an old backup from before this feature) → your current
    photos are kept
- The generated image isn't included in backups; it's re-created from the seed.

### Data migrations

When the shape of saved data changes, `initStorage()` in `src/storage.ts` upgrades old data
automatically, once, before the app shows anything. It reads `dash.schemaVersion` and runs
each numbered step in `MIGRATIONS` that hasn't run yet. (Example: step 2 added the
`doubleExposure` settings with their defaults.)

### Switching to Supabase later

All reading and writing goes through **one file: `src/storage.ts`**. Every function there
is `async` and returns plain data (`getDailies()`, `addGoal(list, text)`,
`setDailyChecked(today, id, checked)`, `getPhotos()`, `addPhoto(…)`, …). To move to Supabase,
rewrite the insides of those functions, using tables for the lists and **Supabase Storage**
for the photos, and keep the same names and return types. No component needs to change.
(`lib/idb.ts` is a helper used only by storage.ts.)

(One exception: `dash.themeCache` stays in localStorage on purpose. It lets the tiny script
in `index.html` apply dark mode *before* the app loads, so the page never flashes white.)

---

## Project structure

```
src/
├─ main.tsx               Entry point: mounts React, sets reduced-motion for animations
├─ App.tsx                Page layout: header, 3-column sections grid, lazy 3D + settings
├─ index.css              Tailwind + light/dark color tokens (start a redesign here)
├─ storage.ts             ★ The only file that reads or writes data (+ migrations)
├─ types.ts               Data shapes (Daily, WeeklyGoal, Goal, Photo, …)
├─ lib/
│  ├─ dates.ts            Local-time date helpers (weeks start Sunday)
│  ├─ useToday.ts         Today's date; re-renders at midnight and when the tab wakes
│  ├─ settings.tsx        Settings shared via React context (useSettings)
│  ├─ useTheme.ts         Applies light/dark, follows the system in "system" mode
│  ├─ useReducedMotion.ts Reads the OS "reduce motion" setting
│  ├─ backup.ts           Export download + import validation (format v2, optional photos)
│  ├─ idb.ts              Tiny IndexedDB helper, used only by storage.ts
│  ├─ resizeImage.ts      Downscales uploads to ≤1600px JPEG
│  ├─ url.ts              Cleans up links (adds https://, blocks non-web links)
│  └─ exposure/           ★ Double exposure
│     ├─ render.ts        The film algorithm (pure functions)
│     ├─ exposure.worker.ts  Runs render.ts off the main thread
│     ├─ client.ts        renderDoubleExposure(): talks to the worker
│     ├─ ExposureContext.tsx Photos + cached image + when to regenerate
│     └─ random.ts        Seeded random numbers (reproducible results)
├─ components/            Reusable UI: Card, TextForm, CheckButton, IconButton, Tabs,
│                         ProgressRing, AnimatedList, StrikeText, Celebration, buttonStyles
├─ sections/              One file per dashboard section, plus index.ts (the registry)
│                         and the header pieces (Header, ExposureBanner, SundayGoalChip)
├─ settings/              The settings dialog (lazy-loaded) + DoubleExposureSettings
└─ three/Background3D.tsx ★ The only 3D code (lazy-loaded)
```

### How a few things work

- **Midnight reset:** checks are saved together with the date they were made. If that date
  isn't today, nothing counts as checked. `useToday()` sets a timer for midnight and
  re-checks whenever the tab becomes visible again (phones freeze background timers), so
  this works even if the page stays open overnight.
- **3D performance:** `Background3D` is loaded with `React.lazy` only after the page has
  painted and the browser is idle. It uses `frameloop="demand"`, so nothing is drawn unless
  something moves: the shapes glide for 6 s, then render **zero** frames for 10 s. With
  "reduce motion" on, it draws one still frame and stops.
- **Offline:** `vite-plugin-pwa` generates a service worker that precaches every built
  file, including the ~0.9 MB three.js chunk (the cache limit is raised to 5 MB in
  `vite.config.ts` for this).

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
     { id: 'my-section', component: MySection, column: 'right', mobileOrder: 5 },
   ]
   ```

   - `column`: `'left'`, `'center'` or `'right'` on laptops. Sections in the same column
     stack in the order they're listed.
   - `mobileOrder`: position in the single phone column (lower = higher up).

3. **If it stores data:**
   - Add its type to `src/types.ts` and a field for it to `AllData`.
   - Add a key and `get…`/`add…`/`update…`/`delete…` functions to `src/storage.ts`,
     and include it in `exportAll()` and `importAll()`.
   - Add validation for it in `validateData()` in `src/lib/backup.ts`. (Make it optional
     there so older backup files still import.)
   - If you change the shape of data that's already saved, add a step to `MIGRATIONS` in
     `src/storage.ts` and bump `CURRENT_SCHEMA`.

4. For lists, use `<AnimatedList>` to get the add/remove/reorder animations for free.

---

## Changing the look

- **Colors:** edit the CSS variables in `src/index.css` (`:root` for light, `.dark` for dark).
  Components use names like `bg-surface` and `text-muted`, never raw colors.
- **Buttons and cards:** hover, pressed and focus styles live in `components/buttonStyles.ts`
  and `components/Card.tsx`.
- **Film look:** tune the defaults in `DEFAULT_DOUBLE_EXPOSURE` (`src/storage.ts`) or the
  maths in `src/lib/exposure/render.ts`. Bump `ALGORITHM_VERSION` there so cached images
  regenerate.
- **3D:** replace `src/three/Background3D.tsx`. It just needs a default export that accepts
  `{ dark, reducedMotion }`.
- **App icon:** replace `public/favicon.svg` and run `npm run generate-icons`.

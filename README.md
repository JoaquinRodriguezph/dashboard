# Dashboard

My personal dashboard: a Chrome startup page and an installable Android app (PWA).

- **Dailies:** a checklist that resets at local midnight, with optional links and up/down reordering
- **Weekly major goal:** one goal per Sunday-to-Saturday week, a Sunday prompt, a countdown, and history
- **Words of affirmation:** a new one each day, plus a "show another" button
- **Goals:** short-term and life goals in two tabs, with an option to hide completed ones
- Greeting with your name, light/dark/system theme, JSON backup export and import
- Works offline. Data is stored in the browser (`localStorage`).

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

## Where my data lives

Everything is saved in the browser's `localStorage`, which means:

- Data is **per browser, per device**. Your laptop and phone each have their own copy,
  and `localhost` (dev) is separate from the deployed site.
- Clearing site data in the browser deletes it. **Use Settings → Export data now and then**
  to download a backup. Use **Import data** to restore it or move it to another device.
- Import is safe: the file is fully validated *before* anything is written. A wrong or
  broken file shows an error and changes nothing, and a valid one asks for confirmation first.

### Switching to Supabase later

All reading and writing goes through **one file: `src/storage.ts`**. Every function there
is `async` and returns plain data (`getDailies()`, `addGoal(list, text)`,
`setDailyChecked(today, id, checked)`, …). To move to Supabase, rewrite the insides of
those functions to call Supabase instead of `localStorage`, keeping the same names and
return types. No component needs to change.

(One exception: `dash.themeCache` stays in localStorage on purpose. It lets the tiny script
in `index.html` apply dark mode *before* the app loads, so the page never flashes white.)

---

## Project structure

```
src/
├─ main.tsx               Entry point: mounts React, sets reduced-motion for animations
├─ App.tsx                Page layout: header, sections grid, lazy 3D background
├─ index.css              Tailwind + light/dark color tokens (start a redesign here)
├─ storage.ts             ★ The only file that reads or writes data
├─ types.ts               Data shapes (Daily, WeeklyGoal, Goal, …)
├─ lib/
│  ├─ dates.ts            Local-time date helpers (weeks start Sunday)
│  ├─ useToday.ts         Today's date; re-renders at midnight and when the tab wakes
│  ├─ settings.tsx        Settings shared via React context (useSettings)
│  ├─ useTheme.ts         Applies light/dark, follows the system in "system" mode
│  ├─ useReducedMotion.ts Reads the OS "reduce motion" setting
│  ├─ backup.ts           Export download + import validation
│  └─ url.ts              Cleans up links (adds https://, blocks non-web links)
├─ components/            Reusable UI: Card, TextForm, CheckButton, IconButton, Tabs
├─ sections/              One file per dashboard section, plus index.ts (the registry)
├─ settings/              The settings dialog
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
     { id: 'my-section', component: MySection, width: 'half' }, // or 'full'
   ]
   ```

3. **If it stores data:**
   - Add its type to `src/types.ts` and a field for it to `AllData`.
   - Add a key and `get…`/`add…`/`update…`/`delete…` functions to `src/storage.ts`,
     and include it in `exportAll()` and `importAll()`.
   - Add validation for it in `validateData()` in `src/lib/backup.ts`. (Make it optional
     there so older backup files still import.)

---

## Changing the look

- **Colors:** edit the CSS variables in `src/index.css` (`:root` for light, `.dark` for dark).
  Components use names like `bg-surface` and `text-muted`, never raw colors.
- **3D:** replace `src/three/Background3D.tsx`. It just needs a default export that accepts
  `{ dark, reducedMotion }`.
- **App icon:** replace `public/favicon.svg` and run `npm run generate-icons`.

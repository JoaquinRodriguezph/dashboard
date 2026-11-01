import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Pages the site lives at https://<user>.github.io/<repo>/, so every
// asset URL needs the "/<repo>/" prefix. GitHub Actions sets GITHUB_REPOSITORY
// to "owner/repo", so we derive the base path from it. Locally it's just "/".
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo ? `/${repo}/` : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})

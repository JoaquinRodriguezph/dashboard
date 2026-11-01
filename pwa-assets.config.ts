import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates all PWA icons from public/favicon.svg. Run: npm run generate-icons
// The output PNGs are committed, so this only needs re-running when the logo changes.
const brand = '#0f766e'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Android crops "maskable" icons into circles/squircles, so give it padding
    // and a solid background in the brand color.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: brand } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: brand } },
  },
  images: ['public/favicon.svg'],
})

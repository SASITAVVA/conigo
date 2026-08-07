# CogniPath Enterprise Typography & Fonts Directory

This directory is reserved for hosting custom locally hosted font files (`.woff`, `.woff2`, `.ttf`) as well as configuration manifests for high-performance typography loading.

## Active Project Typography Hierarchy
The CogniPath AI Platform currently utilizes modern premium sans-serif Google Fonts loaded asynchronously in `index.html`:
- **Primary Interface Font**: `Inter` (Weights: 400, 500, 600, 700)
- **Display & Headings**: `Outfit` (Weights: 600, 700, 800)
- **Monospace Code & Telemetry Logs**: `Fira Code` / `JetBrains Mono`

To override CDN delivery with offline bundled fonts, drop `.woff2` files into this directory and reference them in `/client/css/style.css` under standard `@font-face` definitions.

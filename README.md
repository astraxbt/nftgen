# NFTGen — Animated APNG Studio

A browser-based studio for generating layered **animated NFTs (APNG)** from
trait spritesheets. Upload your art, pick a count, hit generate — everything
runs client-side, so it deploys to **Vercel** with no backend.

## How it works

1. Drop your **Base** character spritesheet (single PNG).
2. Drop each trait **folder** into its box — Auras, Helmets, Armors, Weapons.
   Each folder should contain one subfolder per trait with a `.png` spritesheet:
   ```
   Auras/
     Hellfire/ hellfire.png
     Storm/    storm.png
   ```
3. Choose **random** (weighted) or **all combinations**, set the count, frame
   speed (default 100 ms/frame), and optionally a "leave empty %" per layer.
4. **Generate** — animated APNGs render live on the dashboard. Download one, or
   grab everything (images + metadata JSON) as a ZIP.

### Layer order (back → front)

```
Aura → Base → Helmet → Armor → Weapon
```

The aura is drawn first (behind everything); the weapon is drawn last (on top).

## Spritesheets

Each spritesheet is a horizontal strip (or grid) of equal-size frames. Frame
size is auto-detected assuming **square frames** — all layers are composited
frame-by-frame and centered, so mismatched sizes still line up. Layers with
different frame counts sync to the longest one (shorter loop).

Frames are encoded losslessly (full RGBA) into an APNG via
[`upng-js`](https://github.com/photopea/UPNG.js).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Deploy to Vercel

Push this repo to GitHub and import it in Vercel — it's a stock Next.js app,
no environment variables or build config needed. The default framework preset
(“Next.js”) just works.

## Tech

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `upng-js` for APNG encoding, `jszip` for the download-all bundle
- 100% client-side generation (Canvas API) — no server, no upload limits

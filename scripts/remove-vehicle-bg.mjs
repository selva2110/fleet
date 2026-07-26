import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '..', 'public', 'vehicles')

// Chroma-key removal: the vehicles are rendered on a solid green screen, so any
// pixel where green clearly dominates red and blue becomes transparent. A soft
// band gives partial alpha for anti-aliased edges, and green-spill suppression
// removes the green fringe left on the vehicle silhouette.
function processFile(file) {
  const png = PNG.sync.read(readFileSync(join(dir, file)))
  const { width, height, data } = png

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // How much green dominates the other channels.
    const dominance = g - Math.max(r, b)

    if (g > 80 && dominance > 60) {
      // Solid background -> fully transparent.
      data[i + 3] = 0
    } else if (g > 70 && dominance > 20) {
      // Anti-aliased edge -> partial alpha, scaled by how green it is.
      const t = (dominance - 20) / 40 // 0..1 across the soft band
      data[i + 3] = Math.round(255 * (1 - Math.max(0, Math.min(1, t))))
      // Suppress green spill so the edge doesn't glow green.
      const cap = Math.max(r, b)
      if (g > cap) data[i + 1] = cap
    } else if (g > Math.max(r, b) + 10) {
      // Kept pixel with mild green tint -> desaturate the green fringe.
      data[i + 1] = Math.round((Math.max(r, b) + g) / 2)
    }
  }

  writeFileSync(join(dir, file), PNG.sync.write(png))
  return `${file} (${width}x${height})`
}

const files = readdirSync(dir).filter((f) => f.endsWith('.png'))
for (const f of files) {
  console.log('[v0] processed', processFile(f))
}

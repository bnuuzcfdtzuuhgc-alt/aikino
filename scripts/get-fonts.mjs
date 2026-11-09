// Скачивает шрифты (лицензия OFL) в папку fonts/. Запуск: node scripts/get-fonts.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const FONTS = ['unbounded', 'onest', 'jetbrains-mono'];
const STATIC = ['bebas-neue']; // узкий шрифт для главного экрана (одно начертание 400)
const SUBSETS = ['cyrillic', 'latin'];
const out = new URL('../fonts/', import.meta.url);
await mkdir(out, { recursive: true });

for (const font of FONTS) {
  for (const subset of SUBSETS) {
    const name = `${font}-${subset}-wght-normal.woff2`;
    const url = `https://cdn.jsdelivr.net/fontsource/fonts/${font}:vf@latest/${subset}-wght-normal.woff2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    await writeFile(new URL(name, out), Buffer.from(await res.arrayBuffer()));
    console.log('ok', name);
  }
}

for (const font of STATIC) {
  for (const subset of SUBSETS) {
    const name = `${font}-${subset}-400-normal.woff2`;
    const res = await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/${font}@latest/${subset}-400-normal.woff2`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    await writeFile(new URL(name, out), Buffer.from(await res.arrayBuffer()));
    console.log('ok', name);
  }
}

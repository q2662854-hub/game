/**
 * Bundles the game into ONE self-contained HTML file:
 *   billiard-3d.html
 *
 * Everything (three.js, styles, UI markup, the Vazirmatn font as base64 WOFF2)
 * is inlined so the file works offline, straight from the filesystem.
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'billiard-3d.html');
const FONT_DIR = path.join(ROOT, 'node_modules', '@fontsource', 'vazirmatn', 'files');

const FONT_WEIGHTS = [400, 600, 700, 900];

async function fontFaces() {
  let css = '';
  for (const w of FONT_WEIGHTS) {
    const arabic = await readFile(path.join(FONT_DIR, `vazirmatn-arabic-${w}-normal.woff2`));
    css += `@font-face{font-family:'Vazirmatn';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${arabic.toString('base64')}) format('woff2');}\n`;

    const latin = await readFile(path.join(FONT_DIR, `vazirmatn-latin-${w}-normal.woff2`));
    css += `@font-face{font-family:'Vazirmatn Latin';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${latin.toString('base64')}) format('woff2');}\n`;
  }
  return css;
}

const htmlPlugin = {
  name: 'inline-html-template',
  setup(b) {
    b.onLoad({ filter: /\.html\?raw$/ }, async (args) => {
      const p = args.path.replace(/\?raw$/, '');
      const text = await readFile(p, 'utf8');
      return { contents: `export default ${JSON.stringify(text)};`, loader: 'js' };
    });
  }
};

async function main() {
  const t0 = Date.now();

  const result = await build({
    entryPoints: [path.join(ROOT, 'src/pool/entry.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    write: false,
    outdir: path.join(ROOT, 'dist'),
    plugins: [htmlPlugin],
    loader: { '.html': 'text' },
    logLevel: 'info'
  });

  const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text;
  let css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';

  // The CSS bundle may reference the npm font package by URL — drop those
  // rules; the exact weights we use are inlined below instead.
  css = css.replace(/@font-face\{[^}]*vazirmatn[^}]*\}/gi, '');
  css = css.replace(/src:url\([^)]*vazirmatn[^)]*\)[^;}]*;?/gi, '');

  const fonts = await fontFaces();

  // The UI already inserts its own markup at runtime, so the shell is tiny.
  const shell = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#03070a">
<meta name="description" content="میز اشرافی — بازی بیلیارد سه‌بعدی ۸ توپ با گرافیک لوکس">
<title>میز اشرافی · بیلیارد سه‌بعدی</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3CradialGradient id='g' cx='35%25' cy='30%25'%3E%3Cstop offset='0' stop-color='%23fff3d6'/%3E%3Cstop offset='.5' stop-color='%23d9b26a'/%3E%3Cstop offset='1' stop-color='%233d2a0c'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='44' fill='url(%23g)'/%3E%3Ctext x='50' y='68' font-family='Arial' font-size='52' font-weight='bold' text-anchor='middle' fill='%23120d05'%3E8%3C/text%3E%3C/svg%3E">
<style>__FONTS__</style>
<style>__CSS__</style>
</head>
<body>
<div id="root"></div>
<script>__JS__</script>
</body>
</html>
`;

  const html = shell
    .replace('__FONTS__', fonts)
    .replace('__CSS__', css)
    .replace('__JS__', () => js);

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, html, 'utf8');

  // esbuild needs an outdir to emit CSS; drop the intermediate files so the
  // single HTML file is the only build artefact.
  for (const f of ['entry.js', 'entry.css']) {
    await rm(path.join(ROOT, 'dist', f), { force: true });
  }
  await rm(path.join(ROOT, 'dist'), { recursive: true, force: true });

  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`\n  ✔ billiard-3d.html  (${kb} KB, built in ${Date.now() - t0}ms)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

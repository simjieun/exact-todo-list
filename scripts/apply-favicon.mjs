import { copyFile, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
await copyFile(new URL('assets/favicon.svg', root), new URL('dist/favicon.svg', root));
for (const name of ['index.html', 'shell.html']) {
  const file = new URL(`dist/${name}`, root);
  let html = await readFile(file, 'utf8');
  const icon = '<link rel="icon" type="image/svg+xml" sizes="any" href="./favicon.svg?v=2">';
  await writeFile(file, /<link\b[^>]*rel="icon"[^>]*>/i.test(html)
    ? html.replace(/<link\b[^>]*rel="icon"[^>]*>/gi, icon)
    : html.replace('</head>', `${icon}\n</head>`));
}
console.log('Calendar-check favicon applied.');

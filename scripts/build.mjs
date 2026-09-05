import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
// Publish an explicit public-file list. Credentials, functions and repository files stay outside dist.
const publicFiles = ['index.html', 'request-a-call.html', 'privacy.html', 'terms.html', '404.html', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'favicon.png', 'assets'];
for (const name of publicFiles) await stat(path.join(root, name));
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const name of publicFiles) await cp(path.join(root, name), path.join(output, name), { recursive: true });

for (const name of ['index.html', 'request-a-call.html', 'privacy.html', 'terms.html', '404.html']) {
  const html = await readFile(path.join(output, name), 'utf8');
  if (/data:image\//.test(html)) throw new Error(`Embedded image in ${name}`);
  if (/\$\s*\d|cancel\s+any\s*time/i.test(html)) throw new Error(`Disallowed public marketing copy in ${name}`);
  for (const [, reference] of html.matchAll(/(?:src|href)="(\/(?!\/)[^"?#]*)(?:[?#][^"]*)?"/g)) {
    if (reference !== '/') await stat(path.join(output, reference.slice(1)));
  }
}
const files = await readdir(output);
console.log(`Built ${files.length} public entries in dist. No service prices or embedded images.`);

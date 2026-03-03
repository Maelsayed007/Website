import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'apps/customer-site/src');
const BAD_PATTERN = 'myasserofficial@gmail.com';
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const files = await walk(TARGET_DIR);
  const matches = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    if (content.includes(BAD_PATTERN)) {
      matches.push(path.relative(ROOT, file));
    }
  }

  if (matches.length > 0) {
    console.error('[check-hardcoded-admin-email] Hardcoded admin email was found:');
    for (const file of matches) {
      console.error(`  ${file}`);
    }
    process.exit(1);
  }

  console.log('[check-hardcoded-admin-email] No hardcoded admin email found.');
}

main().catch((error) => {
  console.error('[check-hardcoded-admin-email] Unexpected error:', error);
  process.exit(1);
});

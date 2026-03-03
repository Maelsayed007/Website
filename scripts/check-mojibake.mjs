import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = [
  'apps/customer-site/src/dictionaries/footer',
  'apps/customer-site/src/dictionaries/navigation',
];
const PATTERNS = [
  /Ã./g,
  /Â./g,
  /â./g,
  /�/g,
];

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function countHits(content) {
  return PATTERNS.reduce((sum, pattern) => sum + (content.match(pattern)?.length ?? 0), 0);
}

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    files.push(...(await walk(path.join(ROOT, dir))));
  }

  const failures = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const hitCount = countHits(text);
    if (hitCount > 0) {
      failures.push({ file: path.relative(ROOT, file), hitCount });
    }
  }

  if (failures.length > 0) {
    console.error('[check-mojibake] Corrupted UTF-8 patterns detected:');
    for (const row of failures) {
      console.error(`  ${row.file}: ${row.hitCount}`);
    }
    process.exit(1);
  }

  console.log('[check-mojibake] No mojibake patterns found.');
}

main().catch((error) => {
  console.error('[check-mojibake] Unexpected error:', error);
  process.exit(1);
});

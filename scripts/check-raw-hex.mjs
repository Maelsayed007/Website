import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = [
  'apps/customer-site/src/app',
  'apps/customer-site/src/components',
];
const ALLOWED = new Set([
  '#18230F',
  '#34C759',
  '#F1F8F1',
  '#FFFFFF',
  '#ffffff',
  '#000000',
  '#000',
  '#fff',
  '#4285F4',
  '#34A853',
  '#FBBC05',
  '#EA4335',
]);
const EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const HEX_PATTERN = /#(?:[0-9a-fA-F]{3,8})\b/g;
const BASELINE_PATH = path.join(ROOT, '.scan-baseline.json');

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

function normalizeHex(value) {
  return value.length === 4 || value.length === 7 ? value.toUpperCase() : value;
}

async function readBaseline() {
  try {
    const raw = await readFile(BASELINE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.rawHexDisallowedMax === 'number') {
      return parsed.rawHexDisallowedMax;
    }
  } catch {
    // Ignore missing baseline file.
  }
  return null;
}

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    const abs = path.join(ROOT, dir);
    const walked = await walk(abs);
    files.push(...walked);
  }

  let disallowedCount = 0;
  const perFile = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const matches = content.match(HEX_PATTERN) ?? [];
    const disallowed = matches.filter((hex) => !ALLOWED.has(normalizeHex(hex)));
    if (disallowed.length > 0) {
      disallowedCount += disallowed.length;
      perFile.push({
        file: path.relative(ROOT, file),
        count: disallowed.length,
      });
    }
  }

  const baseline = await readBaseline();
  console.log(`[check-raw-hex] Disallowed hex count: ${disallowedCount}`);
  if (perFile.length > 0) {
    const top = perFile.sort((a, b) => b.count - a.count).slice(0, 20);
    for (const row of top) {
      console.log(`  ${row.file}: ${row.count}`);
    }
  }

  if (baseline == null) {
    console.log('[check-raw-hex] No baseline configured. Add rawHexDisallowedMax to .scan-baseline.json to enforce.');
    return;
  }

  if (disallowedCount > baseline) {
    console.error(
      `[check-raw-hex] Failed: ${disallowedCount} > baseline ${baseline}.`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[check-raw-hex] Unexpected error:', error);
  process.exit(1);
});

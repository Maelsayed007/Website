import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GAS_DIR = path.join(ROOT, 'gas-scripts');
const FILES = new Set(['.html', '.gs', '.js']);

const RULES = [
  { pattern: /<\s!\s--/g, label: 'Malformed HTML comment opener' },
  { pattern: /\$\s+\{/g, label: 'Malformed template interpolation' },
];

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (FILES.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const files = await walk(GAS_DIR);
  const issues = [];

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const rule of RULES) {
      const count = text.match(rule.pattern)?.length ?? 0;
      if (count > 0) {
        issues.push({
          file: path.relative(ROOT, file),
          rule: rule.label,
          count,
        });
      }
    }
  }

  if (issues.length > 0) {
    console.error('[check-gas-syntax] Syntax guard failures:');
    for (const issue of issues) {
      console.error(`  ${issue.file}: ${issue.rule} (${issue.count})`);
    }
    process.exit(1);
  }

  console.log('[check-gas-syntax] No malformed comment/interpolation patterns found.');
}

main().catch((error) => {
  console.error('[check-gas-syntax] Unexpected error:', error);
  process.exit(1);
});

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GAS_DIR = path.join(ROOT, 'gas-scripts');
const JS_LIKE = new Set(['.html', '.js']);

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (JS_LIKE.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function extractScriptBlocks(filePath, text) {
  if (path.extname(filePath) === '.js') {
    return [text];
  }

  const blocks = [];
  const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(text)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function sanitizeForParse(code) {
  return code
    .replace(/<\?!=[\s\S]*?\?>/g, '""')
    .replace(/<\?[\s\S]*?\?>/g, '');
}

async function main() {
  const files = await walk(GAS_DIR);
  const issues = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const blocks = extractScriptBlocks(file, raw);
    for (let index = 0; index < blocks.length; index += 1) {
      const source = sanitizeForParse(blocks[index]).trim();
      if (!source) continue;
      try {
        // Parse-only smoke check.
        // eslint-disable-next-line no-new-func
        new Function(`(function(){\n${source}\n});`);
      } catch (error) {
        issues.push({
          file: path.relative(ROOT, file),
          block: index + 1,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (issues.length > 0) {
    console.error('[check-gas-parse] Parse errors detected:');
    for (const issue of issues) {
      console.error(`  ${issue.file} (block ${issue.block}): ${issue.message}`);
    }
    process.exit(1);
  }

  console.log('[check-gas-parse] All extracted JS blocks parsed successfully.');
}

main().catch((error) => {
  console.error('[check-gas-parse] Unexpected error:', error);
  process.exit(1);
});

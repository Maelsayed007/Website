import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const NAV_DIR = path.join(ROOT, 'apps/customer-site/src/dictionaries/navigation');
const FOOTER_DIR = path.join(ROOT, 'apps/customer-site/src/dictionaries/footer');
const MOJIBAKE_PATTERN = /Ã.|Â.|â.|�/;

const REQUIRED_NAV_KEYS = [
  'links.home',
  'links.houseboats',
  'links.riverCruise',
  'links.restaurant',
  'links.contact',
  'links.services',
  'auth.login',
  'auth.register',
  'auth.logout',
  'auth.dashboard',
  'auth.myBookings',
];

const REQUIRED_FOOTER_KEYS = [
  'tagline',
  'explore.title',
  'explore.home',
  'explore.houseboats',
  'explore.restaurant',
  'explore.contact',
  'legal.title',
  'legal.privacy',
  'legal.terms',
  'connect.title',
  'rightsReserved',
];

function getByPath(obj, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

async function readJsonDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));
  const output = new Map();
  for (const file of files) {
    const locale = path.basename(file.name, '.json');
    const raw = await readFile(path.join(dir, file.name), 'utf8');
    output.set(locale, JSON.parse(raw));
  }
  return output;
}

function validate(locale, data, requiredKeys, label, issues) {
  for (const key of requiredKeys) {
    const value = getByPath(data, key);
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push(`${label}/${locale}.json missing key: ${key}`);
      continue;
    }
    if (MOJIBAKE_PATTERN.test(value)) {
      issues.push(`${label}/${locale}.json mojibake value at key: ${key}`);
    }
  }
}

async function main() {
  const navByLocale = await readJsonDir(NAV_DIR);
  const footerByLocale = await readJsonDir(FOOTER_DIR);
  const issues = [];

  for (const [locale, nav] of navByLocale.entries()) {
    validate(locale, nav, REQUIRED_NAV_KEYS, 'navigation', issues);
  }
  for (const [locale, footer] of footerByLocale.entries()) {
    validate(locale, footer, REQUIRED_FOOTER_KEYS, 'footer', issues);
  }

  if (issues.length > 0) {
    console.error('[check-dictionaries] Validation failed:');
    for (const issue of issues) {
      console.error(`  ${issue}`);
    }
    process.exit(1);
  }

  console.log('[check-dictionaries] Navigation and footer dictionaries are valid.');
}

main().catch((error) => {
  console.error('[check-dictionaries] Unexpected error:', error);
  process.exit(1);
});

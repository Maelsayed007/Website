import { access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const REQUIRED_ROUTES = ['/privacy', '/terms'];

async function routeExists(route) {
  const routePath = route === '/' ? '' : route.replace(/^\/+/, '');
  const pagePath = path.join(
    ROOT,
    'apps/customer-site/src/app',
    routePath,
    'page.tsx'
  );
  try {
    await access(pagePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const missing = [];
  for (const route of REQUIRED_ROUTES) {
    const exists = await routeExists(route);
    if (!exists) {
      missing.push(route);
    }
  }

  if (missing.length > 0) {
    console.error('[check-routes] Missing required routes:');
    for (const route of missing) {
      console.error(`  ${route}`);
    }
    process.exit(1);
  }

  console.log('[check-routes] Required routes exist.');
}

main().catch((error) => {
  console.error('[check-routes] Unexpected error:', error);
  process.exit(1);
});

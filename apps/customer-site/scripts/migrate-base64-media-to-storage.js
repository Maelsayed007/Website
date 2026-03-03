/* eslint-disable no-console */
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_MEDIA_BUCKET || 'site-media';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const dataUrlRegex = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

const tableConfigs = [
  { table: 'houseboat_models', idColumn: 'id', fields: [{ name: 'image_urls', kind: 'array' }] },
  { table: 'site_gallery', idColumn: 'id', fields: [{ name: 'image_url', kind: 'string' }] },
  { table: 'daily_travel_packages', idColumn: 'id', fields: [{ name: 'photo_url', kind: 'string' }] },
  { table: 'special_offers', idColumn: 'id', fields: [{ name: 'image_url', kind: 'string' }] },
  { table: 'restaurant_photos', idColumn: 'id', fields: [{ name: 'image_url', kind: 'string' }] },
];

function isDataUrl(value) {
  return typeof value === 'string' && dataUrlRegex.test(value);
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(dataUrlRegex);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  const extByMime = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  const ext = extByMime[mime] || 'bin';
  return { mime, buffer, ext };
}

async function ensureBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets || []).some((bucket) => bucket.name === bucketName);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: '15728640',
  });
  if (createError && !/already exists/i.test(createError.message || '')) {
    throw createError;
  }
}

const uploadedUrlByHash = new Map();

async function uploadDataUrl(dataUrl, objectPathBase) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;

  const hash = crypto.createHash('sha256').update(parsed.buffer).digest('hex');
  const cacheKey = `${parsed.mime}:${hash}`;
  const cached = uploadedUrlByHash.get(cacheKey);
  if (cached) return cached;

  const objectPath = `${objectPathBase}-${hash.slice(0, 16)}.${parsed.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(objectPath, parsed.buffer, {
      contentType: parsed.mime,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError && !/already exists/i.test(uploadError.message || '')) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
  const url = data?.publicUrl;
  if (!url) throw new Error(`Failed to create public URL for ${objectPath}`);

  uploadedUrlByHash.set(cacheKey, url);
  return url;
}

async function migrateTable(config) {
  let scannedRows = 0;
  let updatedRows = 0;
  let convertedImages = 0;
  const pageSize = 100;
  const select = [config.idColumn, ...config.fields.map((f) => f.name)].join(',');

  while (true) {
    const from = scannedRows;
    const to = scannedRows + pageSize - 1;
    const { data: rows, error } = await supabase
      .from(config.table)
      .select(select)
      .range(from, to);

    if (error) {
      if (/could not find the table|column .* does not exist/i.test(error.message || '')) {
        console.log(`- Skipping ${config.table}: ${error.message}`);
        return { scannedRows, updatedRows, convertedImages };
      }
      throw new Error(`Failed querying ${config.table}: ${error.message}`);
    }

    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const patch = {};
      let rowChanged = false;

      for (const field of config.fields) {
        const value = row[field.name];

        if (field.kind === 'string' && isDataUrl(value)) {
          const nextUrl = await uploadDataUrl(
            value,
            `legacy/${config.table}/${row[config.idColumn]}/${field.name}`
          );
          patch[field.name] = nextUrl;
          rowChanged = true;
          convertedImages += 1;
        }

        if (field.kind === 'array' && Array.isArray(value)) {
          let arrayChanged = false;
          const nextArray = [];
          for (let i = 0; i < value.length; i += 1) {
            const item = value[i];
            if (isDataUrl(item)) {
              const nextUrl = await uploadDataUrl(
                item,
                `legacy/${config.table}/${row[config.idColumn]}/${field.name}/${i}`
              );
              nextArray.push(nextUrl);
              arrayChanged = true;
              convertedImages += 1;
            } else {
              nextArray.push(item);
            }
          }
          if (arrayChanged) {
            patch[field.name] = nextArray;
            rowChanged = true;
          }
        }
      }

      if (rowChanged) {
        const { error: updateError } = await supabase
          .from(config.table)
          .update(patch)
          .eq(config.idColumn, row[config.idColumn]);
        if (updateError) {
          throw new Error(`Failed updating ${config.table}.${row[config.idColumn]}: ${updateError.message}`);
        }
        updatedRows += 1;
      }
    }

    scannedRows += rows.length;
    if (rows.length < pageSize) break;
  }

  return { scannedRows, updatedRows, convertedImages };
}

async function migrateSiteSettings() {
  const { data: rows, error } = await supabase.from('site_settings').select('key,data');
  if (error) throw error;

  let scannedRows = 0;
  let updatedRows = 0;
  let convertedImages = 0;

  async function transformValue(value, objectPathBase) {
    if (typeof value === 'string') {
      if (!isDataUrl(value)) return { next: value, changed: false, converted: 0 };
      const nextUrl = await uploadDataUrl(value, objectPathBase);
      return { next: nextUrl, changed: true, converted: 1 };
    }

    if (Array.isArray(value)) {
      let changed = false;
      let converted = 0;
      const next = [];
      for (let i = 0; i < value.length; i += 1) {
        const result = await transformValue(value[i], `${objectPathBase}/${i}`);
        next.push(result.next);
        changed = changed || result.changed;
        converted += result.converted;
      }
      return { next, changed, converted };
    }

    if (value && typeof value === 'object') {
      let changed = false;
      let converted = 0;
      const next = {};
      for (const [key, entry] of Object.entries(value)) {
        const result = await transformValue(entry, `${objectPathBase}/${key}`);
        next[key] = result.next;
        changed = changed || result.changed;
        converted += result.converted;
      }
      return { next, changed, converted };
    }

    return { next: value, changed: false, converted: 0 };
  }

  for (const row of rows || []) {
    scannedRows += 1;
    const base = `legacy/site_settings/${row.key}/data`;
    const result = await transformValue(row.data, base);
    convertedImages += result.converted;
    if (!result.changed) continue;

    const { error: updateError } = await supabase
      .from('site_settings')
      .update({ data: result.next })
      .eq('key', row.key);
    if (updateError) {
      throw new Error(`Failed updating site_settings.${row.key}: ${updateError.message}`);
    }
    updatedRows += 1;
  }

  return { scannedRows, updatedRows, convertedImages };
}

async function main() {
  console.log(`Migrating base64 media to storage bucket: ${bucketName}`);
  await ensureBucket();

  const summary = [];
  for (const config of tableConfigs) {
    console.log(`\nProcessing ${config.table}...`);
    const stats = await migrateTable(config);
    summary.push({ target: config.table, ...stats });
    console.log(
      `  scanned=${stats.scannedRows} updated=${stats.updatedRows} converted=${stats.convertedImages}`
    );
  }

  console.log('\nProcessing site_settings...');
  const settingsStats = await migrateSiteSettings();
  summary.push({ target: 'site_settings.data', ...settingsStats });
  console.log(
    `  scanned=${settingsStats.scannedRows} updated=${settingsStats.updatedRows} converted=${settingsStats.convertedImages}`
  );

  const totals = summary.reduce(
    (acc, item) => {
      acc.scannedRows += item.scannedRows;
      acc.updatedRows += item.updatedRows;
      acc.convertedImages += item.convertedImages;
      return acc;
    },
    { scannedRows: 0, updatedRows: 0, convertedImages: 0 }
  );

  console.log('\nMigration complete.');
  console.log(`Rows scanned:   ${totals.scannedRows}`);
  console.log(`Rows updated:   ${totals.updatedRows}`);
  console.log(`Images moved:   ${totals.convertedImages}`);
  console.log(`Unique uploads: ${uploadedUrlByHash.size}`);
}

main().catch((error) => {
  console.error('\nMigration failed:', error);
  process.exit(1);
});

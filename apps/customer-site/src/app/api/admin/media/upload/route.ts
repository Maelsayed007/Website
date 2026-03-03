import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPermission, validateSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_BUCKET = 'site-media';
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function sanitizeFolder(input: string): string {
  const normalized = input.trim().replace(/\\/g, '/');
  const safe = normalized
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64))
    .filter(Boolean)
    .join('/');
  return safe || 'uploads';
}

function getExtension(fileName: string, contentType: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  const byMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  return byMime[contentType] || 'bin';
}

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>, bucket: string) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets || []).some((b) => b.name === bucket);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: `${MAX_FILE_SIZE_BYTES}`,
  });

  if (createError && !/already exists/i.test(createError.message || '')) {
    throw createError;
  }
}

export async function POST(request: Request) {
  try {
    const user = await validateSession();
    if (!user || !hasPermission(user, 'canEditSettings')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = sanitizeFolder(String(formData.get('folder') || 'uploads'));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Image size must be between 1 byte and ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const bucket = process.env.SUPABASE_MEDIA_BUCKET || DEFAULT_BUCKET;
    await ensureBucket(supabase, bucket);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = getExtension(file.name, file.type);
    const objectPath = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '31536000',
      });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if (!data?.publicUrl) {
      throw new Error('Could not create a public URL for uploaded file.');
    }

    return NextResponse.json({ url: data.publicUrl, path: objectPath, bucket });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload media.' },
      { status: 500 }
    );
  }
}

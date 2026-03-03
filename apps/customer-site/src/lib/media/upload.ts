export type UploadMediaOptions = {
  folder: string;
};

export async function uploadMediaFile(
  file: File,
  options: UploadMediaOptions
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', options.folder);

  const response = await fetch('/api/admin/media/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let message = 'Failed to upload media.';
    try {
      const body = await response.json();
      if (typeof body?.error === 'string' && body.error.trim()) {
        message = body.error;
      }
    } catch {
      // Ignore non-JSON response body.
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (typeof data?.url !== 'string' || !data.url) {
    throw new Error('Upload response did not include a media URL.');
  }

  return data.url;
}

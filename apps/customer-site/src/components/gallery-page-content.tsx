'use client';

// Deprecated compatibility shim.
// Gallery was removed from public flows, but some stale webpack caches may
// still try to resolve this module path.
export default function GalleryPageContent() {
  return null;
}

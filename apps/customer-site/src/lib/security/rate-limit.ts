type RateLimitBucket = {
  count: number;
  windowStart: number;
  lockedUntil: number;
};

const buckets = new Map<string, RateLimitBucket>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCK_MS = 15 * 60 * 1000;

type RateLimitOptions = {
  windowMs?: number;
  maxAttempts?: number;
  lockMs?: number;
};

function nowMs() {
  return Date.now();
}

function readBucket(key: string): RateLimitBucket {
  const existing = buckets.get(key);
  if (existing) return existing;
  const next: RateLimitBucket = { count: 0, windowStart: nowMs(), lockedUntil: 0 };
  buckets.set(key, next);
  return next;
}

export function getRateLimitState(
  key: string,
  options: RateLimitOptions = {}
): { locked: boolean; retryAfterSeconds: number } {
  const current = nowMs();
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const bucket = readBucket(key);

  if (bucket.windowStart + windowMs <= current) {
    bucket.count = 0;
    bucket.windowStart = current;
    bucket.lockedUntil = 0;
  }

  if (bucket.lockedUntil > current) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((bucket.lockedUntil - current) / 1000),
    };
  }

  return { locked: false, retryAfterSeconds: 0 };
}

export function registerRateLimitFailure(
  key: string,
  options: RateLimitOptions = {}
): { locked: boolean; retryAfterSeconds: number } {
  const current = nowMs();
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const lockMs = options.lockMs ?? DEFAULT_LOCK_MS;
  const bucket = readBucket(key);

  if (bucket.windowStart + windowMs <= current) {
    bucket.count = 0;
    bucket.windowStart = current;
    bucket.lockedUntil = 0;
  }

  bucket.count += 1;

  if (bucket.count >= maxAttempts) {
    bucket.lockedUntil = current + lockMs;
    return {
      locked: true,
      retryAfterSeconds: Math.ceil(lockMs / 1000),
    };
  }

  return { locked: false, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
